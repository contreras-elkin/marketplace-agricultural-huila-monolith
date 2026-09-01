package com.huila.marketplace.transactions.application;

import com.huila.marketplace.catalog.CatalogModuleApi;
import com.huila.marketplace.catalog.ProductStatus;
import com.huila.marketplace.catalog.ProductSummary;
import com.huila.marketplace.chat.AgreedPurchase;
import com.huila.marketplace.chat.AgreedPurchaseMethod;
import com.huila.marketplace.chat.ChatModuleApi;
import com.huila.marketplace.transactions.TransaccionConfirmada;
import com.huila.marketplace.transactions.application.PaymentGateway.CheckoutSession;
import com.huila.marketplace.transactions.application.PaymentGateway.GatewayEvent;
import com.huila.marketplace.transactions.domain.LedgerEntry;
import com.huila.marketplace.transactions.domain.Transaction;
import com.huila.marketplace.transactions.infrastructure.LedgerEntryRepository;
import com.huila.marketplace.transactions.infrastructure.TransactionRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Casos de uso de Transacciones (RF7, RF8). El acuerdo "por plataforma" se lee
 * de {@link ChatModuleApi}; precio y cantidad publicada, de {@link CatalogModuleApi}
 * — nunca contra los schemas de esos módulos. La confirmación (webhook) es una
 * sola transacción local ACID: cambia el estado, escribe el ledger y publica
 * {@link TransaccionConfirmada} juntos (architecture.md §6: sin saga, sin outbox).
 * Errores de negocio: {@link ResponseStatusException} directo (architecture.md §5).
 */
@Service
public class TransactionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionService.class);

    private final TransactionRepository transactions;
    private final LedgerEntryRepository ledger;
    private final ChatModuleApi chat;
    private final CatalogModuleApi catalog;
    private final PaymentGateway gateway;
    private final PlatformFee platformFee;
    private final ApplicationEventPublisher events;
    private final String currency;
    private final String frontendBaseUrl;

    public TransactionService(
            TransactionRepository transactions,
            LedgerEntryRepository ledger,
            ChatModuleApi chat,
            CatalogModuleApi catalog,
            PaymentGateway gateway,
            PlatformFee platformFee,
            ApplicationEventPublisher events,
            @Value("${app.transactions.currency}") String currency,
            @Value("${app.transactions.frontend-base-url}") String frontendBaseUrl) {
        this.transactions = transactions;
        this.ledger = ledger;
        this.chat = chat;
        this.catalog = catalog;
        this.gateway = gateway;
        this.platformFee = platformFee;
        this.events = events;
        this.currency = currency;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    /**
     * Inicia el cobro de una compra "por plataforma": valida el acuerdo y el
     * producto, congela precio y cantidad, crea la transacción {@code PENDING} y
     * la sesión de checkout alojada. No es {@code @Transactional} a propósito: la
     * llamada HTTP a la pasarela no debe correr con una transacción de BD abierta;
     * hay un único {@code save} al final.
     */
    public CheckoutStarted startCheckout(UUID buyerId, UUID conversationId) {
        AgreedPurchase agreed = chat.getAgreedPurchase(conversationId); // 404 se propaga
        if (!agreed.buyerId().equals(buyerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No sos el comprador de esta conversación");
        }
        if (agreed.method() != AgreedPurchaseMethod.PLATFORM) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "La forma de compra acordada no es 'por la plataforma'");
        }

        transactions.findByConversationId(conversationId).stream()
                .filter(Transaction::isActive)
                .findFirst()
                .ifPresent(active -> {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT, "Ya hay una transacción en curso para esta conversación: " + active.getId());
                });

        ProductSummary product = catalog.getProductSummary(agreed.productId()); // 404 se propaga
        if (product.status() != ProductStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El producto no está disponible para compra");
        }
        if (product.quantity() == null || product.quantity().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El producto no tiene cantidad publicada para vender");
        }

        // Decisión 3: se compra todo el listado (cantidad = cantidad publicada); precio y
        // cantidad se congelan en la transacción.
        Transaction txn = new Transaction(
                conversationId,
                agreed.productId(),
                buyerId,
                agreed.producerId(),
                product.quantity(),
                product.price(),
                currency);

        String successUrl = frontendBaseUrl + "/transacciones/" + txn.getId() + "?pago=ok";
        String cancelUrl = frontendBaseUrl + "/transacciones/" + txn.getId() + "?pago=cancelado";
        CheckoutSession session = gateway.createCheckout(txn, product.name(), successUrl, cancelUrl);
        txn.attachCheckoutSession(session.sessionId());
        transactions.save(txn);

        return new CheckoutStarted(txn.getId(), session.checkoutUrl());
    }

    /** Carga una transacción exigiendo que {@code userId} sea comprador o productor (403 si no). */
    public Transaction getParticipating(UUID transactionId, UUID userId) {
        Transaction txn = transactions
                .findById(transactionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transacción no encontrada"));
        if (!txn.hasParticipant(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No participás de esta transacción");
        }
        return txn;
    }

    /** "Mis compras" / "Mis ventas": cada transacción con su fila de ledger si ya está confirmada. */
    public List<TransactionView> listFor(UUID userId) {
        List<Transaction> mine = transactions.findByBuyerIdOrProducerIdOrderByCreatedAtDesc(userId, userId);
        Map<UUID, LedgerEntry> ledgerByTxn = ledger
                .findByTransactionIdIn(mine.stream().map(Transaction::getId).toList())
                .stream()
                .collect(Collectors.toMap(LedgerEntry::getTransactionId, Function.identity()));
        return mine.stream()
                .map(txn -> new TransactionView(txn, Optional.ofNullable(ledgerByTxn.get(txn.getId()))))
                .toList();
    }

    /**
     * Confirma el pago desde el webhook. {@code @Transactional}: el cambio de
     * estado, el insert del ledger y la publicación del evento solo "existen" si
     * el commit ocurre. Idempotente: si la transacción ya estaba confirmada
     * (reintento del webhook), no hace nada.
     */
    @Transactional
    public void confirm(String sessionId, String paymentIntentId) {
        Transaction txn = transactions.findByGatewaySessionId(sessionId).orElse(null);
        if (txn == null) {
            log.warn("Webhook de pago confirmado para una sesión desconocida: {}", sessionId);
            return;
        }
        if (!txn.confirm(paymentIntentId, Instant.now())) {
            return; // ya estaba CONFIRMED
        }
        transactions.save(txn);

        if (ledger.findByTransactionId(txn.getId()).isEmpty()) {
            PlatformFee.Split split = platformFee.split(txn.getAmount());
            ledger.save(new LedgerEntry(
                    txn.getId(),
                    txn.getProducerId(),
                    split.gross(),
                    split.fee(),
                    split.net(),
                    txn.getCurrency()));
        }

        events.publishEvent(new TransaccionConfirmada(
                txn.getId(),
                txn.getConversationId(),
                txn.getProductId(),
                txn.getBuyerId(),
                txn.getProducerId(),
                txn.getAmount()));
        log.info("Transacción {} confirmada (conversación {})", txn.getId(), txn.getConversationId());
    }

    /** La sesión de checkout expiró sin pago: la transacción pasa a {@code FAILED} y se libera la conversación. */
    @Transactional
    public void markExpired(String sessionId) {
        transactions.findByGatewaySessionId(sessionId).ifPresent(txn -> {
            txn.fail();
            transactions.save(txn);
        });
    }

    /**
     * Entrada única del webhook: verifica la firma, traduce el evento y aplica la
     * acción de dominio. {@code @Transactional} acá (y no solo en {@code confirm}/
     * {@code markExpired}) porque esos se invocan desde este mismo bean —
     * self-invocation, el proxy transaccional no intervendría en la llamada
     * interna. La verificación de firma no toca la BD: si falla, revierte una
     * transacción vacía.
     */
    @Transactional
    public void handleWebhook(String payload, String signatureHeader) {
        GatewayEvent event = gateway.parseWebhook(payload, signatureHeader); // 400 si la firma no valida
        switch (event.type()) {
            case CHECKOUT_COMPLETED -> confirm(event.sessionId(), event.paymentIntentId());
            case CHECKOUT_EXPIRED -> markExpired(event.sessionId());
            case IGNORED -> {
                /* evento que no nos interesa: 200 sin efecto */
            }
        }
    }

    public record CheckoutStarted(UUID transactionId, String checkoutUrl) {}

    public record TransactionView(Transaction transaction, Optional<LedgerEntry> ledger) {}
}
