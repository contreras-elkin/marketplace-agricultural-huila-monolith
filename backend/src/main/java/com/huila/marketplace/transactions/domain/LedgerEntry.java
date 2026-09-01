package com.huila.marketplace.transactions.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Registro de la dispersión hacia el productor al confirmarse una transacción
 * (RF7, "ledger interno"). Append-only: una fila por transacción confirmada
 * ({@code uq_ledger_transaction}). En fase 1 la comisión de plataforma es 0
 * (Decisión 6), así que {@code netAmount == grossAmount}; la columna
 * {@code platformFeeAmount} queda para cuando se active una tasa sin tocar el schema.
 */
@Entity
@Table(name = "ledger_entries", schema = "transactions")
public class LedgerEntry {

    @Id
    private UUID id;

    @Column(name = "transaction_id", nullable = false, updatable = false)
    private UUID transactionId;

    @Column(name = "producer_id", nullable = false, updatable = false)
    private UUID producerId;

    @Column(name = "gross_amount", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal grossAmount;

    @Column(name = "platform_fee_amount", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal platformFeeAmount;

    @Column(name = "net_amount", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal netAmount;

    @Column(nullable = false, length = 3, updatable = false)
    private String currency;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected LedgerEntry() {
        // JPA
    }

    public LedgerEntry(
            UUID transactionId,
            UUID producerId,
            BigDecimal grossAmount,
            BigDecimal platformFeeAmount,
            BigDecimal netAmount,
            String currency) {
        this.id = UUID.randomUUID();
        this.transactionId = transactionId;
        this.producerId = producerId;
        this.grossAmount = grossAmount;
        this.platformFeeAmount = platformFeeAmount;
        this.netAmount = netAmount;
        this.currency = currency;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getTransactionId() {
        return transactionId;
    }

    public UUID getProducerId() {
        return producerId;
    }

    public BigDecimal getGrossAmount() {
        return grossAmount;
    }

    public BigDecimal getPlatformFeeAmount() {
        return platformFeeAmount;
    }

    public BigDecimal getNetAmount() {
        return netAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
