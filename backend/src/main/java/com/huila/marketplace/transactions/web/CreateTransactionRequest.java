package com.huila.marketplace.transactions.web;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Cuerpo de {@code POST /api/transactions}. Solo la conversación: el comprador
 * sale del JWT y el monto se calcula en el backend a partir del catálogo
 * (Decisión 3 — nunca se acepta un monto del cliente).
 */
public record CreateTransactionRequest(@NotNull UUID conversationId) {
}
