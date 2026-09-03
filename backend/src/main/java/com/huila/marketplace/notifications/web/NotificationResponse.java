package com.huila.marketplace.notifications.web;

import com.huila.marketplace.notifications.domain.Notification;
import com.huila.marketplace.notifications.domain.NotificationType;
import java.time.Instant;
import java.util.UUID;

/**
 * Una notificación tal como la consume el frontend. El texto ya viene armado desde
 * el listener; {@code read} colapsa {@code readAt} a booleano (el momento exacto de
 * lectura no le interesa a la UI).
 */
public record NotificationResponse(
        UUID id,
        NotificationType type,
        String title,
        String body,
        String link,
        boolean read,
        Instant createdAt) {

    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getBody(),
                notification.getLink(),
                notification.isRead(),
                notification.getCreatedAt());
    }
}
