package com.huila.marketplace.catalog.web;

import com.huila.marketplace.catalog.ProductCategory;
import com.huila.marketplace.catalog.ProductStatus;
import com.huila.marketplace.catalog.ProductUnit;
import com.huila.marketplace.catalog.domain.Product;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Representación completa de un producto. Se usa en el panel del productor
 * (crear/editar/listar "míos") y en la grilla del catálogo del comprador.
 * {@code photoUrl} es una ruta relativa al backend ({@code /media/…}); el
 * frontend la antepone con su base URL.
 */
public record ProductResponse(
        UUID id,
        UUID producerId,
        String name,
        ProductCategory category,
        ProductUnit unit,
        BigDecimal quantity,
        BigDecimal price,
        String municipality,
        ProductStatus status,
        String photoUrl,
        Instant createdAt,
        Instant updatedAt) {

    public static ProductResponse from(Product p) {
        return new ProductResponse(
                p.getId(),
                p.getProducerId(),
                p.getName(),
                p.getCategory(),
                p.getUnit(),
                p.getQuantity(),
                p.getPrice(),
                p.getMunicipality(),
                p.getStatus(),
                p.getPhotoUrl(),
                p.getCreatedAt(),
                p.getUpdatedAt());
    }
}
