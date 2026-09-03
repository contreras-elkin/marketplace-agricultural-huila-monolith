package com.huila.marketplace.notifications.web;

import java.util.List;

/**
 * Respuesta de {@code GET /api/notifications}: la lista y el contador de no leídas
 * en una sola llamada, para que el badge y la página se sirvan con un solo request.
 */
public record NotificationListResponse(List<NotificationResponse> items, long unreadCount) {
}
