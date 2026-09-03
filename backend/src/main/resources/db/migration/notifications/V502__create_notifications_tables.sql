-- Épica 5 (Notificaciones, RF9). Rango reservado del módulo: V5xx (V501 ya creó el schema).
-- notifications es consumidor puro: estas filas nacen desde los listeners de
-- NuevoMensajeChat (chat) y TransaccionConfirmada (transactions). Texto desnormalizado
-- (title/body/link ya calculados) para que el frontend solo pinte.

CREATE TABLE notifications.notifications (
    id             UUID PRIMARY KEY,
    recipient_id   UUID         NOT NULL,
    type           VARCHAR(30)  NOT NULL,   -- NUEVO_MENSAJE_CHAT | TRANSACCION_CONFIRMADA
    title          VARCHAR(160) NOT NULL,
    body           TEXT         NOT NULL,
    link           VARCHAR(255),            -- ruta del frontend ("/chat/{id}", "/transacciones/{id}")
    source_ref_id  UUID,                    -- messageId / transactionId que originó la notificación
    read_at        TIMESTAMPTZ,             -- NULL = no leída
    created_at     TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_notifications_recipient
    ON notifications.notifications (recipient_id, created_at DESC);

-- Dedupe ante una re-entrega del mismo evento. Lleva recipient_id porque
-- TransaccionConfirmada genera DOS notificaciones con el mismo (type, source_ref_id):
-- una para el comprador y otra para el productor.
CREATE UNIQUE INDEX uq_notifications_source
    ON notifications.notifications (recipient_id, type, source_ref_id)
    WHERE source_ref_id IS NOT NULL;
