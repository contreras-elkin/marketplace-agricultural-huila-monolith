package com.huila.marketplace.chat;

import java.util.UUID;

/**
 * Vista reducida de una conversación que el módulo chat expone al resto del
 * monolito. Deliberadamente mínima (mismo criterio que {@code catalog.ProductSummary}):
 * solo identifica a las partes, el producto y la forma de compra acordada.
 * Transacciones (Épica 4) re-consulta precio/cantidad a {@code CatalogModuleApi}
 * cuando las necesita — no se congelan acá.
 *
 * @param method {@code null} si las partes todavía no acordaron nada.
 */
public record AgreedPurchase(
        UUID conversationId, UUID productId, UUID buyerId, UUID producerId, AgreedPurchaseMethod method) {
}
