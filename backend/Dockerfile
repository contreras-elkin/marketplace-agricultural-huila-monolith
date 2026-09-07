# syntax=docker/dockerfile:1

# ---- build ----
# No hay Maven wrapper (mvnw) en el repo, así que la etapa de build usa la imagen
# oficial de Maven con Temurin 21 (mismo java.version que el pom).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Capa de dependencias cacheable: solo se rehace si cambia el pom.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Código + empaquetado. Los tests (ArchitectureTests / spring-modulith) se corren
# aparte con `mvn test`, no dentro de la imagen.
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ---- runtime ----
FROM eclipse-temurin:21-jre
# curl solo para el HEALTHCHECK (docker-compose espera `service_healthy`).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /build/target/*.jar app.jar

# Carpeta de fotos de producto; docker-compose monta un volumen nombrado acá.
RUN mkdir -p /app/uploads
ENV UPLOADS_DIR=/app/uploads

EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=12 \
    CMD curl -fsS http://localhost:8080/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
