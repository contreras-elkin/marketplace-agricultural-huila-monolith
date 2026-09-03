package com.huila.marketplace.notifications.web;

/** Respuesta de {@code PUT /api/notifications/read-all}: cuántas notificaciones se marcaron. */
public record MarkAllReadResponse(int updated) {
}
