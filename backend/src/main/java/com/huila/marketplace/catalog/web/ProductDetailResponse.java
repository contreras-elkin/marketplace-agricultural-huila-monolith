package com.huila.marketplace.catalog.web;

import com.huila.marketplace.catalog.domain.Product;

/**
 * Detalle público de un producto: la representación completa más el nombre
 * del productor, que catalog resuelve vía {@code AuthModuleApi} (no hay
 * endpoint público para consultar un usuario cualquiera). Es el punto de
 * entrada al chat en la Épica 3.
 */
public record ProductDetailResponse(ProductResponse product, String producerName) {

    public static ProductDetailResponse from(Product p, String producerName) {
        return new ProductDetailResponse(ProductResponse.from(p), producerName);
    }
}
