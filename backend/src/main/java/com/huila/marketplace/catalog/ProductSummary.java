package com.huila.marketplace.catalog;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Vista reducida de un producto que el módulo catalog expone al resto del
 * monolito. Deliberadamente mínima (mismo criterio que {@code auth.UserSummary}):
 * solo lo que otros módulos necesitan hoy —
 * <ul>
 *   <li>{@code id} + {@code producerId}: chat (Épica 3) valida el producto y
 *       sabe a quién abrirle la conversación;</li>
 *   <li>{@code price} + {@code unit}: transactions (Épica 4);</li>
 *   <li>{@code status}: decidir si se habilita chatear/comprar.</li>
 * </ul>
 * Categoría, municipio, foto y cantidad son presentación y viajan por el
 * endpoint REST público de detalle, no por esta API.
 */
public record ProductSummary(
        UUID id, String name, UUID producerId, ProductStatus status, BigDecimal price, ProductUnit unit) {
}
