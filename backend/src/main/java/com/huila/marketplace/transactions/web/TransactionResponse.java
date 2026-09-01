package com.huila.marketplace.transactions.web;

import com.huila.marketplace.transactions.TransactionStatus;
import com.huila.marketplace.transactions.domain.Transaction;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Detalle de una transacción para la pantalla de estado del comprador
 * ({@code GET /api/transactions/{id}}). Los nombres los resuelve el controller
 * vía las APIs públicas de {@code catalog} y {@code auth}.
 */
public record TransactionResponse(
        UUID id,
        TransactionStatus status,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal amount,
        String currency,
        String productName,
        String otherPartyName,
        Instant createdAt,
        Instant confirmedAt) {

    public static TransactionResponse of(Transaction txn, String productName, String otherPartyName) {
        return new TransactionResponse(
                txn.getId(),
                txn.getStatus(),
                txn.getQuantity(),
                txn.getUnitPrice(),
                txn.getAmount(),
                txn.getCurrency(),
                productName,
                otherPartyName,
                txn.getCreatedAt(),
                txn.getConfirmedAt());
    }
}
