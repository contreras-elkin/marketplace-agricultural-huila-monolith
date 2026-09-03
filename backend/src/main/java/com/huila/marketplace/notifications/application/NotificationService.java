package com.huila.marketplace.notifications.application;

import com.huila.marketplace.notifications.domain.Notification;
import com.huila.marketplace.notifications.infrastructure.NotificationRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Lectura y marcado de las notificaciones del usuario. El {@code recipientId}
 * siempre lo pone el controller desde el JWT — acá nunca se listan ni se marcan
 * notificaciones ajenas. La creación no está en este service: la hacen los
 * listeners de {@link NotificationEventListener} al consumir eventos.
 * Errores de negocio: {@link ResponseStatusException} directo (architecture.md §5).
 */
@Service
public class NotificationService {

    private final NotificationRepository notifications;

    public NotificationService(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    public List<Notification> list(UUID recipientId) {
        return notifications.findTop50ByRecipientIdOrderByCreatedAtDesc(recipientId);
    }

    public long unreadCount(UUID recipientId) {
        return notifications.countByRecipientIdAndReadAtIsNull(recipientId);
    }

    /** Marca una notificación como leída. 404 si no existe o no es del usuario (no se distingue). */
    @Transactional
    public void markRead(UUID notificationId, UUID recipientId) {
        Notification notification = notifications
                .findById(notificationId)
                .filter(n -> n.getRecipientId().equals(recipientId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificación no encontrada"));
        notification.markRead(Instant.now());
        notifications.save(notification);
    }

    /** Marca todas las no leídas del usuario; devuelve cuántas se actualizaron. */
    @Transactional
    public int markAllRead(UUID recipientId) {
        return notifications.markAllRead(recipientId, Instant.now());
    }
}
