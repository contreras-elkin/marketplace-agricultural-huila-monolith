package com.huila.marketplace.chat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Mensaje dentro de una conversación. {@code conversationId} y {@code senderId}
 * son UUID sueltos (sin FK): la conversación vive en el mismo schema pero se
 * mantiene el mismo criterio que el resto del monolito. Se crea solo por
 * WebSocket; el REST de historial es de lectura.
 */
@Entity
@Table(name = "messages", schema = "chat")
public class Message {

    @Id
    private UUID id;

    @Column(name = "conversation_id", nullable = false, updatable = false)
    private UUID conversationId;

    @Column(name = "sender_id", nullable = false, updatable = false)
    private UUID senderId;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @Column(name = "sent_at", nullable = false, updatable = false)
    private Instant sentAt;

    protected Message() {
        // JPA
    }

    public Message(UUID conversationId, UUID senderId, String body) {
        this.id = UUID.randomUUID();
        this.conversationId = conversationId;
        this.senderId = senderId;
        this.body = body;
        this.sentAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getConversationId() {
        return conversationId;
    }

    public UUID getSenderId() {
        return senderId;
    }

    public String getBody() {
        return body;
    }

    public Instant getSentAt() {
        return sentAt;
    }
}
