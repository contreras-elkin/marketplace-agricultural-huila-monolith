package com.huila.marketplace.chat.application;

import com.huila.marketplace.chat.AgreedPurchase;
import com.huila.marketplace.chat.ChatModuleApi;
import com.huila.marketplace.chat.infrastructure.ConversationRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Implementación del contrato público de chat. Va directo al repositorio (mismo
 * módulo), sin pasar por {@link ConversationService} — este último modela casos
 * de uso con autorización de las dos partes que no aplican a una llamada entre
 * módulos. Mismo patrón que {@code catalog.CatalogModuleApiImpl}.
 */
@Service
public class ChatModuleApiImpl implements ChatModuleApi {

    private final ConversationRepository conversationRepository;

    public ChatModuleApiImpl(ConversationRepository conversationRepository) {
        this.conversationRepository = conversationRepository;
    }

    @Override
    public AgreedPurchase getAgreedPurchase(UUID conversationId) {
        return conversationRepository
                .findById(conversationId)
                .map(c -> new AgreedPurchase(
                        c.getId(), c.getProductId(), c.getBuyerId(), c.getProducerId(), c.getAgreedPurchaseMethod()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversación no encontrada"));
    }
}
