Estás trabajando en el repositorio marketplace-agricultural-huila-monolith
(ruta: D:\ELKIN\Universidad\Materias2026-b\distribuidos\repositorios\marketplace-agricultural-huila-monolith),
un monolito modular en Java + Spring Boot que es la fase 1 de una migración
Strangler Fig hacia la arquitectura de microservicios que define el PDR del proyecto.

Antes de hacer nada, lee completos estos documentos:
1. PDR: D:\ELKIN\Universidad\Materias2026-b\distribuidos\documentacion_proyecto\PDR.md
2. docs/architecture.md (en este repo) — estructura del monolito, layout de
   carpetas, reglas de comunicación entre módulos, §5 (auth/autorización/errores)
   y las notas "Estado real (post Épica 2)". Es la convención a reutilizar.
3. docs/backlog.md — Épicas 0, 1 y 2 están marcadas ✅ con las decisiones
   reales tomadas. La Épica 2 tiene una sección larga de "Decisiones tomadas"
   que conviene leer porque varias aplican también a Chat.
4. docs/claude/handoff-epica-2.md — el handoff anterior (histórico; sus
   decisiones abiertas ya están resueltas y registradas en el backlog).

Revisá también la memoria de proyecto para esta ruta (layout del repo,
arquitectura del monolito con progreso real, y cómo prefiere trabajar el
usuario: explicar las decisiones técnicas importantes DESPUÉS de implementarlas,
junto con el cambio — concepto + porqué + alternativa descartada; no como paso
de aprobación separado).

## Reglas fijas, sin excepción

- Ningún módulo (auth, catalog, chat, transactions, notifications) accede
  directamente al repositorio/entidades/schema de otro módulo. Toda
  comunicación entre módulos es vía la interfaz pública `XModuleApi`
  (síncrona, llamada a método) o vía eventos de dominio con
  `ApplicationEventPublisher` + `@TransactionalEventListener` (asíncrona).
  Lo hace cumplir `ArchitectureTests` (spring-modulith) por estructura de
  paquetes: Modulith trata el paquete raíz de cada módulo (`auth`, `catalog`,
  `chat`, …) como su API y `domain/application/infrastructure/web` como
  internos. `catalog` ya depende de `auth.AuthModuleApi` y el test pasa —
  ese es el patrón a seguir para `chat → catalog`.
- No introducir patrones no acordados para esta fase: nada de hexagonal
  completo, CQRS, event sourcing, saga, circuit breaker ni API gateway.
- Backlog por dependencia real: Épica 0 (scaffold ✅) → 1 (Auth ✅) →
  2 (Catálogo ✅) → **3 (Chat) ← ACÁ ESTAMOS** → 4 (Transacciones) →
  5 (Notificaciones). Cada épica trae su porción de frontend en React.
- Stack fase 1: todo Java/Spring Boot en un solo deployable, todo PostgreSQL
  con un schema por módulo (incluido `chat` — **sin MongoDB en fase 1**; la
  decisión Go/Mongo del PDR aplica recién cuando chat se extraiga a
  microservicio), frontend React (Vite). El panel admin en Angular queda
  para después y no bloquea nada.

## Estado real del proyecto (Épicas 0, 1 y 2 completadas y verificadas)

### Layout
`backend/` (Spring Boot) y `frontend/` (React) son carpetas hermanas en la
raíz, con `docker-compose.yml` (Postgres 16 + RabbitMQ 3-management) también
en la raíz. Un solo proyecto Maven (no multi-módulo). Java 21, Spring Boot
4.1.1, `groupId=com.huila`, `artifactId=marketplace`, paquete raíz
`com.huila.marketplace`.

### Backend — qué existe hoy

**`shared/`** (kernel transversal, sin lógica de negocio):
- `config/CorsConfig` — bean `CorsConfigurationSource` (no `WebMvcConfigurer`;
  el preflight lo resuelve la cadena de Spring Security).
- `config/MediaResourceConfig` — `WebMvcConfigurer` que sirve la carpeta
  `app.uploads.dir` en `/media/**` (para las fotos de producto de Épica 2).
- `security/SecurityConfig` — Spring Security OAuth2 Resource Server, HS256
  clave simétrica `app.jwt.secret`. `@EnableMethodSecurity` activo.
  Lista actual de `permitAll()`: preflight, `/health`,
  `/api/auth/register`, `/api/auth/login`, `/media/**`,
  `GET /api/catalog/products` y `GET /api/catalog/products/*`
  (con `GET /api/catalog/products/mine` forzado a `authenticated()` ANTES
  del comodín). Todo lo demás: `anyRequest().authenticated()`.
- `web/GlobalExceptionHandler` — único lugar donde se traducen excepciones a
  `ApiError`. Mapea: `ResponseStatusException` → status real,
  `MethodArgumentNotValidException` (`@Valid`) → 400,
  `MethodArgumentTypeMismatchException` (UUID/enum mal formado) → 400,
  `AccessDeniedException` (`@PreAuthorize`) → 403,
  `MaxUploadSizeExceededException` → 413, `Exception` → 500.
  Para errores de negocio nuevos: lanzar `ResponseStatusException` directo
  desde `application/` (no hay jerarquía de excepciones propia).
- `web/{ApiError, HealthController}`.

**`auth/`** (completo, Épica 1):
- Público: `AuthModuleApi`, `Role` (`PRODUCER`/`BUYER`), `UserSummary(id, name, email, role)`.
- `AuthModuleApi.getUserSummary(UUID) : UserSummary` (lanza 404 si no existe)
  e `isProducer(UUID) : boolean`. **`chat` va a usar `getUserSummary` para
  mostrar el nombre del otro participante en la conversación** (igual que
  `catalog` lo usa para el nombre del productor en el detalle).
- `domain/{User, FarmProfile}`, `application/{RegisterUserService,
  LoginService, FarmProfileService, AuthModuleApiImpl, LoginResult}`,
  `infrastructure/{UserRepository, FarmProfileRepository}`,
  `web/{AuthController, FarmProfileController, +DTOs}`.
- Migraciones `V101`–`V103` en `db/migration/auth/`.

**`catalog/`** (completo, Épica 2) — **esto es lo que `chat` va a consumir**:
- Paquete raíz (contrato público):
  - `CatalogModuleApi.getProductSummary(UUID productId) : ProductSummary`
    — lanza `ResponseStatusException` 404 si el producto no existe o fue
    borrado (lógicamente).
  - `ProductSummary(UUID id, String name, UUID producerId,
    ProductStatus status, BigDecimal price, ProductUnit unit)` — es
    deliberadamente mínimo: se diseñó pensando justo en lo que Chat
    (Épica 3) y Transacciones (Épica 4) iban a necesitar. `producerId` es
    a quién Chat le abre la conversación; `status` para decidir si se
    habilita chatear; `price`/`unit` los usará Transacciones.
  - `ProductStatus { ACTIVE, SOLD_OUT }`, `ProductCategory` (10 valores),
    `ProductUnit` (10 valores) — enums mapeados `EnumType.STRING`.
- `domain/Product` — id UUID generado en el constructor (no `@GeneratedValue`);
  `deleted_at` (borrado lógico, se filtra en TODAS las queries y en la
  ModuleApi); `price`/`quantity` como `BigDecimal` / `NUMERIC(12,2)`;
  `created_at`/`updated_at` como `Instant` / `TIMESTAMPTZ`.
- `infrastructure/ProductRepository` (`JpaRepository` + `JpaSpecificationExecutor`
  para el filtro del catálogo), `infrastructure/PhotoStorage` (guarda fotos
  en disco local, whitelist JPG/PNG/WebP, 5 MB).
- `application/{ProductService, CatalogModuleApiImpl}` — el `ModuleApiImpl`
  va directo al repositorio (no pasa por `ProductService`, que modela casos
  de uso con autorización que no aplican entre módulos), igual que
  `AuthModuleApiImpl`.
- `web/ProductController` + DTOs (`ProductRequest`, `ProductStatusRequest`,
  `ProductResponse`, `ProductDetailResponse`). Endpoints:
  - `GET /api/catalog/products[?category=&municipality=]` — público, solo
    `ACTIVE`, filtro por municipio case-insensitive.
  - `GET /api/catalog/products/{id}` — público, devuelve
    `{ product: ProductResponse, producerName: String }` (el nombre lo
    resuelve `catalog` vía `AuthModuleApi`).
  - `GET /api/catalog/products/mine` — `hasRole('PRODUCER')`.
  - `POST /api/catalog/products` — `hasRole('PRODUCER')`, `producerId` del JWT.
  - `PUT /api/catalog/products/{id}` — `hasRole('PRODUCER')` + chequeo de
    propiedad (403 si es de otro productor).
  - `PUT /api/catalog/products/{id}/status` — idem, toggle activo/agotado.
  - `POST /api/catalog/products/{id}/photo` — idem, multipart `file`.
  - `DELETE /api/catalog/products/{id}` — idem, borrado lógico, 204.
  - `@PreAuthorize` va POR MÉTODO (no a nivel de clase como
    `FarmProfileController`) porque el controller mezcla rutas públicas y
    protegidas.
- Migración `V202__create_products_table.sql` en `db/migration/catalog/`.

**`chat/`, `transactions/`, `notifications/`**: solo tienen su
`V{3,4,5}01__create_schema.sql` (create schema vacío). **`chat` nace en
esta épica.** Su primera migración de tablas es `V302__...sql`
(rango reservado `V3xx`; Flyway combina las 5 carpetas en un solo historial,
por eso los rangos).

### Auth / JWT — contrato a reutilizar (detalle en architecture.md §5)

El propio backend emite y valida JWT (HS256, `app.jwt.secret`). Claims:
`sub` (userId UUID), `role` (`PRODUCER`/`BUYER`), `name`, `iss`, `iat`, `exp`
(60 min). Para endpoints REST nuevos en `chat/`:
- Público → sumar a `permitAll()` en `SecurityConfig`. Protegido → es el
  default, nada que hacer.
- Usuario autenticado en un controller → `@AuthenticationPrincipal Jwt jwt` +
  `UUID.fromString(jwt.getSubject())`.
- Restringir por rol → `@PreAuthorize("hasRole('BUYER')")` /
  `hasRole('PRODUCER')` usando el claim del propio JWT.
- **WebSocket es el caso nuevo**: el handshake y/o los frames STOMP no pasan
  por la cadena HTTP normal. Hay que decidir cómo viaja y se valida el token
  ahí (ver "Decisiones a resolver").

### Frontend — qué existe hoy

React 19 + Vite + TypeScript, `react-router-dom` v7.
- `api/client.ts` — wrapper fetch: `apiGet/apiPost/apiPut/apiDelete`
  (token opcional), `apiUpload` (multipart, deja que el browser ponga el
  Content-Type), `mediaUrl(path)` (antepone `VITE_API_BASE_URL` a rutas
  `/media/...`). Todas lanzan `ApiError` con `status`/`message`.
- `auth/AuthContext.tsx` — **guarda el JWT SOLO en memoria (estado de React).
  Se pierde la sesión al recargar la página.** La persistencia
  (localStorage / refresh token) sigue deferida desde Épica 1. **OJO para
  Épica 3**: si el chat depende de una conexión WebSocket autenticada y el
  usuario recarga, se cae la sesión Y el socket. Puede que esta épica sea el
  momento de resolver la persistencia — evaluarlo con el usuario (ver
  "Decisiones a resolver").
- `components/ProtectedRoute.tsx` — redirige a `/login` sin sesión, o fuera
  de la ruta si el rol no coincide (prop `role` opcional).
- `pages/`: `RegisterPage`, `LoginPage`, `FarmProfilePage` (Épica 1);
  `CatalogPage` (`/catalogo`, pública), `ProductDetailPage`
  (`/productos/:id`, pública — **acá está el botón "Chatear con el
  productor" hoy deshabilitado; es el punto de entrada de Épica 3**),
  `MyProductsPage` (`/mis-productos`, `ProtectedRoute role="PRODUCER"`),
  `ProductFormPage` (`/mis-productos/nuevo` y `/mis-productos/:id/editar`).
- `catalog/{api.ts, types.ts}` — llamadas y tipos del catálogo, con
  `CATEGORY_LABELS`/`UNIT_LABELS` (enum SCREAMING_SNAKE → etiqueta legible).
  Convención: cada épica agrega su `<modulo>/{api,types}.ts` y sus `pages/`.
- `App.tsx` — define las `<Routes>`; `Home` muestra `/health`, estado de
  sesión, y links a "Ver catálogo" / "Mis productos" (si productor).
- `main.tsx` — `BrowserRouter` + `AuthProvider` envolviendo `<App/>`.
- `.env` tiene `VITE_API_BASE_URL=http://localhost:8080`.

### Datos
Postgres 16 vía Docker Compose, 5 schemas, migraciones Flyway en
`backend/src/main/resources/db/migration/<modulo>/`, rangos reservados
(`auth` V1xx, `catalog` V2xx, `chat` V3xx, `transactions` V4xx,
`notifications` V5xx). `create-schemas: false`, cada módulo crea su schema
en su `V{n}01`. `spring.jpa.hibernate.ddl-auto: validate` → las entidades
JPA nuevas deben calzar EXACTO con la tabla de la migración (tipos, longitud
de varchar para enums, `TIMESTAMPTZ` para `Instant`). Multipart configurado
(5 MB). `app.uploads.dir` = `./uploads` (gitignored).

### ArchitectureTests
`backend/src/test/java/com/huila/marketplace/ArchitectureTests.java` con
`ApplicationModules.of(MarketplaceApplication.class).verify()`. Corre en
`mvn test`. Hoy verifica los límites entre `auth` y `catalog`; sumará `chat`
automáticamente cuando exista el paquete. Es el único test del proyecto (no
hay tests unitarios de auth/catalog — la verificación es ArchitectureTests +
prueba end-to-end en navegador/curl, que es el criterio de salida de cada
épica).

## Cómo correr todo

1. Infra (raíz): `docker compose up -d` (Postgres 5432, RabbitMQ 5672/15672).
   Si tenés otros contenedores en 5432/8080 dan conflicto de puerto.
2. Backend: `cd backend && mvn spring-boot:run` → http://localhost:8080
   (probar `/health`). Tests: `mvn test`.
   OJO: `spring-boot:run` forkea una JVM; para matarlo hay que matar el
   proceso Java que escucha en 8080 (no alcanza con matar el proceso Maven).
3. Frontend: `cd frontend`, primera vez `npm install`, luego `npm run dev`
   → http://localhost:5173. Typecheck/lint: `npx tsc -b`, `npm run lint`.

Flujo de prueba manual: registrar productor y comprador en `/register`,
login en `/login`, el productor publica productos en `/mis-productos`, el
comprador (o un visitante sin sesión) navega `/catalogo` y abre
`/productos/:id`.

## Qué sigue: Épica 3 — Chat (RF5, RF6)

Ver detalle en docs/backlog.md. Resumen:

**Backend** (nace el paquete `chat/`):
1. Abrir conversación asociada a un producto entre comprador y productor.
   Usa `CatalogModuleApi.getProductSummary(productId)` para validar que el
   producto existe y de dónde sacar el `producerId`. El `buyerId` sale del
   JWT del comprador.
2. Mensajería en tiempo real vía WebSocket.
3. Historial de mensajes por conversación (REST).
4. Registrar el acuerdo de forma de compra dentro del chat: "por plataforma"
   o "por fuera" (un campo/estado simple en la conversación; no automatiza
   nada, solo registra la elección de las partes — el PDR lo dice explícito).
5. `ChatModuleApi`: expone lo que `transactions` necesitará en Épica 4
   (ej. `getAgreedPurchase(conversationId)`).

**Frontend:**
1. Botón "chatear" desde `ProductDetailPage` que abre/crea la conversación
   (hoy ese botón existe deshabilitado con texto placeholder).
2. Ventana de chat con conexión WebSocket real (mensajes en vivo, no
   polling). Es el punto donde más vale validar temprano: reconexión, cómo
   viaja el JWT en el handshake, orden de mensajes.
3. Selector de forma de compra ("por plataforma" / "por fuera") dentro del
   chat.

**Criterio de salida:** comprador y productor chatean en tiempo real desde
la UI sobre un producto y dejan registrada la forma de compra elegida.

## Decisiones a resolver antes de codear

No escribas código de las partes no triviales hasta alinear esto con el
usuario (mismo procedimiento que en Épica 2: recomendación + porqué +
alternativa, y que el usuario elija).

1. **Transporte WebSocket: STOMP vs WebSocket "crudo".**
   - STOMP (`spring-boot-starter-websocket` + broker simple en memoria,
     cliente `@stomp/stompjs` en el front): da topics pub/sub
     (`/topic/conversations/{id}`), destinos de envío (`/app/...`),
     y un cliente estándar con reconexión. Es la respuesta típica de Spring.
     Cuesta una dependencia de front y algo de config de broker.
   - WebSocket nativo (`WebSocketHandler` + `HandshakeInterceptor`): más
     liviano, pero hay que rutear/serializar a mano y manejar la lista de
     sesiones por conversación.
   Recomendación tentativa: STOMP con broker en memoria (no RabbitMQ como
   relay todavía — eso es post-extracción). Confirmar.

2. **Cómo viaja y se valida el JWT en el WebSocket.**
   - Nunca en query param (`?token=`) — va contra las reglas de seguridad
     (nada sensible en URL).
   - Con STOMP: header nativo `Authorization: Bearer <jwt>` en el frame
     `CONNECT`, validado con un `ChannelInterceptor` sobre el canal inbound
     que reusa el `JwtDecoder` ya existente y setea el `Principal`.
   - Con WS nativo: token en el primer mensaje post-connect, o en el
     subprotocolo (`Sec-WebSocket-Protocol`).
   Recomendación tentativa: header `Authorization` en el `CONNECT` de STOMP,
   reusando el `JwtDecoder` bean de `SecurityConfig`. Confirmar.

3. **Persistencia del JWT en el frontend (deferida desde Épica 1).**
   El chat vive de una sesión estable; con el token solo en memoria, un
   refresh mata sesión + socket. ¿Se resuelve ahora (localStorage del token,
   o refresh token) o se sigue difiriendo y el chat asume "si recargás,
   volvés a loguear"? Definir con el usuario ANTES de diseñar la ventana de
   chat.

4. **Identidad y unicidad de la conversación.**
   ¿Una conversación única por `(productId, buyerId)` (se reusa si el
   comprador vuelve a "chatear" el mismo producto)? ¿Solo el comprador
   inicia y el productor solo responde (RF5 lo sugiere)? Recomendación:
   sí a ambas, con constraint único `(product_id, buyer_id)`. Confirmar.

5. **Modelo de datos `chat` (schema `chat`, migración `V302`).**
   `Conversation` (id, product_id, buyer_id, producer_id, created_at,
   agreed_purchase_method nullable, …) + `Message` (id, conversation_id,
   sender_id, body, sent_at). Sin FK cross-schema (`product_id`/`*_id` son
   UUID sueltos). Confirmar campos, y si el historial REST necesita
   paginación (recomendación: no para MVP, ordenar por `sent_at`).

6. **"Forma de compra" — enum y quién la setea.**
   `AgreedPurchaseMethod { PLATFORM, OFF_PLATFORM }` (nullable = sin acordar).
   ¿Cualquiera de las dos partes la fija y last-write-wins (sin máquina de
   estados de negociación, como pide el backlog)? Recomendación: sí.
   Endpoint REST dedicado (`PUT /api/chat/conversations/{id}/purchase-method`)
   o mensaje especial por WS. Confirmar.

7. **`ChatModuleApi` — forma del contrato.**
   `getAgreedPurchase(conversationId)` para Épica 4: ¿qué devuelve?
   (conversationId, productId, buyerId, producerId, method, ¿precio/cantidad
   al momento del acuerdo o transactions lo re-consulta a catalog?).
   Igual que con `ProductSummary`: diseñar mínimo, confirmar la forma antes
   de implementar.

8. **Evento `NuevoMensajeChat` (lo consume Épica 5).**
   ¿Se publica ya en esta épica con `ApplicationEventPublisher` aunque no
   haya listener todavía (así Épica 5 es puro consumidor), o se difiere?
   Recomendación: publicarlo ya. Confirmar.

9. **Autorización sobre una conversación.**
   Solo el `buyerId` y el `producerId` de esa conversación pueden leer el
   historial y postear mensajes (patrón de "dueño" como en catalog, pero con
   dos partes permitidas). Aplica tanto al endpoint REST de historial como
   al handler de mensajes WS.

10. **CORS para el WebSocket.** El `CorsConfigurationSource` actual cubre
    HTTP. El endpoint de handshake WS (`/ws` o similar) necesita su propio
    `setAllowedOrigins`/`setAllowedOriginPatterns` en la config de
    WebSocket. Sumar `http://localhost:5173`.

## Gotchas descubiertos en la sesión de Épica 2

- **JWT solo en memoria**: cualquier navegación con recarga completa de
  página pierde la sesión. Al probar en navegador, moverse por links del
  SPA (client-side routing), no recargando. Ver decisión 3 arriba.
- `mvn spring-boot:run` forkea una JVM: matar solo el proceso Maven deja el
  backend escichando en 8080. Matar por puerto.
- La shell de Windows mangla acentos/no-ASCII en `curl -d '...'`. Para
  payloads con tildes, usar archivo + `--data-binary @archivo.json`. Desde
  el navegador (fetch) el UTF-8 va bien.
- Rutas desconocidas / con slash final sobrante (ej.
  `GET /api/catalog/products/`) caen en el handler catch-all → 500
  (`NoResourceFoundException` no está mapeada específicamente). Es
  comportamiento pre-existente, no se tocó. Si molesta en Épica 3, se puede
  sumar un handler 404 en `GlobalExceptionHandler`.
- `ddl-auto: validate`: si una entidad nueva no calza con la migración, el
  backend no arranca. Revisar longitudes de varchar para columnas de enum y
  `TIMESTAMPTZ` para `Instant`.

## Archivos creados/modificados en Épica 2 (referencia rápida)

Nuevos (backend): `catalog/` completo (15 archivos),
`shared/config/MediaResourceConfig.java`,
`db/migration/catalog/V202__create_products_table.sql`.
Modificados (backend): `shared/security/SecurityConfig.java`,
`shared/web/GlobalExceptionHandler.java`, `application.yml`, `.gitignore`.
Nuevos (frontend): `catalog/{api,types}.ts`,
`pages/{CatalogPage,ProductDetailPage,MyProductsPage,ProductFormPage}.tsx`.
Modificados (frontend): `api/client.ts`, `App.tsx`.
Docs: `docs/backlog.md`, `docs/architecture.md` actualizados.
Sin commit — el working tree tiene los cambios de Épica 2 sin comitear.

Empezá confirmando que leíste el estado actual y esperá el ok del usuario
(y las respuestas a las decisiones de arriba) para arrancar la Épica 3.
