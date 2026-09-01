package com.huila.marketplace.catalog;

/**
 * Categorías admitidas para un producto del catálogo. Enum cerrado (no texto
 * libre) para que el filtro del comprador por categoría sea fiable y el
 * desplegable del frontend sea trivial. Ajustar esta lista es un cambio de
 * código deliberado, no un dato de configuración.
 */
public enum ProductCategory {
    FRUTAS,
    VERDURAS,
    HORTALIZAS,
    TUBERCULOS,
    GRANOS_Y_CEREALES,
    CAFE,
    CACAO,
    LACTEOS,
    HIERBAS_AROMATICAS,
    OTROS
}
