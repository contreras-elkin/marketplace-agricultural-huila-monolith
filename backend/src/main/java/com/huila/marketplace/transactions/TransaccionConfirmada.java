package com.huila.marketplace.transactions;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Evento de dominio publicado cuando el webhook de la pasarela confirma el pago
 * de una compra por plataforma (architecture.md §3b; nombre del PDR §4-5). Se
 * publica dentro de la misma transacción que persiste la confirmación y la fila
 * de ledger, con {@code ApplicationEventPublisher}.
 *
 * <p>Sin {@code @TransactionalEventListener} hasta Épica 5 (Notificaciones), que
 * lo consumirá para avisarle al comprador —y opcionalmente al productor— sin
 * re-consultar nada: por eso el record lleva ambas partes, el producto y el monto.
 */
public record TransaccionConfirmada(
        UUID transactionId,
        UUID conversationId,
        UUID productId,
        UUID buyerId,
        UUID producerId,
        BigDecimal amount) {
}
