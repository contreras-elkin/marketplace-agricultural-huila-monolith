package com.huila.marketplace.chat.web;

import com.huila.marketplace.chat.domain.Message;
import java.time.Instant;
import java.util.UUID;

/** Un mensaje, tal como viaja por el historial REST y por el topic STOMP {@code /topic/conversations/{id}}. */
public record MessageResponse(UUID id, UUID conversationId, UUID senderId, String body, Instant sentAt) {

    public static MessageResponse from(Message message) {
        return new MessageResponse(
                message.getId(),
                message.getConversationId(),
                message.getSenderId(),
                message.getBody(),
                message.getSentAt());
    }
}
