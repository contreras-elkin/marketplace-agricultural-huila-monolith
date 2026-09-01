package com.huila.marketplace.transactions.web;

import com.huila.marketplace.transactions.TransactionStatus;
import com.huila.marketplace.transactions.domain.LedgerEntry;
import com.huila.marketplace.transactions.domain.Transaction;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Fila de {@code GET /api/transactions/mine}. Sirve tanto para "Mis compras"
 * (rol {@code BUYER}) como para "Mis ventas" (rol {@code PRODUCER}); {@code role}
 * dice de qué lado está el usuario que consulta. {@code ledger} viene solo en
 * las ventas confirmadas (desglose bruto / comisión / neto).
 */
public record MyTransactionResponse(
        UUID id,
        UUID conversationId,
        String role,
        TransactionStatus status,
        String productName,
        String counterpartyName,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal amount,
        String currency,
        Instant createdAt,
        Instant confirmedAt,
        LedgerBreakdown ledger) {

    public record LedgerBreakdown(BigDecimal grossAmount, BigDecimal platformFeeAmount, BigDecimal netAmount) {

        static LedgerBreakdown of(LedgerEntry entry) {
            return new LedgerBreakdown(
                    entry.getGrossAmount(), entry.getPlatformFeeAmount(), entry.getNetAmount());
        }
    }

    public static MyTransactionResponse of(
            Transaction txn,
            UUID viewerId,
            String productName,
            String counterpartyName,
            LedgerEntry ledgerOrNull) {
        boolean isBuyer = txn.getBuyerId().equals(viewerId);
        return new MyTransactionResponse(
                txn.getId(),
                txn.getConversationId(),
                isBuyer ? "BUYER" : "PRODUCER",
                txn.getStatus(),
                productName,
                counterpartyName,
                txn.getQuantity(),
                txn.getUnitPrice(),
                txn.getAmount(),
                txn.getCurrency(),
                txn.getCreatedAt(),
                txn.getConfirmedAt(),
                ledgerOrNull == null ? null : LedgerBreakdown.of(ledgerOrNull));
    }
}
