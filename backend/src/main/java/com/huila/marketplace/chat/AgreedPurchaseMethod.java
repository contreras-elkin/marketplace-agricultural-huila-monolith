package com.huila.marketplace.chat;

/**
 * Forma de compra que las partes acuerdan dentro del chat (RF6). {@code null}
 * (ausencia de valor) = todavía no se acordó nada. El sistema solo registra la
 * elección: no valida, no automatiza y no exige confirmación de ambas partes.
 */
public enum AgreedPurchaseMethod {

    /** Pago por la plataforma (dispara el flujo de Transacciones en Épica 4). */
    PLATFORM,

    /** Negociación por fuera (WhatsApp / número de cuenta compartidos en el chat). Sin seguimiento. */
    OFF_PLATFORM
}
