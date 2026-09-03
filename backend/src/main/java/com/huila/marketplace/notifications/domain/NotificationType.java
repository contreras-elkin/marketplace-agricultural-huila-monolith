package com.huila.marketplace.notifications.domain;

/**
 * Tipo de notificación (RF9). Interno del módulo: ningún otro módulo lo consume,
 * por eso no va al paquete raíz. Se mapea {@code EnumType.STRING} en la columna
 * {@code type VARCHAR(30)}.
 */
public enum NotificationType {

    /** Origen: evento {@code chat.NuevoMensajeChat}. */
    NUEVO_MENSAJE_CHAT,

    /** Origen: evento {@code transactions.TransaccionConfirmada}. */
    TRANSACCION_CONFIRMADA
}
