package com.huila.marketplace.transactions.application;

import com.huila.marketplace.transactions.domain.Transaction;
import com.stripe.Stripe;
import com.stripe.exception.EventDataObjectDeserializationException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Implementación de {@link PaymentGateway} con Stripe en test mode y Checkout
 * alojado (Decisión 1 del spec). {@code Stripe.apiKey} se setea una sola vez al
 * arrancar; con el placeholder de {@code application.yml} el contexto levanta
 * igual y solo fallan las llamadas reales (que solo ocurren en runtime, no en
 * {@code mvn test}).
 *
 * <p>COP es moneda de dos decimales en Stripe → el monto se envía en centavos
 * ({@code amount × 100}).
 */
@Component
public class StripePaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentGateway.class);
    private static final BigDecimal MINOR_UNIT_FACTOR = BigDecimal.valueOf(100);

    private final String secretKey;
    private final String webhookSecret;
    private final String currency;

    public StripePaymentGateway(
            @Value("${app.stripe.secret-key}") String secretKey,
            @Value("${app.stripe.webhook-secret}") String webhookSecret,
            @Value("${app.transactions.currency}") String currency) {
        this.secretKey = secretKey;
        this.webhookSecret = webhookSecret;
        this.currency = currency;
    }

    @PostConstruct
    void configureApiKey() {
        Stripe.apiKey = secretKey;
    }

    @Override
    public CheckoutSession createCheckout(
            Transaction txn, String productName, String successUrl, String cancelUrl) {
        long unitAmount = txn.getAmount()
                .multiply(MINOR_UNIT_FACTOR)
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .setClientReferenceId(txn.getId().toString())
                .putMetadata("transactionId", txn.getId().toString())
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency(currency.toLowerCase())
                                .setUnitAmount(unitAmount)
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(productName)
                                        .build())
                                .build())
                        .build())
                .build();

        try {
            Session session = Session.create(params);
            return new CheckoutSession(session.getId(), session.getUrl());
        } catch (StripeException e) {
            log.error("Stripe rechazó la creación de la sesión de checkout para la transacción {}", txn.getId(), e);
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "No se pudo iniciar el pago con la pasarela");
        }
    }

    @Override
    public GatewayEvent parseWebhook(String payload, String signatureHeader) {
        Event event;
        try {
            event = Webhook.constructEvent(payload, signatureHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Firma de webhook inválida");
        }

        Session session = extractSession(event);
        if (session == null) {
            return GatewayEvent.ignored();
        }

        return switch (event.getType()) {
            case "checkout.session.completed", "checkout.session.async_payment_succeeded" ->
                "paid".equals(session.getPaymentStatus())
                        ? new GatewayEvent(
                                GatewayEvent.Type.CHECKOUT_COMPLETED, session.getId(), session.getPaymentIntent())
                        : GatewayEvent.ignored();
            case "checkout.session.expired" ->
                new GatewayEvent(GatewayEvent.Type.CHECKOUT_EXPIRED, session.getId(), null);
            default -> GatewayEvent.ignored();
        };
    }

    /**
     * El deserializador tipado puede quedar corto si la versión de API del evento
     * no coincide con la que fija el SDK; en ese caso se cae a {@code deserializeUnsafe()}
     * (patrón documentado por Stripe).
     */
    private Session extractSession(Event event) {
        StripeObject obj = event.getDataObjectDeserializer().getObject().orElse(null);
        if (obj == null) {
            try {
                obj = event.getDataObjectDeserializer().deserializeUnsafe();
            } catch (EventDataObjectDeserializationException e) {
                log.warn("No se pudo deserializar el objeto del evento {} ({})", event.getId(), event.getType());
                return null;
            }
        }
        return obj instanceof Session session ? session : null;
    }
}
