# Estado actual — Marketplace Agrícola Huila (monolito, fase 1)

> Documento **vivo**. Refleja qué existe hoy en el repo; se actualiza al cerrar cada épica
> (ritual en [`CLAUDE.md`](../../CLAUDE.md) §Flujo de trabajo). No es un handoff congelado:
> si algo aquí contradice el código, gana el código y hay que corregir este archivo.
> Para el *porqué* de cada decisión, ver [`backlog.md`](../backlog.md) y [`architecture.md`](../architecture.md).
>
> **Última actualización:** 2026-09-01 · **Épica en curso:** 4 — Transacciones (sin código todavía)

## Progreso por épica

| Épica | Estado | Commit |
|---|---|---|
| 0 — Scaffold | ✅ completa | commiteada |
| 1 — Auth/Usuarios (RF1, RF2) | ✅ completa, verificada end-to-end | commiteada (`f34c0a7`) |
| 2 — Catálogo (RF3, RF4) | ✅ completa, verificada end-to-end | commiteada (`144eb6e`) |
| 3 — Chat (RF5, RF6) | ✅ completa, verificada end-to-end | **sin commitear (working tree)** |
| 4 — Transacciones (RF7, RF8) | ⬅️ siguiente — sin código | — |
| 5 — Notificaciones (RF9) | pendiente | — |

⚠️ **Toda la Épica 3 está en el working tree sin commitear:** módulo `chat/` completo,
`db/migration/chat/V302__create_chat_tables.sql`, `chat/{api,types,ws}.ts` y páginas de chat
en el frontend, y cambios en `pom.xml` (dependencia `spring-boot-starter-websocket`),
`SecurityConfig` (`/ws/**` en `permitAll`), `AuthContext.tsx`, `api/client.ts`, `App.tsx`,
`ProductDetailPage.tsx`, `frontend/package.json`. Pendiente de commit por épica.

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
  `app.jwt.secret`. `@EnableMethodSecurity` activo. Bean `JwtDecoder` reutilizado por el chat
  para validar el JWT del frame STOMP `CONNECT`. `permitAll()` actual: preflight, `/health`,
  `/api/auth/register`, `/api/auth/login`, `/media/**`, `/ws/**` (handshake WebSocket del chat;
  la auth real es el `CONNECT`), `GET /api/catalog/products` y `GET /api/catalog/products/*`
  — con `GET /api/catalog/products/mine` forzado a `authenticated()` **antes** del comodín.
  Resto: `anyRequest().authenticated()`.
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

### `chat/` — completo (Épica 3). Consume `catalog` y `auth`; lo consumirá `transactions`.

- Contrato público (paquete raíz):
  - `ChatModuleApi.getAgreedPurchase(UUID conversationId) : AgreedPurchase` — lanza
    `ResponseStatusException` 404 si la conversación no existe.
  - `AgreedPurchase(UUID conversationId, UUID productId, UUID buyerId, UUID producerId,
    AgreedPurchaseMethod method)` — mínimo; `method == null` = sin acordar. `transactions`
    (Épica 4) re-consulta precio/cantidad a `CatalogModuleApi`, no se congelan acá.
  - `AgreedPurchaseMethod {PLATFORM, OFF_PLATFORM}`, enum `EnumType.STRING`.
  - `NuevoMensajeChat(UUID conversationId, UUID messageId, UUID senderId, UUID recipientId)` —
    evento de dominio; se publica al persistir cada mensaje, **sin listener** hasta Épica 5.
- `domain/{Conversation, Message}` — id UUID en el constructor (no `@GeneratedValue`);
  `*_id` como UUID sueltos (sin FK cross-schema); `Instant`/`TIMESTAMPTZ`. `Conversation`
  tiene `agree()`, `hasParticipant()`, `otherParticipant()`.
- `infrastructure/{ConversationRepository, MessageRepository}` (`JpaRepository`;
  `findByProductIdAndBuyerId`, `findByBuyerIdOrProducerId`,
  `findByConversationIdOrderBySentAtAsc`, `findFirstByConversationIdOrderBySentAtDesc`).
- `application/{ConversationService, ChatModuleApiImpl}` — `ConversationService` valida el
  producto vía `CatalogModuleApi` (nunca contra el schema de catalog); toda operación sobre
  una conversación exige que el usuario sea el `buyerId` **o** el `producerId` (403 si no);
  `postMessage` es `@Transactional` y publica `NuevoMensajeChat` en la misma transacción.
  `ChatModuleApiImpl` va directo al repo, igual patrón que `CatalogModuleApiImpl`.
- `web/`:
  - `ChatController` (`/api/chat`) — mezcla rol y "solo las dos partes":
    - `POST /conversations` — `hasRole('BUYER')`, body `{productId}`; valida producto vía
      `CatalogModuleApi`; idempotente (**201** si crea, **200** si ya existía);
      rechaza `buyer == producer` (400).
    - `GET /conversations` — autenticado; lista donde el user es buyer o producer, con nombre
      de la contraparte (vía `AuthModuleApi`) y del producto (vía `CatalogModuleApi`), ordenada
      por actividad reciente.
    - `GET /conversations/{id}` — autenticado, solo las 2 partes (403).
    - `GET /conversations/{id}/messages` — idem; historial por `sent_at` asc, sin paginación.
    - `PUT /conversations/{id}/purchase-method` — idem; body `{method}`; last-write-wins.
  - `ChatMessagingController` — `@MessageMapping("/conversations/{id}/messages")`; persiste el
    mensaje y lo reemite a `/topic/conversations/{id}`. **Único** camino para crear mensajes
    (el REST de historial es solo lectura).
  - `WebSocketConfig` — `@EnableWebSocketMessageBroker`; endpoint `/ws` con
    `setAllowedOrigins(app.cors.allowed-origin)` (sin SockJS); broker simple en memoria
    (`/topic`), prefijo de app `/app`.
  - `StompAuthChannelInterceptor` — sobre el canal entrante: en `CONNECT` valida el header
    `Authorization: Bearer` con el `JwtDecoder` de `shared` y fija el `Principal`; en
    `SUBSCRIBE`/`SEND` a un destino de conversación exige ser participante. Fallo →
    `MessagingException` (frame ERROR).
- Migración `V302__create_chat_tables.sql` — `chat.conversations` (`UNIQUE (product_id, buyer_id)`,
  índices por `buyer_id` y `producer_id`) + `chat.messages` (índice `(conversation_id, sent_at)`).

### `transactions/`, `notifications/`

Solo `db/migration/<mod>/V{4,5}01__create_schema.sql` (create schema vacío). Sin código Java.
`transactions` nace en Épica 4; su primera migración de tablas es `V402` (rango reservado `V4xx`).

## Frontend — qué existe

- `api/client.ts` — wrapper `fetch`: `apiGet/apiPost/apiPut/apiDelete` (token opcional),
  `apiUpload` (multipart, deja el `Content-Type` al browser), `mediaUrl(path)` (antepone
  `VITE_API_BASE_URL` a rutas `/media/...`), `wsUrl(path='/ws')` (deriva `ws://…` de la base
  HTTP). Todas lanzan `ApiError`. Un 401 en una llamada **con** token dispara el evento
  `window` `auth:expired`.
- `auth/AuthContext.tsx` — **JWT persistido en `localStorage`** (Épica 3). Al montar rehidrata
  decodificando el payload del token (`sub`/`name`/`role`/`exp`; descarta si venció); escucha
  `auth:expired` para limpiar sesión. La firma la sigue validando el backend.
- `auth/{api.ts, types.ts}`, `catalog/{api.ts, types.ts}`, `chat/{api.ts, types.ts, ws.ts}`
  (`ws.ts` = fábrica del `Client` STOMP con `@stomp/stompjs`: `Authorization` en `connectHeaders`,
  `reconnectDelay: 5000`, `send()`/`close()`).
- `components/ProtectedRoute.tsx` — redirige a `/login` sin sesión, o fuera de la ruta si el
  `role` no coincide (`role` opcional).
- `pages/`: `RegisterPage`, `LoginPage`, `FarmProfilePage` (Épica 1); `CatalogPage`
  (`/catalogo`, pública), `ProductDetailPage` (`/productos/:id`, pública — **botón "Chatear"
  activo para `BUYER` con producto `ACTIVE` y ajeno → `POST /api/chat/conversations` y navega
  a `/chat/:id`**), `MyProductsPage` (`/mis-productos`, `role="PRODUCER"`), `ProductFormPage`;
  `ConversationsPage` (`/chat`, `ProtectedRoute` sin `role`) y `ConversationPage`
  (`/chat/:conversationId`, idem) — Épica 3. `ConversationPage`: carga detalle + historial por
  REST, abre el socket, mensajes en vivo, recarga el historial al reconectar, selector de
  forma de compra.
- `App.tsx` define `<Routes>` (incluye `/chat` y `/chat/:conversationId`); `Home` muestra
  `/health`, estado de sesión y links (incl. "Mis conversaciones" para cualquier sesión).
  `main.tsx` = `BrowserRouter` + `AuthProvider`. `package.json` suma `@stomp/stompjs`.
  `.env`: `VITE_API_BASE_URL=http://localhost:8080`.

## Datos y migraciones

Postgres 16 (Docker Compose), 5 schemas, Flyway en `backend/src/main/resources/db/migration/<mod>/`.
**Historial Flyway único combinado** → rangos reservados: `auth` V1xx · `catalog` V2xx ·
`chat` V3xx · `transactions` V4xx · `notifications` V5xx. Aplicadas hoy: `V101`–`V103`, `V201`,
`V202`, `V301`, `V302`, `V401`, `V501`. `create-schemas: false` (cada módulo crea su schema en
su `V{n}01`). `spring.jpa.hibernate.ddl-auto: validate` → las entidades JPA nuevas deben calzar
EXACTO con la migración (tipos, largo de varchar para enums, `TIMESTAMPTZ` para `Instant`).
Multipart 5 MB. `app.uploads.dir = ./uploads` (gitignored).

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
`/mis-productos` → el comprador navega `/catalogo`, abre `/productos/:id`, toca **"Chatear"** y
en `/chat/:id` intercambia mensajes en vivo con el productor (otra sesión) y fija la forma de
compra. El productor ve la conversación en `/chat`.

## Gotchas vigentes

- **JWT en `localStorage`** (desde Épica 3): la sesión sobrevive al refresh, pero el token
  puede estar vencido al recargar → la primera llamada da 401 → `auth:expired` limpia la
  sesión y `ProtectedRoute` manda a `/login`.
- **Probar el chat con 2 usuarios**: `localStorage` se comparte entre pestañas del mismo
  origen, así que una 2da sesión pisa el token de la 1ra al recargar. Para 2 usuarios reales
  usar 2 navegadores o perfiles distintos (o no recargar la pestaña de la 1ra sesión).
- **Flyway out-of-order**: agregar una migración a un rango bajo (`V302`) sobre una BD que ya
  tiene aplicadas migraciones de rangos altos (`V401`, `V501`) rompe la validación al arrancar.
  Resetear con `docker compose down -v && docker compose up -d`.
- `mvn spring-boot:run` forkea una JVM: matar solo el proceso Maven deja el backend escuchando
  en 8080. Matar por puerto.
- La shell de Windows mangla acentos en `curl -d '...'`. Para payloads con tildes, usar
  `--data-binary @archivo.json`. Desde el navegador (fetch) el UTF-8 va bien.
- `GET` a rutas con slash final sobrante (`/api/catalog/products/`) cae en el catch-all → 500
  (`NoResourceFoundException` no está mapeada). Pre-existente, no se tocó.
- `ddl-auto: validate`: si una entidad nueva no calza con su migración, el backend no arranca.
