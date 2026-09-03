package com.huila.marketplace.notifications.infrastructure;

import com.huila.marketplace.notifications.domain.Notification;
import com.huila.marketplace.notifications.domain.NotificationType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Repositorio del schema {@code notifications}. */
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /** Historial del usuario, más recientes primero (sin paginación en el MVP; se cortan las últimas 50). */
    List<Notification> findTop50ByRecipientIdOrderByCreatedAtDesc(UUID recipientId);

    long countByRecipientIdAndReadAtIsNull(UUID recipientId);

    /** Dedupe: ¿ya existe una notificación de este evento para este destinatario? */
    boolean existsByRecipientIdAndTypeAndSourceRefId(UUID recipientId, NotificationType type, UUID sourceRefId);

    /** Marca como leídas todas las no leídas del usuario en un solo UPDATE; devuelve las filas afectadas. */
    @Modifying
    @Query("UPDATE Notification n SET n.readAt = :now WHERE n.recipientId = :recipientId AND n.readAt IS NULL")
    int markAllRead(@Param("recipientId") UUID recipientId, @Param("now") Instant now);
}
