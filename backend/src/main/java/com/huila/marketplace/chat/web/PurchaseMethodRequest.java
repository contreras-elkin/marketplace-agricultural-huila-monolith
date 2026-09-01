package com.huila.marketplace.chat.web;

import com.huila.marketplace.chat.AgreedPurchaseMethod;
import jakarta.validation.constraints.NotNull;

/** Cuerpo de {@code PUT /api/chat/conversations/{id}/purchase-method}. */
public record PurchaseMethodRequest(@NotNull AgreedPurchaseMethod method) {
}
