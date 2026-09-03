package com.huila.marketplace.notifications.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Notificación para un usuario (RF9). El texto viene ya armado por el listener que
 * la creó ({@code title}/{@code body}/{@code link}): el frontend solo lo pinta.
 * Los {@code *_id} son UUID sueltos, sin FK — {@code recipientId} apunta a un
 * usuario de {@code auth}, {@code sourceRefId} al {@code messageId}/{@code transactionId}
 * que la originó (usado para no duplicarla si el evento se re-entrega). Patrón de
 * {@code catalog.domain.Product} / {@code chat.domain.Message}: id UUID en el
 * constructor, {@code Instant} ↔ {@code TIMESTAMPTZ}.
 */
@Entity
@Table(name = "notifications", schema = "notifications")
public class Notification {

    @Id
    private UUID id;

    @Column(name = "recipient_id", nullable = false, updatable = false)
    private UUID recipientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30, updatable = false)
    private NotificationType type;

    @Column(nullable = false, length = 160, updatable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "text", updatable = false)
    private String body;

    @Column(length = 255, updatable = false)
    private String link;

    @Column(name = "source_ref_id", updatable = false)
    private UUID sourceRefId;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Notification() {
        // JPA
    }

    public Notification(
            UUID recipientId,
            NotificationType type,
            String title,
            String body,
            String link,
            UUID sourceRefId) {
        this.id = UUID.randomUUID();
        this.recipientId = recipientId;
        this.type = type;
        this.title = title;
        this.body = body;
        this.link = link;
        this.sourceRefId = sourceRefId;
        this.createdAt = Instant.now();
    }

    /** Marca la notificación como leída. No-op si ya lo estaba (idempotente). */
    public void markRead(Instant at) {
        if (this.readAt == null) {
            this.readAt = at;
        }
    }

    public boolean isRead() {
        return readAt != null;
    }

    public UUID getId() {
        return id;
    }

    public UUID getRecipientId() {
        return recipientId;
    }

    public NotificationType getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public String getLink() {
        return link;
    }

    public UUID getSourceRefId() {
        return sourceRefId;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
