package com.huila.marketplace.chat.domain;

import com.huila.marketplace.chat.AgreedPurchaseMethod;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Conversación entre un comprador y el productor de un producto (RF5). Los
 * {@code *_id} son UUID sueltos a propósito: no hay FK hacia {@code catalog} ni
 * {@code auth} porque un módulo nunca referencia el schema de otro
 * (architecture.md §3). Única por {@code (productId, buyerId)}: el comprador la
 * inicia y "Chatear" la reusa; el productor solo responde.
 */
@Entity
@Table(name = "conversations", schema = "chat")
public class Conversation {

    @Id
    private UUID id;

    @Column(name = "product_id", nullable = false, updatable = false)
    private UUID productId;

    @Column(name = "buyer_id", nullable = false, updatable = false)
    private UUID buyerId;

    @Column(name = "producer_id", nullable = false, updatable = false)
    private UUID producerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "agreed_purchase_method", length = 20)
    private AgreedPurchaseMethod agreedPurchaseMethod;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Conversation() {
        // JPA
    }

    public Conversation(UUID productId, UUID buyerId, UUID producerId) {
        this.id = UUID.randomUUID();
        this.productId = productId;
        this.buyerId = buyerId;
        this.producerId = producerId;
        this.createdAt = Instant.now();
    }

    /** Registra la forma de compra elegida. Last-write-wins: sin máquina de estados de negociación. */
    public void agree(AgreedPurchaseMethod method) {
        this.agreedPurchaseMethod = method;
    }

    public boolean hasParticipant(UUID userId) {
        return buyerId.equals(userId) || producerId.equals(userId);
    }

    /** Dado uno de los dos participantes, devuelve el otro (para el destinatario del evento / la cabecera del chat). */
    public UUID otherParticipant(UUID userId) {
        return buyerId.equals(userId) ? producerId : buyerId;
    }

    public UUID getId() {
        return id;
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

    public AgreedPurchaseMethod getAgreedPurchaseMethod() {
        return agreedPurchaseMethod;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
