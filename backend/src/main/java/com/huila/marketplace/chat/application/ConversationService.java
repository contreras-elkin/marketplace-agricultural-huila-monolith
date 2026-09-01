package com.huila.marketplace.chat.application;

import com.huila.marketplace.catalog.CatalogModuleApi;
import com.huila.marketplace.catalog.ProductSummary;
import com.huila.marketplace.chat.AgreedPurchaseMethod;
import com.huila.marketplace.chat.NuevoMensajeChat;
import com.huila.marketplace.chat.domain.Conversation;
import com.huila.marketplace.chat.domain.Message;
import com.huila.marketplace.chat.infrastructure.ConversationRepository;
import com.huila.marketplace.chat.infrastructure.MessageRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Casos de uso del chat. El producto y el productor se validan contra
 * {@link CatalogModuleApi} (nunca contra el schema de catalog); toda operación
 * sobre una conversación existente exige que el usuario sea una de las dos
 * partes (403 si no) — patrón "dueño" de catalog, con dos participantes.
 * Errores de negocio: {@link ResponseStatusException} directo, sin jerarquía
 * propia (architecture.md §5).
 */
@Service
public class ConversationService {

    private static final int MAX_BODY = 2000;

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final CatalogModuleApi catalog;
    private final ApplicationEventPublisher events;

    public ConversationService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            CatalogModuleApi catalog,
            ApplicationEventPublisher events) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.catalog = catalog;
        this.events = events;
    }

    /** ¿El comprador ya tiene una conversación abierta sobre este producto? (para decidir 200 vs 201). */
    public boolean exists(UUID buyerId, UUID productId) {
        return conversationRepository.findByProductIdAndBuyerId(productId, buyerId).isPresent();
    }

    /**
     * Abre la conversación del comprador sobre un producto, o devuelve la que ya
     * existe (idempotente). Valida el producto vía {@link CatalogModuleApi}
     * (404 si no existe / fue borrado) y saca de ahí el {@code producerId}.
     */
    @Transactional
    public Conversation openConversation(UUID buyerId, UUID productId) {
        return conversationRepository
                .findByProductIdAndBuyerId(productId, buyerId)
                .orElseGet(() -> {
                    ProductSummary product = catalog.getProductSummary(productId);
                    if (product.producerId().equals(buyerId)) {
                        throw new ResponseStatusException(
                                HttpStatus.BAD_REQUEST, "No podés abrir un chat sobre tu propio producto");
                    }
                    return conversationRepository.save(
                            new Conversation(productId, buyerId, product.producerId()));
                });
    }

    public List<Conversation> listFor(UUID userId) {
        return conversationRepository.findByBuyerIdOrProducerId(userId, userId);
    }

    /** Carga una conversación exigiendo que {@code userId} sea una de las dos partes. */
    public Conversation getParticipating(UUID conversationId, UUID userId) {
        Conversation conversation = conversationRepository
                .findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversación no encontrada"));
        if (!conversation.hasParticipant(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No participás de esta conversación");
        }
        return conversation;
    }

    public List<Message> history(UUID conversationId, UUID userId) {
        getParticipating(conversationId, userId);
        return messageRepository.findByConversationIdOrderBySentAtAsc(conversationId);
    }

    public Optional<Instant> lastActivity(UUID conversationId) {
        return messageRepository.findFirstByConversationIdOrderBySentAtDesc(conversationId).map(Message::getSentAt);
    }

    @Transactional
    public Conversation agree(UUID conversationId, UUID userId, AgreedPurchaseMethod method) {
        Conversation conversation = getParticipating(conversationId, userId);
        conversation.agree(method);
        return conversationRepository.save(conversation);
    }

    /**
     * Persiste un mensaje (enviado por WebSocket) y publica {@link NuevoMensajeChat}
     * en la misma transacción, de modo que el evento solo "existe" si el insert
     * hizo commit.
     */
    @Transactional
    public Message postMessage(UUID conversationId, UUID senderId, String rawBody) {
        Conversation conversation = getParticipating(conversationId, senderId);
        String body = rawBody == null ? "" : rawBody.strip();
        if (body.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El mensaje no puede estar vacío");
        }
        if (body.length() > MAX_BODY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El mensaje supera los " + MAX_BODY + " caracteres");
        }
        Message saved = messageRepository.save(new Message(conversationId, senderId, body));
        events.publishEvent(new NuevoMensajeChat(
                conversationId, saved.getId(), senderId, conversation.otherParticipant(senderId)));
        return saved;
    }

    /** Chequeo liviano para el interceptor STOMP: ¿este usuario puede suscribirse/postear en esta conversación? */
    public boolean isParticipant(UUID conversationId, UUID userId) {
        return conversationRepository.findById(conversationId).map(c -> c.hasParticipant(userId)).orElse(false);
    }
}
