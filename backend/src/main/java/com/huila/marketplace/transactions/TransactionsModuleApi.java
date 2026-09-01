package com.huila.marketplace.transactions;

import java.util.UUID;

/**
 * Única puerta de entrada pública del módulo transactions para el resto del
 * monolito (architecture.md §3a). En Épica 4 todavía no tiene consumidor: se
 * expone ya para dejar listo el contrato síncrono (Decisión 7 del spec de la
 * épica). Los eventos que publica transactions ({@link TransaccionConfirmada})
 * van por el otro mecanismo (asíncrono), no por acá.
 */
public interface TransactionsModuleApi {

    /**
     * @throws org.springframework.web.server.ResponseStatusException 404 si la
     *     transacción no existe.
     */
    TransactionInfo getTransaction(UUID transactionId);
}
