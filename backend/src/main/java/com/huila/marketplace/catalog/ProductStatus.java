package com.huila.marketplace.catalog;

/**
 * Estado de publicación de un producto. {@code ACTIVE} aparece en el catálogo
 * del comprador; {@code SOLD_OUT} se sigue viendo en la vista de detalle (por
 * si comparten el enlace) pero no en la grilla ni habilita el chat.
 * El borrado es lógico y no vive acá — ver {@code Product.deletedAt}.
 */
public enum ProductStatus {
    ACTIVE,
    SOLD_OUT
}
