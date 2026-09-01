package com.huila.marketplace.catalog.infrastructure;

import com.huila.marketplace.catalog.domain.Product;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * Repositorio del schema {@code catalog}. El filtro del catálogo (categoría +
 * municipio, ambos opcionales) se arma con {@link JpaSpecificationExecutor}
 * en {@code ProductService} en vez de multiplicar métodos derivados por cada
 * combinación de filtros.
 */
public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

    Optional<Product> findByIdAndDeletedAtIsNull(UUID id);

    List<Product> findByProducerIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID producerId);
}
