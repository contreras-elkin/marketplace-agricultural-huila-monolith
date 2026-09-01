package com.huila.marketplace.chat.infrastructure;

import com.huila.marketplace.chat.domain.Conversation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repositorio del schema {@code chat}. */
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    /** La conversación única de un comprador sobre un producto (constraint {@code uq_conversation_product_buyer}). */
    Optional<Conversation> findByProductIdAndBuyerId(UUID productId, UUID buyerId);

    /** "Mis conversaciones": el usuario puede ser el comprador o el productor. */
    List<Conversation> findByBuyerIdOrProducerId(UUID buyerId, UUID producerId);
}
