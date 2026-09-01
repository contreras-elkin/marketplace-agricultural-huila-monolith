package com.huila.marketplace.catalog;

import java.util.UUID;

/**
 * Única puerta de entrada pública del módulo catalog para el resto del
 * monolito (ver architecture.md §3a). Hoy la consumirá chat (Épica 3) para
 * validar producto/productor al abrir una conversación, y transactions
 * (Épica 4) para el precio/unidad de la compra.
 */
public interface CatalogModuleApi {

    /**
     * @throws org.springframework.web.server.ResponseStatusException 404 si el
     *     producto no existe o fue borrado (lógicamente).
     */
    ProductSummary getProductSummary(UUID productId);
}
