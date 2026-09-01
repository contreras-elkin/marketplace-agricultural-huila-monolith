package com.huila.marketplace.transactions;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Vista reducida de una transacción que el módulo transactions expone al resto
 * del monolito. Deliberadamente mínima (mismo criterio que {@code catalog.ProductSummary}
 * y {@code chat.AgreedPurchase}): identifica a las partes, el producto, la conversación
 * de origen y el monto/estado.
 */
public record TransactionInfo(
        UUID id,
        UUID conversationId,
        UUID productId,
        UUID buyerId,
        UUID producerId,
        BigDecimal amount,
        String currency,
        TransactionStatus status) {
}
