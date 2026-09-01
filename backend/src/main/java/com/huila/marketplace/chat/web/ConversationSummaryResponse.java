package com.huila.marketplace.chat.web;

import com.huila.marketplace.chat.AgreedPurchaseMethod;
import java.time.Instant;
import java.util.UUID;

/**
 * Fila de la lista "Mis conversaciones". {@code otherParticipantName} es el
 * nombre de la contraparte (comprador o productor, según quién consulte);
 * {@code lastMessageAt} es {@code null} si todavía no hay mensajes.
 */
public record ConversationSummaryResponse(
        UUID id,
        UUID productId,
        String productName,
        String otherParticipantName,
        AgreedPurchaseMethod agreedPurchaseMethod,
        Instant lastMessageAt,
        Instant createdAt) {
}
