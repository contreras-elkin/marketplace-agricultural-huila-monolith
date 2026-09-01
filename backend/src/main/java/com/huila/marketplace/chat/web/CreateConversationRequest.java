package com.huila.marketplace.chat.web;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Cuerpo de {@code POST /api/chat/conversations}. El {@code buyerId} sale del JWT, no del cuerpo. */
public record CreateConversationRequest(@NotNull UUID productId) {
}
