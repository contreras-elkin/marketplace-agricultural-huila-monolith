package com.huila.marketplace.chat.web;

/**
 * Cuerpo del frame STOMP {@code SEND /app/conversations/{id}/messages}. La
 * validación (no vacío, longitud máxima) vive en {@code ConversationService},
 * no como anotaciones acá: el camino WebSocket no pasa por el {@code @Valid}
 * de MVC y se prefiere una sola fuente de verdad.
 */
public record SendMessagePayload(String body) {
}
