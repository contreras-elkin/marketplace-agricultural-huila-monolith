package com.huila.marketplace.chat.web;

import com.huila.marketplace.chat.application.ConversationService;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

/**
 * Autenticación y autorización del canal STOMP entrante — el handshake HTTP no
 * lleva el token, así que la seguridad se resuelve por frame:
 *
 * <ul>
 *   <li><b>CONNECT</b>: valida el header {@code Authorization: Bearer <jwt>}
 *       reusando el {@link JwtDecoder} de {@code shared/security} (misma
 *       validación HS256 que el REST) y fija el {@code Principal} = {@code sub}.</li>
 *   <li><b>SUBSCRIBE / SEND</b> a un destino de conversación: verifica que ese
 *       usuario sea una de las dos partes (mismo criterio que el REST).</li>
 * </ul>
 *
 * Cualquier fallo lanza {@link MessagingException}: el broker responde con un
 * frame ERROR y corta. No se introduce una jerarquía de excepciones propia
 * (architecture.md §5).
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern CONVERSATION_IN_DESTINATION =
            Pattern.compile("/conversations/([0-9a-fA-F-]{36})");

    private final JwtDecoder jwtDecoder;
    private final ConversationService conversations;

    public StompAuthChannelInterceptor(JwtDecoder jwtDecoder, ConversationService conversations) {
        this.jwtDecoder = jwtDecoder;
        this.conversations = conversations;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        switch (accessor.getCommand()) {
            case CONNECT -> authenticate(accessor);
            case SUBSCRIBE, SEND -> authorizeDestination(accessor);
            default -> {
                // STOMP interno (UNSUBSCRIBE, DISCONNECT, heartbeats): nada que validar.
            }
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new MessagingException("Falta el token en el CONNECT");
        }
        try {
            Jwt jwt = jwtDecoder.decode(header.substring("Bearer ".length()));
            String role = jwt.getClaimAsString("role");
            List<GrantedAuthority> authorities =
                    role == null ? List.of() : List.of(new SimpleGrantedAuthority("ROLE_" + role));
            accessor.setUser(new UsernamePasswordAuthenticationToken(jwt.getSubject(), null, authorities));
        } catch (JwtException ex) {
            throw new MessagingException("Token inválido o expirado");
        }
    }

    private void authorizeDestination(StompHeaderAccessor accessor) {
        if (accessor.getUser() == null) {
            throw new MessagingException("No autenticado");
        }
        UUID conversationId = conversationIdOf(accessor.getDestination());
        if (conversationId == null) {
            return;
        }
        UUID userId = UUID.fromString(accessor.getUser().getName());
        if (!conversations.isParticipant(conversationId, userId)) {
            throw new MessagingException("No participás de esta conversación");
        }
    }

    /** Extrae el UUID de destinos como {@code /topic/conversations/{id}} o {@code /app/conversations/{id}/messages}. */
    private static UUID conversationIdOf(String destination) {
        if (destination == null) {
            return null;
        }
        Matcher matcher = CONVERSATION_IN_DESTINATION.matcher(destination);
        return matcher.find() ? UUID.fromString(matcher.group(1)) : null;
    }
}
