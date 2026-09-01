package com.huila.marketplace.catalog.web;

import com.huila.marketplace.catalog.ProductCategory;
import com.huila.marketplace.catalog.ProductUnit;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Cuerpo para crear y editar un producto. {@code status} y {@code photoUrl} no
 * viajan acá: el estado se cambia por {@code PUT /{id}/status} y la foto se
 * sube por {@code POST /{id}/photo}. {@code @Digits(10,2)} refleja el
 * {@code NUMERIC(12,2)} de la tabla.
 */
public record ProductRequest(
        @NotBlank @Size(max = 150) String name,
        @NotNull ProductCategory category,
        @NotNull ProductUnit unit,
        @NotNull @PositiveOrZero @Digits(integer = 10, fraction = 2) BigDecimal quantity,
        @NotNull @Positive @Digits(integer = 10, fraction = 2) BigDecimal price,
        @NotBlank @Size(max = 100) String municipality) {
}
