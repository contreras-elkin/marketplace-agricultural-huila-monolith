package com.huila.marketplace.transactions.web;

import java.util.UUID;

/**
 * Respuesta de {@code POST /api/transactions}: el id de la transacción recién
 * creada y la URL de Stripe Checkout a la que el frontend redirige al comprador.
 */
public record CheckoutResponse(UUID transactionId, String checkoutUrl) {
}
