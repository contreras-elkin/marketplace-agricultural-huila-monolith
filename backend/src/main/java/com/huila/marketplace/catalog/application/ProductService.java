package com.huila.marketplace.catalog.application;

import com.huila.marketplace.catalog.ProductCategory;
import com.huila.marketplace.catalog.ProductStatus;
import com.huila.marketplace.catalog.ProductUnit;
import com.huila.marketplace.catalog.domain.Product;
import com.huila.marketplace.catalog.infrastructure.PhotoStorage;
import com.huila.marketplace.catalog.infrastructure.ProductRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Casos de uso del catálogo. Las mutaciones exigen que el productor
 * autenticado sea el dueño del producto (403 si no); el borrado es lógico.
 * Los errores de negocio se lanzan como {@link ResponseStatusException}
 * directo, sin jerarquía propia (architecture.md §5).
 */
@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final PhotoStorage photoStorage;

    public ProductService(ProductRepository productRepository, PhotoStorage photoStorage) {
        this.productRepository = productRepository;
        this.photoStorage = photoStorage;
    }

    // --- Productor -----------------------------------------------------------

    public Product create(
            UUID producerId,
            String name,
            ProductCategory category,
            ProductUnit unit,
            BigDecimal quantity,
            BigDecimal price,
            String municipality) {
        Product product = new Product(producerId, name, category, unit, quantity, price, municipality);
        return productRepository.save(product);
    }

    public Product update(
            UUID productId,
            UUID requesterId,
            String name,
            ProductCategory category,
            ProductUnit unit,
            BigDecimal quantity,
            BigDecimal price,
            String municipality) {
        Product product = ownedProduct(productId, requesterId);
        product.applyDetails(name, category, unit, quantity, price, municipality);
        return productRepository.save(product);
    }

    public Product changeStatus(UUID productId, UUID requesterId, ProductStatus status) {
        Product product = ownedProduct(productId, requesterId);
        product.changeStatus(status);
        return productRepository.save(product);
    }

    public Product attachPhoto(UUID productId, UUID requesterId, MultipartFile file) {
        Product product = ownedProduct(productId, requesterId);
        product.attachPhoto(photoStorage.store(file));
        return productRepository.save(product);
    }

    public void delete(UUID productId, UUID requesterId) {
        Product product = ownedProduct(productId, requesterId);
        product.markDeleted();
        productRepository.save(product);
    }

    public List<Product> listOwnedBy(UUID producerId) {
        return productRepository.findByProducerIdAndDeletedAtIsNullOrderByCreatedAtDesc(producerId);
    }

    // --- Comprador / público ----------------------------------------------

    /** Detalle de un producto no borrado (incluye {@code SOLD_OUT}). */
    public Product getVisible(UUID productId) {
        return productRepository
                .findByIdAndDeletedAtIsNull(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
    }

    /** Catálogo del comprador: solo {@code ACTIVE}, filtro por categoría y/o municipio (ambos opcionales). */
    public List<Product> browse(ProductCategory category, String municipality) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));
            predicates.add(cb.equal(root.get("status"), ProductStatus.ACTIVE));
            if (category != null) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (municipality != null && !municipality.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("municipality")), municipality.strip().toLowerCase()));
            }
            query.orderBy(cb.desc(root.get("createdAt")));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return productRepository.findAll(spec);
    }

    // --- interno ---------------------------------------------------------

    private Product ownedProduct(UUID productId, UUID requesterId) {
        Product product = getVisible(productId);
        if (!product.isOwnedBy(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El producto pertenece a otro productor");
        }
        return product;
    }
}
