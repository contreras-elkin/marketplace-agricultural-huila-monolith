package com.huila.marketplace.chat.web;

import com.huila.marketplace.chat.AgreedPurchaseMethod;
import java.time.Instant;
import java.util.UUID;

/**
 * Detalle de una conversación para la cabecera de la ventana de chat. Incluye
 * los ids y nombres de ambas partes para que el frontend sepa de qué lado está
 * y a quién le escribe; los nombres los resuelve {@code ChatController} vía
 * {@code AuthModuleApi} / {@code CatalogModuleApi}.
 */
public record ConversationResponse(
        UUID id,
        UUID productId,
        String productName,
        UUID buyerId,
        UUID producerId,
        String buyerName,
        String producerName,
        AgreedPurchaseMethod agreedPurchaseMethod,
        Instant createdAt) {
}
