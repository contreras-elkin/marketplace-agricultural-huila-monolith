package com.huila.marketplace.chat.web;

import com.huila.marketplace.auth.AuthModuleApi;
import com.huila.marketplace.catalog.CatalogModuleApi;
import com.huila.marketplace.chat.application.ConversationService;
import com.huila.marketplace.chat.domain.Conversation;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.Comparator;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST del chat. Abrir conversación exige rol comprador ({@code hasRole('BUYER')});
 * leer historial, ver el detalle y fijar la forma de compra exigen solo estar
 * autenticado — la restricción real ("solo las dos partes") la aplica
 * {@link ConversationService}. El envío de mensajes NO está acá: va por
 * WebSocket ({@link ChatMessagingController}). Los nombres de personas/productos
 * se resuelven vía las APIs públicas de {@code auth} y {@code catalog}, igual
 * que {@code catalog.ProductController} resuelve el nombre del productor.
 */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ConversationService conversations;
    private final AuthModuleApi auth;
    private final CatalogModuleApi catalog;

    public ChatController(ConversationService conversations, AuthModuleApi auth, CatalogModuleApi catalog) {
        this.conversations = conversations;
        this.auth = auth;
        this.catalog = catalog;
    }

    @PostMapping("/conversations")
    @PreAuthorize("hasRole('BUYER')")
    public ResponseEntity<ConversationResponse> open(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateConversationRequest request) {
        UUID buyerId = userId(jwt);
        boolean existed = conversations.exists(buyerId, request.productId());
        Conversation conversation = conversations.openConversation(buyerId, request.productId());
        return ResponseEntity.status(existed ? HttpStatus.OK : HttpStatus.CREATED).body(toResponse(conversation));
    }

    @GetMapping("/conversations")
    public List<ConversationSummaryResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        UUID me = userId(jwt);
        return conversations.listFor(me).stream()
                .map(conversation -> toSummary(conversation, me))
                .sorted(Comparator.comparing(
                                (ConversationSummaryResponse summary) ->
                                        summary.lastMessageAt() != null ? summary.lastMessageAt() : summary.createdAt())
                        .reversed())
                .toList();
    }

    @GetMapping("/conversations/{id}")
    public ConversationResponse detail(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return toResponse(conversations.getParticipating(id, userId(jwt)));
    }

    @GetMapping("/conversations/{id}/messages")
    public List<MessageResponse> messages(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return conversations.history(id, userId(jwt)).stream().map(MessageResponse::from).toList();
    }

    @PutMapping("/conversations/{id}/purchase-method")
    public ConversationResponse setPurchaseMethod(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody PurchaseMethodRequest request) {
        return toResponse(conversations.agree(id, userId(jwt), request.method()));
    }

    // --- interno ---------------------------------------------------------

    private ConversationResponse toResponse(Conversation conversation) {
        return new ConversationResponse(
                conversation.getId(),
                conversation.getProductId(),
                safeProductName(conversation.getProductId()),
                conversation.getBuyerId(),
                conversation.getProducerId(),
                auth.getUserSummary(conversation.getBuyerId()).name(),
                auth.getUserSummary(conversation.getProducerId()).name(),
                conversation.getAgreedPurchaseMethod(),
                conversation.getCreatedAt());
    }

    private ConversationSummaryResponse toSummary(Conversation conversation, UUID me) {
        UUID other = conversation.otherParticipant(me);
        Instant lastMessageAt = conversations.lastActivity(conversation.getId()).orElse(null);
        return new ConversationSummaryResponse(
                conversation.getId(),
                conversation.getProductId(),
                safeProductName(conversation.getProductId()),
                auth.getUserSummary(other).name(),
                conversation.getAgreedPurchaseMethod(),
                lastMessageAt,
                conversation.getCreatedAt());
    }

    /** El producto puede haberse borrado después de abierta la conversación; no romper la lista por eso. */
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
