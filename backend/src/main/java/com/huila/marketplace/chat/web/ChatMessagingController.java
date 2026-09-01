package com.huila.marketplace.chat.web;

import com.huila.marketplace.chat.application.ConversationService;
import com.huila.marketplace.chat.domain.Message;
import java.security.Principal;
import java.util.UUID;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

/**
 * Punto de entrada WebSocket para enviar mensajes. El cliente hace
 * {@code SEND /app/conversations/{id}/messages}; el {@link Principal} lo puso
 * {@link StompAuthChannelInterceptor} al validar el JWT del frame CONNECT, y ese
 * mismo interceptor ya verificó que quien envía es parte de la conversación.
 * Se persiste el mensaje (y se publica {@code NuevoMensajeChat}) y se reemite a
 * {@code /topic/conversations/{id}}, que es a lo que están suscritas las dos partes.
 */
@Controller
public class ChatMessagingController {

    private final ConversationService conversations;
    private final SimpMessagingTemplate broker;

    public ChatMessagingController(ConversationService conversations, SimpMessagingTemplate broker) {
        this.conversations = conversations;
        this.broker = broker;
    }

    @MessageMapping("/conversations/{id}/messages")
    public void send(@DestinationVariable UUID id, SendMessagePayload payload, Principal principal) {
        UUID senderId = UUID.fromString(principal.getName());
        Message saved = conversations.postMessage(id, senderId, payload.body());
        broker.convertAndSend("/topic/conversations/" + id, MessageResponse.from(saved));
    }
}
