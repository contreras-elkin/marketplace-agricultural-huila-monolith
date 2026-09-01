package com.huila.marketplace.catalog.web;

import com.huila.marketplace.catalog.ProductStatus;
import jakarta.validation.constraints.NotNull;

/** Cuerpo del toggle activo/agotado del panel del productor. */
public record ProductStatusRequest(@NotNull ProductStatus status) {
}
