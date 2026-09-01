package com.huila.marketplace.catalog.web;

import com.huila.marketplace.auth.AuthModuleApi;
import com.huila.marketplace.catalog.ProductCategory;
import com.huila.marketplace.catalog.application.ProductService;
import com.huila.marketplace.catalog.domain.Product;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Endpoints del catálogo. Mezcla rutas públicas (navegar/ver, en el
 * {@code permitAll()} de SecurityConfig) y de productor
 * ({@code @PreAuthorize("hasRole('PRODUCER')")}), por eso la autorización va
 * por método y no a nivel de clase como en {@code FarmProfileController}.
 * El {@code userId} del productor sale del JWT, no del cuerpo.
 */
@RestController
@RequestMapping("/api/catalog/products")
public class ProductController {

    private final ProductService productService;
    private final AuthModuleApi authModuleApi;

    public ProductController(ProductService productService, AuthModuleApi authModuleApi) {
        this.productService = productService;
        this.authModuleApi = authModuleApi;
    }

    // --- Público ---------------------------------------------------------

    @GetMapping
    public List<ProductResponse> browse(
            @RequestParam(required = false) ProductCategory category,
            @RequestParam(required = false) String municipality) {
        return productService.browse(category, municipality).stream()
                .map(ProductResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public ProductDetailResponse detail(@PathVariable UUID id) {
        Product product = productService.getVisible(id);
        String producerName = authModuleApi.getUserSummary(product.getProducerId()).name();
        return ProductDetailResponse.from(product, producerName);
    }

    // --- Productor ------------------------------------------------------

    @GetMapping("/mine")
    @PreAuthorize("hasRole('PRODUCER')")
    public List<ProductResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        return productService.listOwnedBy(userId(jwt)).stream()
                .map(ProductResponse::from)
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('PRODUCER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ProductRequest request) {
        Product product = productService.create(
                userId(jwt),
                request.name(),
                request.category(),
                request.unit(),
                request.quantity(),
                request.price(),
                request.municipality());
        return ProductResponse.from(product);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PRODUCER')")
    public ProductResponse update(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody ProductRequest request) {
        Product product = productService.update(
                id,
                userId(jwt),
                request.name(),
                request.category(),
                request.unit(),
                request.quantity(),
                request.price(),
                request.municipality());
        return ProductResponse.from(product);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('PRODUCER')")
    public ProductResponse changeStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @Valid @RequestBody ProductStatusRequest request) {
        return ProductResponse.from(productService.changeStatus(id, userId(jwt), request.status()));
    }

    @PostMapping("/{id}/photo")
    @PreAuthorize("hasRole('PRODUCER')")
    public ProductResponse uploadPhoto(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestParam("file") MultipartFile file) {
        return ProductResponse.from(productService.attachPhoto(id, userId(jwt), file));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PRODUCER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        productService.delete(id, userId(jwt));
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
