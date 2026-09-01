package com.huila.marketplace.transactions.infrastructure;

import com.huila.marketplace.transactions.domain.LedgerEntry;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repositorio del schema {@code transactions}. */
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

    /** Una sola fila de ledger por transacción ({@code uq_ledger_transaction}). */
    Optional<LedgerEntry> findByTransactionId(UUID transactionId);

    /** Filas de ledger de un conjunto de transacciones (para armar "Mis ventas" en un query). */
    List<LedgerEntry> findByTransactionIdIn(List<UUID> transactionIds);
}
