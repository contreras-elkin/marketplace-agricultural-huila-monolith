package com.huila.marketplace.chat.infrastructure;

import com.huila.marketplace.chat.domain.Message;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repositorio del schema {@code chat}. */
public interface MessageRepository extends JpaRepository<Message, UUID> {

    /** Historial completo de una conversación en orden cronológico (sin paginación en el MVP). */
    List<Message> findByConversationIdOrderBySentAtAsc(UUID conversationId);

    /** Último mensaje de una conversación — para ordenar "mis conversaciones" por actividad reciente. */
    Optional<Message> findFirstByConversationIdOrderBySentAtDesc(UUID conversationId);
}
