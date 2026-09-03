package com.huila.marketplace.notifications.application;

import com.huila.marketplace.auth.AuthModuleApi;
import com.huila.marketplace.catalog.CatalogModuleApi;
import com.huila.marketplace.chat.NuevoMensajeChat;
import com.huila.marketplace.notifications.domain.Notification;
import com.huila.marketplace.notifications.domain.NotificationType;
import com.huila.marketplace.notifications.infrastructure.NotificationRepository;
import com.huila.marketplace.transactions.TransaccionConfirmada;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Consumidor de los eventos de dominio de {@code chat} y {@code transactions}
 * (architecture.md §3b). {@code notifications} no expone {@code ModuleApi}: solo
 * reacciona. Cada listener corre {@code @Async} en {@code notificationsExecutor} y
 * {@code AFTER_COMMIT}, así que:
 * <ul>
 *   <li>la notificación solo nace si la transacción que originó el evento hizo commit;</li>
 *   <li>quien publicó el evento (envío de mensaje / webhook) no espera;</li>
 *   <li>un fallo acá se captura y se logea — nunca vuelve a {@code chat}/{@code transactions}
 *       (refuerza el no funcional del PDR: "el resto sigue aunque Notificaciones falle").</li>
 * </ul>
 * El texto se arma acá una sola vez ({@code title}/{@code body}/{@code link}); el
 * frontend solo lo pinta. {@code AuthModuleApi}/{@code CatalogModuleApi} se usan para
 * poner nombres legibles — llamadas síncronas entre módulos, nunca contra sus schemas.
 */
@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

    private final NotificationRepository notifications;
    private final AuthModuleApi auth;
    private final CatalogModuleApi catalog;

    public NotificationEventListener(
            NotificationRepository notifications, AuthModuleApi auth, CatalogModuleApi catalog) {
        this.notifications = notifications;
        this.auth = auth;
        this.catalog = catalog;
    }

    @Async("notificationsExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(NuevoMensajeChat event) {
        try {
            String senderName = auth.getUserSummary(event.senderId()).name();
            save(
                    event.recipientId(),
                    NotificationType.NUEVO_MENSAJE_CHAT,
                    "Nuevo mensaje de " + senderName,
                    senderName + " te escribió en una conversación.",
                    "/chat/" + event.conversationId(),
                    event.messageId());
        } catch (RuntimeException ex) {
            log.warn(
                    "No se pudo crear la notificación de NuevoMensajeChat (mensaje {}): {}",
                    event.messageId(),
                    ex.getMessage());
        }
    }

    @Async("notificationsExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(TransaccionConfirmada event) {
        try {
            String productName = safeProductName(event.productId());
            String link = "/transacciones/" + event.transactionId();
            save(
                    event.buyerId(),
                    NotificationType.TRANSACCION_CONFIRMADA,
                    "Tu compra fue confirmada",
                    "Se confirmó el pago de \"" + productName + "\".",
                    link,
                    event.transactionId());
            save(
                    event.producerId(),
                    NotificationType.TRANSACCION_CONFIRMADA,
                    "Tenés una venta confirmada",
                    "Se confirmó el pago de \"" + productName + "\".",
                    link,
                    event.transactionId());
        } catch (RuntimeException ex) {
            log.warn(
                    "No se pudo crear la notificación de TransaccionConfirmada (transacción {}): {}",
                    event.transactionId(),
                    ex.getMessage());
        }
    }

    /** Inserta la notificación salvo que ya exista una del mismo evento para ese destinatario (re-entrega). */
    private void save(
            UUID recipientId, NotificationType type, String title, String body, String link, UUID sourceRefId) {
        if (notifications.existsByRecipientIdAndTypeAndSourceRefId(recipientId, type, sourceRefId)) {
            return;
        }
        notifications.save(new Notification(recipientId, type, title, body, link, sourceRefId));
    }

    /** El producto pudo borrarse entre la confirmación y el listener; no romper la notificación por eso. */
    private String safeProductName(UUID productId) {
        try {
            return catalog.getProductSummary(productId).name();
        } catch (RuntimeException ex) {
            return "el producto";
        }
    }
}
