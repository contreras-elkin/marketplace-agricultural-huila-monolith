package com.huila.marketplace.transactions.domain;

import com.huila.marketplace.transactions.TransactionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Compra por plataforma iniciada desde una conversación de chat (RF7). Los
 * {@code *_id} son UUID sueltos: transactions nunca referencia los schemas de
 * chat/catalog/auth (architecture.md §3). Precio y cantidad se congelan al
 * crearse ({@code unitPrice}, {@code quantity}, {@code amount}) para que un
 * cambio posterior del producto no altere una transacción ya iniciada.
 */
@Entity
@Table(name = "transactions", schema = "transactions")
public class Transaction {

    @Id
    private UUID id;

    @Column(name = "conversation_id", nullable = false, updatable = false)
    private UUID conversationId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Column(name = "buyer_id", nullable = false, updatable = false)
    private UUID buyerId;

    @Column(name = "producer_id", nullable = false, updatable = false)
    private UUID producerId;

    @Column(nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal unitPrice;

    @Column(nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(nullable = false, length = 3, updatable = false)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionStatus status;

    @Column(name = "gateway_session_id", length = 255)
    private String gatewaySessionId;

    @Column(name = "gateway_payment_id", length = 255)
    private String gatewayPaymentId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    protected Transaction() {
        // JPA
    }

    public Transaction(
            UUID conversationId,
            UUID productId,
            UUID buyerId,
            UUID producerId,
            BigDecimal quantity,
            BigDecimal unitPrice,
            String currency) {
        this.id = UUID.randomUUID();
        this.conversationId = conversationId;
        this.productId = productId;
        this.buyerId = buyerId;
        this.producerId = producerId;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.amount = unitPrice.multiply(quantity).setScale(2, java.math.RoundingMode.HALF_UP);
        this.currency = currency;
        this.status = TransactionStatus.PENDING;
        this.createdAt = Instant.now();
    }

    public void attachCheckoutSession(String sessionId) {
        this.gatewaySessionId = sessionId;
    }

    /**
     * Marca la transacción como pagada. Idempotente: si ya estaba {@code CONFIRMED}
     * (reintento del webhook), no hace nada y devuelve {@code false}; solo la
     * primera vez devuelve {@code true} — señal para escribir el ledger y publicar
     * el evento una sola vez.
     */
    public boolean confirm(String gatewayPaymentId, Instant at) {
        if (status == TransactionStatus.CONFIRMED) {
            return false;
        }
        this.status = TransactionStatus.CONFIRMED;
        this.gatewayPaymentId = gatewayPaymentId;
        this.confirmedAt = at;
        return true;
    }

    /** La sesión de checkout expiró sin pago. No toca una transacción ya confirmada. */
    public void fail() {
        if (status == TransactionStatus.PENDING) {
            this.status = TransactionStatus.FAILED;
        }
    }

    public boolean hasParticipant(UUID userId) {
        return buyerId.equals(userId) || producerId.equals(userId);
    }

    /** Una transacción {@code PENDING} o {@code CONFIRMED} bloquea abrir otra en la misma conversación. */
    public boolean isActive() {
        return status == TransactionStatus.PENDING || status == TransactionStatus.CONFIRMED;
    }

    public UUID getId() {
        return id;
    }

    public UUID getConversationId() {
        return conversationId;
    }

    public UUID getProductId() {
        return productId;
    }

    public UUID getBuyerId() {
        return buyerId;
    }

    public UUID getProducerId() {
        return producerId;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public TransactionStatus getStatus() {
        return status;
    }

    public String getGatewaySessionId() {
        return gatewaySessionId;
    }

    public String getGatewayPaymentId() {
        return gatewayPaymentId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }
}
