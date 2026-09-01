package com.huila.marketplace.catalog.domain;

import com.huila.marketplace.catalog.ProductCategory;
import com.huila.marketplace.catalog.ProductStatus;
import com.huila.marketplace.catalog.ProductUnit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Producto publicado por un productor. El {@code producerId} es un UUID suelto
 * a propósito: no hay FK hacia {@code auth.users} porque un módulo nunca
 * referencia el schema de otro (architecture.md §3). El borrado es lógico
 * ({@code deletedAt}) para no dejar huérfanas las conversaciones/transacciones
 * que lo referencien en épicas siguientes.
 */
@Entity
@Table(name = "products", schema = "catalog")
public class Product {

    @Id
    private UUID id;

    @Column(name = "producer_id", nullable = false, updatable = false)
    private UUID producerId;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ProductCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductUnit unit;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal quantity;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false, length = 100)
    private String municipality;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductStatus status;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Product() {
        // JPA
    }

    public Product(
            UUID producerId,
            String name,
            ProductCategory category,
            ProductUnit unit,
            BigDecimal quantity,
            BigDecimal price,
            String municipality) {
        this.id = UUID.randomUUID();
        this.producerId = producerId;
        this.status = ProductStatus.ACTIVE;
        this.createdAt = Instant.now();
        applyDetails(name, category, unit, quantity, price, municipality);
    }

    public void applyDetails(
            String name,
            ProductCategory category,
            ProductUnit unit,
            BigDecimal quantity,
            BigDecimal price,
            String municipality) {
        this.name = name;
        this.category = category;
        this.unit = unit;
        this.quantity = quantity;
        this.price = price;
        this.municipality = municipality;
        touch();
    }

    public void changeStatus(ProductStatus newStatus) {
        this.status = newStatus;
        touch();
    }

    public void attachPhoto(String photoUrl) {
        this.photoUrl = photoUrl;
        touch();
    }

    public void markDeleted() {
        this.deletedAt = Instant.now();
        touch();
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public boolean isOwnedBy(UUID userId) {
        return producerId.equals(userId);
    }

    private void touch() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getProducerId() {
        return producerId;
    }

    public String getName() {
        return name;
    }

    public ProductCategory getCategory() {
        return category;
    }

    public ProductUnit getUnit() {
        return unit;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public String getMunicipality() {
        return municipality;
    }

    public ProductStatus getStatus() {
        return status;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }
}
