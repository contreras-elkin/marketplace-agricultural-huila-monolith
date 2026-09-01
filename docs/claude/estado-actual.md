# Estado actual — Marketplace Agrícola Huila (monolito, fase 1)

> Documento **vivo**. Refleja qué existe hoy en el repo; se actualiza al cerrar cada épica
> (ritual en [`CLAUDE.md`](../../CLAUDE.md) §Flujo de trabajo). No es un handoff congelado:
> si algo aquí contradice el código, gana el código y hay que corregir este archivo.
> Para el *porqué* de cada decisión, ver [`backlog.md`](../backlog.md) y [`architecture.md`](../architecture.md).
>
> **Última actualización:** 2026-08-31 · **Épica en curso:** 3 — Chat (sin código todavía)

## Progreso por épica

| Épica | Estado | Commit |
|---|---|---|
| 0 — Scaffold | ✅ completa | commiteada |
| 1 — Auth/Usuarios (RF1, RF2) | ✅ completa, verificada end-to-end | commiteada (`f34c0a7`) |
| 2 — Catálogo (RF3, RF4) | ✅ completa, verificada end-to-end | **sin commitear (working tree)** |
| 3 — Chat (RF5, RF6) | ⬅️ siguiente — sin código | — |
| 4 — Transacciones (RF7, RF8) | pendiente | — |
| 5 — Notificaciones (RF9) | pendiente | — |

⚠️ **`git log` HEAD = `f34c0a7` (solo Auth).** Toda la Épica 2 está en el working tree sin
commitear: módulo `catalog/` completo, `shared/config/MediaResourceConfig.java`,
`db/migration/catalog/V202__…sql`, páginas de frontend de catálogo, y cambios en
`SecurityConfig`, `GlobalExceptionHandler`, `application.yml`, `App.tsx`, `api/client.ts`,
`.gitignore`. Nada perdido — pendiente de commit por épica.

## Stack y layout

- `backend/` (Spring Boot) y `frontend/` (React+Vite) son carpetas hermanas; `docker-compose.yml`
  (Postgres 16 + RabbitMQ 3-management) en la raíz.
- Backend: **un solo** proyecto Maven, Java 21, Spring Boot 4.1.1, `groupId=com.huila`,
  `artifactId=marketplace`, paquete raíz `com.huila.marketplace`. Paquete por módulo +
  `shared/`. spring-modulith 2.1.1.
- Frontend: React 19, `react-router-dom` v7, TypeScript, oxlint. Cliente HTTP propio (sin Axios).

## Backend — qué existe

### `shared/` (kernel transversal, sin lógica de negocio)

- `config/CorsConfig` — bean `CorsConfigurationSource` (no `WebMvcConfigurer`; el preflight
  lo resuelve la cadena de Spring Security). Origen permitido: `http://localhost:5173`.
- `config/MediaResourceConfig` — `WebMvcConfigurer` que sirve `app.uploads.dir` en `/media/**`
  (fotos de producto de Épica 2).
- `security/SecurityConfig` — Spring Security OAuth2 Resource Server, HS256 con clave simétrica
  `app.jwt.secret`. `@EnableMethodSecurity` activo. `permitAll()` actual: preflight, `/health`,
  `/api/auth/register`, `/api/auth/login`, `/media/**`, `GET /api/catalog/products` y
  `GET /api/catalog/products/*` — con `GET /api/catalog/products/mine` forzado a
  `authenticated()` **antes** del comodín. Resto: `anyRequest().authenticated()`.
- `web/GlobalExceptionHandler` — único lugar que traduce excepciones a `ApiError`. Mapea:
  `ResponseStatusException`→status real, `MethodArgumentNotValidException` (`@Valid`)→400,
  `MethodArgumentTypeMismatchException` (UUID/enum mal formado)→400,
  `AccessDeniedException` (`@PreAuthorize`)→403, `MaxUploadSizeExceededException`→413,
  `Exception`→500. Para errores de negocio nuevos: lanzar `ResponseStatusException` desde
  `application/` (no hay jerarquía de excepciones propia).
- `web/{ApiError, HealthController}`.

### `auth/` — completo (Épica 1)

- Contrato público: `AuthModuleApi`, `Role` (`PRODUCER`/`BUYER`),
  `UserSummary(id, name, email, role)`.
- `AuthModuleApi.getUserSummary(UUID) : UserSummary` (404 si no existe), `isProducer(UUID) : boolean`.
- `domain/{User, FarmProfile}`, `application/{RegisterUserService, LoginService,
  FarmProfileService, AuthModuleApiImpl, LoginResult}`, `infrastructure/{UserRepository,
  FarmProfileRepository}`, `web/{AuthController, FarmProfileController, +DTOs}`.
- Migraciones `V101`–`V103`.
- JWT: claims `sub` (userId UUID), `role`, `name`, `iss`, `iat`, `exp` (60 min).

### `catalog/` — completo (Épica 2). Es lo que `chat` va a consumir.

- Contrato público (paquete raíz):
  - `CatalogModuleApi.getProductSummary(UUID productId) : ProductSummary` — lanza
    `ResponseStatusException` 404 si el producto no existe o fue borrado lógicamente.
  - `ProductSummary(UUID id, String name, UUID producerId, ProductStatus status,
    BigDecimal price, ProductUnit unit)` — deliberadamente mínimo: `producerId` es a quién
    Chat abre la conversación; `status` para decidir si se habilita chatear; `price`/`unit`
    los usará Transacciones.
  - `ProductStatus {ACTIVE, SOLD_OUT}`, `ProductCategory` (10 valores), `ProductUnit` (10),
    enums `EnumType.STRING`.
- `domain/Product` — id UUID generado en el constructor (no `@GeneratedValue`); `deleted_at`
  (borrado lógico, filtrado en TODAS las queries y en la ModuleApi); `price`/`quantity`
  `BigDecimal`/`NUMERIC(12,2)`; `created_at`/`updated_at` `Instant`/`TIMESTAMPTZ`.
- `infrastructure/ProductRepository` (`JpaRepository` + `JpaSpecificationExecutor` para el
  filtro; `findByIdAndDeletedAtIsNull`, `findByProducerIdAndDeletedAtIsNullOrderByCreatedAtDesc`),
  `infrastructure/PhotoStorage` (disco local, whitelist JPG/PNG/WebP, 5 MB).
- `application/{ProductService, CatalogModuleApiImpl}` — el `ModuleApiImpl` va directo al
  repositorio (no pasa por `ProductService`, que modela casos de uso con autorización que no
  aplican entre módulos), igual patrón que `AuthModuleApiImpl`.
- `web/ProductController` + DTOs. Endpoints (`@PreAuthorize` por método, el controller mezcla
  público y protegido):
  - `GET /api/catalog/products[?category=&municipality=]` — público, solo `ACTIVE`, municipio case-insensitive.
  - `GET /api/catalog/products/{id}` — público, devuelve `{product: ProductResponse, producerName}` (nombre vía `AuthModuleApi`).
  - `GET /api/catalog/products/mine` — `hasRole('PRODUCER')`.
  - `POST /api/catalog/products` — `hasRole('PRODUCER')`, `producerId` del JWT, 201.
  - `PUT /api/catalog/products/{id}` — `hasRole('PRODUCER')` + chequeo de propiedad (403 entre productores).
  - `PUT /api/catalog/products/{id}/status` — idem, toggle `ACTIVE`/`SOLD_OUT`.
  - `POST /api/catalog/products/{id}/photo` — idem, multipart campo `file`.
  - `DELETE /api/catalog/products/{id}` — idem, borrado lógico, 204.
- Migración `V202__create_products_table.sql` (+ dos índices parciales: por `producer_id`
  WHERE `deleted_at IS NULL`; por `(category, municipality)` WHERE `deleted_at IS NULL AND status='ACTIVE'`).

### `chat/`, `transactions/`, `notifications/`

Solo `db/migration/<mod>/V{3,4,5}01__create_schema.sql` (create schema vacío). Sin código Java.
`chat` nace en Épica 3; su primera migración de tablas es `V302` (rango reservado `V3xx`).

## Frontend — qué existe

- `api/client.ts` — wrapper `fetch`: `apiGet/apiPost/apiPut/apiDelete` (token opcional),
  `apiUpload` (multipart, deja el `Content-Type` al browser), `mediaUrl(path)` (antepone
  `VITE_API_BASE_URL` a rutas `/media/...`). Todas lanzan `ApiError` con `status`/`message`.
- `auth/AuthContext.tsx` — **JWT solo en memoria (estado de React). Se pierde al recargar.**
  Persistencia (localStorage / refresh token) deferida desde Épica 1.
- `auth/{api.ts, types.ts}`, `catalog/{api.ts, types.ts}` (`CATEGORY_LABELS`/`UNIT_LABELS`,
  `*_OPTIONS`; tipos `Product`, `ProductDetail`, `ProductInput`).
- `components/ProtectedRoute.tsx` — redirige a `/login` sin sesión, o fuera de la ruta si el
  `role` no coincide.
- `pages/`: `RegisterPage`, `LoginPage`, `FarmProfilePage` (Épica 1); `CatalogPage`
  (`/catalogo`, pública), `ProductDetailPage` (`/productos/:id`, pública — **tiene el botón
  "Chatear" hoy deshabilitado, punto de entrada de Épica 3**), `MyProductsPage`
  (`/mis-productos`, `role="PRODUCER"`), `ProductFormPage` (`/mis-productos/nuevo` y
  `/mis-productos/:id/editar`).
- `App.tsx` define `<Routes>`; `Home` muestra `/health`, estado de sesión y links.
  `main.tsx` = `BrowserRouter` + `AuthProvider`. `.env`: `VITE_API_BASE_URL=http://localhost:8080`.

## Datos y migraciones

Postgres 16 (Docker Compose), 5 schemas, Flyway en `backend/src/main/resources/db/migration/<mod>/`.
**Historial Flyway único combinado** → rangos reservados: `auth` V1xx · `catalog` V2xx ·
`chat` V3xx · `transactions` V4xx · `notifications` V5xx. `create-schemas: false` (cada módulo
crea su schema en su `V{n}01`). `spring.jpa.hibernate.ddl-auto: validate` → las entidades JPA
nuevas deben calzar EXACTO con la migración (tipos, largo de varchar para enums, `TIMESTAMPTZ`
para `Instant`). Multipart 5 MB. `app.uploads.dir = ./uploads` (gitignored).

## Tests

`backend/src/test/java/com/huila/marketplace/ArchitectureTests.java` con
`ApplicationModules.of(MarketplaceApplication.class).verify()`. Corre en `mvn test`. Es el
**único test** del proyecto: no hay tests unitarios de módulos — la verificación de cada épica
es ArchitectureTests + prueba end-to-end en navegador/curl (el "Criterio de salida" del backlog).

## Cómo correr y probar

```bash
docker compose up -d                               # infra (raíz)
docker compose down -v && docker compose up -d     # resetear BD desde cero
cd backend && mvn spring-boot:run                  # backend → :8080 (/health)
cd backend && mvn test                             # ArchitectureTests
cd frontend && npm install && npm run dev          # frontend → :5173
```

Puertos: Postgres 5432 · RabbitMQ 5672 / 15672 · backend 8080 · frontend 5173.
Flujo manual: registrar productor y comprador en `/register` → login → el productor publica en
`/mis-productos` → el comprador (o visitante sin sesión) navega `/catalogo` y abre `/productos/:id`.

## Gotchas vigentes

- **JWT solo en memoria**: cualquier recarga completa de página pierde la sesión. Al probar en
  navegador, moverse por links del SPA, no recargando.
- `mvn spring-boot:run` forkea una JVM: matar solo el proceso Maven deja el backend escuchando
  en 8080. Matar por puerto.
- La shell de Windows mangla acentos en `curl -d '...'`. Para payloads con tildes, usar
  `--data-binary @archivo.json`. Desde el navegador (fetch) el UTF-8 va bien.
- `GET` a rutas con slash final sobrante (`/api/catalog/products/`) cae en el catch-all → 500
  (`NoResourceFoundException` no está mapeada). Pre-existente, no se tocó.
- `ddl-auto: validate`: si una entidad nueva no calza con su migración, el backend no arranca.
