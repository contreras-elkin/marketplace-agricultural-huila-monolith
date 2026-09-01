package com.huila.marketplace.transactions;

/**
 * Estado de una transacción de compra por plataforma.
 *
 * <ul>
 *   <li>{@code PENDING} — se creó la sesión de checkout, falta que el comprador pague.
 *   <li>{@code CONFIRMED} — el webhook de la pasarela reportó el pago; hay fila de ledger.
 *   <li>{@code FAILED} — la sesión de checkout expiró sin pago (el comprador puede reintentar).
 * </ul>
 *
 * Vive en el paquete raíz porque aparece en {@link TransactionInfo}, el tipo que
 * {@link TransactionsModuleApi} expone al resto del monolito — mismo criterio que
 * {@code catalog.ProductStatus}.
 */
public enum TransactionStatus {
    PENDING,
    CONFIRMED,
    FAILED
}
