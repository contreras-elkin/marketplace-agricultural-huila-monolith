package com.huila.marketplace.shared.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsUtils;

/**
 * Desde Épica 1: el monolito emite y valida sus propios JWT (HS256, clave
 * simétrica) vía Spring Security OAuth2 Resource Server — reemplaza el
 * filtro manual esqueleto de Épica 0. `/health` y los endpoints de
 * registro/login quedan públicos; desde Épica 2 también son públicos la
 * navegación del catálogo (`GET /api/catalog/products[/{id}]`) y las fotos
 * servidas en `/media/**`. Todo lo demás exige un JWT válido.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http, JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> {})
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(CorsUtils::isPreFlightRequest).permitAll()
                        .requestMatchers("/health", "/api/auth/register", "/api/auth/login").permitAll()
                        .requestMatchers("/media/**").permitAll()
                        // Handshake WebSocket del chat (Épica 3): el token no viaja en el
                        // upgrade HTTP sino en el frame STOMP CONNECT, que valida
                        // StompAuthChannelInterceptor.
                        .requestMatchers("/ws/**").permitAll()
                        // Webhook de Stripe (Épica 4): sin JWT (lo llama Stripe). La auth
                        // real es la firma HMAC del header Stripe-Signature, verificada en
                        // StripePaymentGateway. El resto de /api/transactions/** exige sesión.
                        .requestMatchers(HttpMethod.POST, "/api/transactions/webhook/stripe").permitAll()
                        // "/mine" antes que el comodín: navegar el catálogo es público,
                        // pero listar "mis productos" exige sesión de productor.
                        .requestMatchers(HttpMethod.GET, "/api/catalog/products/mine").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/catalog/products", "/api/catalog/products/*")
                        .permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.decoder(jwtDecoder())
                        .jwtAuthenticationConverter(jwtAuthenticationConverter)));
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtEncoder jwtEncoder() {
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey()));
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withSecretKey(secretKey()).macAlgorithm(MacAlgorithm.HS256).build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            String role = jwt.getClaimAsString("role");
            if (role == null) {
                return List.of();
            }
            GrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + role);
            return List.of(authority);
        });
        return converter;
    }

    private SecretKeySpec secretKey() {
        return new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }
}
