package com.huila.marketplace.transactions.application;

import com.huila.marketplace.transactions.domain.Transaction;

/**
 * Frontera con la pasarela de pago. Aísla el SDK externo (Stripe en fase 1) en
 * una sola implementación: al extraer transactions a microservicio, o al cambiar
 * de pasarela, solo cambia la clase que implementa esto — ni el service ni el
 * controller se enteran. Espejo de un futuro cliente HTTP hacia la pasarela.
 */
public interface PaymentGateway {

    /** Crea la sesión de checkout alojada y devuelve su id + la URL a la que redirigir al comprador. */
    CheckoutSession createCheckout(Transaction txn, String productName, String successUrl, String cancelUrl);

    /**
     * Verifica la firma del webhook y traduce el evento de la pasarela a un
     * {@link GatewayEvent} de dominio.
     *
     * @throws org.springframework.web.server.ResponseStatusException 400 si la firma no valida.
     */
    GatewayEvent parseWebhook(String payload, String signatureHeader);

    record CheckoutSession(String sessionId, String checkoutUrl) {}

    /**
     * Lo que a transactions le importa de un webhook: qué pasó y con qué sesión.
     * {@code IGNORED} cubre los tipos de evento que no nos interesan (respondemos 200 igual).
     */
    record GatewayEvent(Type type, String sessionId, String paymentIntentId) {
        public enum Type {
            CHECKOUT_COMPLETED,
            CHECKOUT_EXPIRED,
            IGNORED
        }

        public static GatewayEvent ignored() {
            return new GatewayEvent(Type.IGNORED, null, null);
        }
    }
}
