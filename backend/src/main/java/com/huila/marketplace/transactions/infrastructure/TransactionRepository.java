package com.huila.marketplace.transactions.infrastructure;

import com.huila.marketplace.transactions.domain.Transaction;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repositorio del schema {@code transactions}. */
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    /** Todas las transacciones de una conversación (para el chequeo de "una activa por conversación"). */
    List<Transaction> findByConversationId(UUID conversationId);

    /** El webhook llega con el id de la sesión de checkout de Stripe. */
    Optional<Transaction> findByGatewaySessionId(String gatewaySessionId);

    /** "Mis compras" / "Mis ventas": el usuario es comprador o productor. */
    List<Transaction> findByBuyerIdOrProducerIdOrderByCreatedAtDesc(UUID buyerId, UUID producerId);
}
