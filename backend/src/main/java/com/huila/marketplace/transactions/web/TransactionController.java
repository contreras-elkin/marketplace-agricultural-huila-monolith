package com.huila.marketplace.transactions.web;

import com.huila.marketplace.auth.AuthModuleApi;
import com.huila.marketplace.catalog.CatalogModuleApi;
import com.huila.marketplace.transactions.application.TransactionService;
import com.huila.marketplace.transactions.application.TransactionService.CheckoutStarted;
import com.huila.marketplace.transactions.application.TransactionService.TransactionView;
import com.huila.marketplace.transactions.domain.Transaction;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST de Transacciones. Iniciar el pago exige rol comprador ({@code hasRole('BUYER')});
 * ver el estado y listar "mis compras/ventas" exigen solo estar autenticado — la
 * restricción "solo las dos partes" la aplica {@link TransactionService}. El webhook
 * NO está acá: va sin autenticación en {@link StripeWebhookController}. Los nombres
 * de personas/productos se resuelven vía las APIs públicas de {@code auth} y
 * {@code catalog}, igual que en {@code chat.ChatController}.
 */
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService service;
    private final AuthModuleApi auth;
    private final CatalogModuleApi catalog;

    public TransactionController(TransactionService service, AuthModuleApi auth, CatalogModuleApi catalog) {
        this.service = service;
        this.auth = auth;
        this.catalog = catalog;
    }

    @PostMapping
    @PreAuthorize("hasRole('BUYER')")
    public ResponseEntity<CheckoutResponse> create(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateTransactionRequest request) {
        CheckoutStarted started = service.startCheckout(userId(jwt), request.conversationId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CheckoutResponse(started.transactionId(), started.checkoutUrl()));
    }

    @GetMapping("/mine")
    public List<MyTransactionResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        UUID me = userId(jwt);
        return service.listFor(me).stream().map(view -> toMine(view, me)).toList();
    }

    @GetMapping("/{id}")
    public TransactionResponse detail(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UUID me = userId(jwt);
        Transaction txn = service.getParticipating(id, me);
        return TransactionResponse.of(txn, safeProductName(txn.getProductId()), counterpartyName(txn, me));
    }

    // --- interno ---------------------------------------------------------

    private MyTransactionResponse toMine(TransactionView view, UUID me) {
        Transaction txn = view.transaction();
        return MyTransactionResponse.of(
                txn, me, safeProductName(txn.getProductId()), counterpartyName(txn, me), view.ledger().orElse(null));
    }

    private String counterpartyName(Transaction txn, UUID me) {
        UUID otherId = txn.getBuyerId().equals(me) ? txn.getProducerId() : txn.getBuyerId();
        return auth.getUserSummary(otherId).name();
    }

    /** El producto puede haberse borrado después de creada la transacción; no romper la vista por eso. */
    private String safeProductName(UUID productId) {
        try {
            return catalog.getProductSummary(productId).name();
        } catch (ResponseStatusException ex) {
            return "Producto no disponible";
        }
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
