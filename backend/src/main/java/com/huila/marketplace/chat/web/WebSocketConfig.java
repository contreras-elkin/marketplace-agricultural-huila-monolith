package com.huila.marketplace.chat.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket + STOMP para la mensajería en tiempo real del chat (RF5). Broker
 * simple en memoria (no RabbitMQ como relay todavía — eso es post-extracción).
 *
 * <ul>
 *   <li>Handshake en {@code /ws} (en el {@code permitAll()} de SecurityConfig:
 *       la autenticación real ocurre en el frame CONNECT, ver
 *       {@link StompAuthChannelInterceptor}).</li>
 *   <li>{@code setAllowedOrigins} propio: el {@code CorsConfigurationSource} de
 *       {@code shared} cubre HTTP, no el upgrade WebSocket.</li>
 *   <li>Sin SockJS: el cliente {@code @stomp/stompjs} usa el WebSocket nativo del
 *       navegador; el fallback no aporta en local.</li>
 * </ul>
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor authInterceptor;
    private final String allowedOrigin;

    public WebSocketConfig(
            StompAuthChannelInterceptor authInterceptor,
            @Value("${app.cors.allowed-origin}") String allowedOrigin) {
        this.authInterceptor = authInterceptor;
        this.allowedOrigin = allowedOrigin;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(allowedOrigin);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authInterceptor);
    }
}
