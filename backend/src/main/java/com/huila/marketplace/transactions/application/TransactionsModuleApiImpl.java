package com.huila.marketplace.transactions.application;

import com.huila.marketplace.transactions.TransactionInfo;
import com.huila.marketplace.transactions.TransactionsModuleApi;
import com.huila.marketplace.transactions.infrastructure.TransactionRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Implementación del contrato público de transactions. Va directo al repositorio
 * (mismo módulo), sin pasar por {@link TransactionService} — este último modela
 * casos de uso con autorización de las dos partes que no aplican a una llamada
 * entre módulos. Mismo patrón que {@code chat.ChatModuleApiImpl}.
 */
@Service
public class TransactionsModuleApiImpl implements TransactionsModuleApi {

    private final TransactionRepository transactions;

    public TransactionsModuleApiImpl(TransactionRepository transactions) {
        this.transactions = transactions;
    }

    @Override
    public TransactionInfo getTransaction(UUID transactionId) {
        return transactions
                .findById(transactionId)
                .map(t -> new TransactionInfo(
                        t.getId(),
                        t.getConversationId(),
                        t.getProductId(),
                        t.getBuyerId(),
                        t.getProducerId(),
                        t.getAmount(),
                        t.getCurrency(),
                        t.getStatus()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transacción no encontrada"));
    }
}
