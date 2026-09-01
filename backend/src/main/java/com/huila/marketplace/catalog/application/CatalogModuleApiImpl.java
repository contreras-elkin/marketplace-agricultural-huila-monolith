package com.huila.marketplace.catalog.application;

import com.huila.marketplace.catalog.CatalogModuleApi;
import com.huila.marketplace.catalog.ProductSummary;
import com.huila.marketplace.catalog.infrastructure.ProductRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Implementación del contrato público de catalog. Va directo al repositorio
 * (mismo módulo) igual que {@code auth.AuthModuleApiImpl}, sin pasar por
 * {@code ProductService} — este último modela casos de uso con autorización
 * de por medio que no aplican a una llamada entre módulos.
 */
@Service
public class CatalogModuleApiImpl implements CatalogModuleApi {

    private final ProductRepository productRepository;

    public CatalogModuleApiImpl(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public ProductSummary getProductSummary(UUID productId) {
        return productRepository
                .findByIdAndDeletedAtIsNull(productId)
                .map(p -> new ProductSummary(
                        p.getId(), p.getName(), p.getProducerId(), p.getStatus(), p.getPrice(), p.getUnit()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
    }
}
