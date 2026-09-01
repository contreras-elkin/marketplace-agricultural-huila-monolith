package com.huila.marketplace.chat;

import java.util.UUID;

/**
 * Única puerta de entrada pública del módulo chat para el resto del monolito
 * (architecture.md §3a). Hoy la consumirá transactions (Épica 4) para saber, a
 * partir de una conversación, qué producto y qué partes intervienen y si se
 * acordó pagar por la plataforma.
 */
public interface ChatModuleApi {

    /**
     * @throws org.springframework.web.server.ResponseStatusException 404 si la
     *     conversación no existe.
     */
    AgreedPurchase getAgreedPurchase(UUID conversationId);
}
