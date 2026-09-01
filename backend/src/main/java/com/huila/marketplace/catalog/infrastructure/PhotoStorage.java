package com.huila.marketplace.catalog.infrastructure;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Guardado de fotos en disco local — el "pipeline de medios" acotado del MVP
 * (backlog Épica 2). Sin thumbnails, sin CDN, sin blob store. El archivo se
 * escribe en {@code app.uploads.dir} con nombre {@code UUID.ext} (evita
 * colisiones y path traversal) y se devuelve la ruta pública {@code /media/…}
 * que sirve {@code shared/config/MediaResourceConfig}.
 *
 * <p>Al extraer catalog como microservicio (Strangler Fig) el disco local no
 * viaja: se reemplaza esta clase por un cliente de blob store y la URL sigue
 * siendo la misma abstracción para el resto del sistema.
 */
@Component
public class PhotoStorage {

    private static final Map<String, String> EXTENSION_BY_TYPE =
            Map.of("image/jpeg", ".jpg", "image/png", ".png", "image/webp", ".webp");
    private static final Set<String> ALLOWED_TYPES = EXTENSION_BY_TYPE.keySet();

    private final Path root;

    public PhotoStorage(@Value("${app.uploads.dir}") String uploadsDir) {
        this.root = Path.of(uploadsDir).toAbsolutePath().normalize();
    }

    /** @return ruta pública servible, ej. {@code /media/3f2a....jpg} */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se recibió ninguna imagen");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Formato no admitido: use JPG, PNG o WebP");
        }
        String filename = UUID.randomUUID() + EXTENSION_BY_TYPE.get(contentType);
        try {
            Files.createDirectories(root);
            file.transferTo(root.resolve(filename));
        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar la imagen", e);
        }
        return "/media/" + filename;
    }
}
