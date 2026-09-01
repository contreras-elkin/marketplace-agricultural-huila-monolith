package com.huila.marketplace.chat;

import java.util.UUID;

/**
 * Evento de dominio en proceso (nombre tomado del PDR §4-5). Lo publica chat con
 * {@code ApplicationEventPublisher} al persistir cada mensaje, dentro de la misma
 * transacción. En esta épica nadie lo escucha; notifications lo consumirá en la
 * Épica 5 con {@code @TransactionalEventListener} — así ese módulo nace como puro
 * consumidor sin tocar el flujo de envío. Espejo de la futura cola RabbitMQ.
 *
 * @param recipientId la otra parte de la conversación (a quién hay que notificar).
 */
public record NuevoMensajeChat(
        UUID conversationId, UUID messageId, UUID senderId, UUID recipientId) {
}
