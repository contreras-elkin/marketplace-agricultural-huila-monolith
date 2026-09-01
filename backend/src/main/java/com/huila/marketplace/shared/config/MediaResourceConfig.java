package com.huila.marketplace.shared.config;

import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Sirve como estáticos los archivos subidos a {@code app.uploads.dir} bajo la
 * ruta {@code /media/**} (que SecurityConfig deja pública). Es un
 * {@code WebMvcConfigurer} — no reemplaza la autoconfiguración MVC de Spring
 * Boot, solo suma un resource handler. Vive en {@code shared} por cohesión con
 * el resto de la config web/seguridad, aunque hoy solo lo use catalog.
 */
@Configuration
public class MediaResourceConfig implements WebMvcConfigurer {

    private final String location;

    public MediaResourceConfig(@Value("${app.uploads.dir}") String uploadsDir) {
        // URI con esquema file: y barra final para que Spring resuelva recursos dentro de la carpeta
        // (si la carpeta aún no existe, toUri() no agrega la barra: se fuerza acá para evitar el WARN de arranque).
        String uri = Path.of(uploadsDir).toAbsolutePath().normalize().toUri().toString();
        this.location = uri.endsWith("/") ? uri : uri + "/";
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/media/**").addResourceLocations(location);
    }
}
