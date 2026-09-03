package com.huila.marketplace.notifications.web;

import com.huila.marketplace.notifications.application.NotificationService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST de Notificaciones. Todo exige solo estar autenticado (no hay ruta pública,
 * así que {@code SecurityConfig} no se toca); el destinatario es SIEMPRE el del JWT,
 * de modo que nadie lista ni marca notificaciones ajenas. No hay {@code POST}: las
 * notificaciones nacen de los eventos que consume el módulo, no de la API.
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public NotificationListResponse list(@AuthenticationPrincipal Jwt jwt) {
        UUID me = userId(jwt);
        List<NotificationResponse> items =
                service.list(me).stream().map(NotificationResponse::from).toList();
        return new NotificationListResponse(items, service.unreadCount(me));
    }

    @PutMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        service.markRead(id, userId(jwt));
    }

    @PutMapping("/read-all")
    public MarkAllReadResponse markAllRead(@AuthenticationPrincipal Jwt jwt) {
        return new MarkAllReadResponse(service.markAllRead(userId(jwt)));
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
