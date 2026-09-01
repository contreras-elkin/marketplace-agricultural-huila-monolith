package com.huila.marketplace.transactions.web;

import com.huila.marketplace.transactions.application.TransactionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Recibe los eventos de Stripe. Va en {@code permitAll()} porque Stripe no manda
 * JWT: la autenticación es la firma HMAC del header {@code Stripe-Signature},
 * verificada contra {@code app.stripe.webhook-secret} sobre el body crudo. El
 * body se recibe como {@code String} sin parsear para no alterar los bytes que
 * entran en el cálculo de la firma. Idempotencia y traducción del evento viven
 * en {@link TransactionService}.
 */
@RestController
@RequestMapping("/api/transactions/webhook")
public class StripeWebhookController {

    private final TransactionService service;

    public StripeWebhookController(TransactionService service) {
        this.service = service;
    }

    @PostMapping("/stripe")
    public ResponseEntity<Void> stripe(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        if (signature == null || signature.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta el header Stripe-Signature");
        }
        service.handleWebhook(payload, signature);
        return ResponseEntity.ok().build();
    }
}
