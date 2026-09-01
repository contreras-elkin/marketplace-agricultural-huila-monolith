Estás trabajando en el repositorio marketplace-agricultural-huila-monolith
(ruta: D:\ELKIN\Universidad\Materias2026-b\distribuidos\repositorios\marketplace-agricultural-huila-monolith),
un monolito modular en Java + Spring Boot que es la fase 1 de una migración
Strangler Fig hacia la arquitectura de microservicios que define el PDR del proyecto.

Antes de hacer nada, lee completos estos documentos:
1. PDR: D:\ELKIN\Universidad\Materias2026-b\distribuidos\documentacion_proyecto\PDR.md
2. docs/architecture.md (en este repo) — estructura del monolito, layout de
   carpetas (backend/ + frontend/), reglas de comunicación entre módulos, y
   la sección 5 (nueva, de Épica 1) sobre autenticación/autorización/manejo
   de errores — es la convención que tenés que reutilizar en Épica 2.
3. docs/backlog.md (en este repo) — backlog priorizado por épicas; Épica 0
   y Épica 1 ya están marcadas como completadas ahí, con las decisiones
   reales tomadas.

Revisá también la memoria de proyecto disponible para esta ruta antes de
responder (hay memorias guardadas sobre el layout del repo, la arquitectura
del monolito, y cómo prefiero que trabajemos juntos).

## Reglas fijas, sin excepción

- Ningún módulo (auth, catalog, chat, transactions, notifications) accede
  directamente al repositorio/entidades/schema de otro módulo. Toda
  comunicación entre módulos es vía la interfaz pública `XModuleApi`
  (síncrona) o vía eventos de dominio con ApplicationEventPublisher
  (asíncrona) — está detallado en architecture.md. En la práctica esa regla
  la hace cumplir `ArchitectureTests` (spring-modulith) por estructura de
  paquetes, no por `public`/paquete-privado de Java — ver architecture.md §2
  ("Regla de visibilidad") si hace falta el detalle.
- No introducir patrones no acordados para esta fase: nada de hexagonal
  completo, CQRS, event sourcing, saga, circuit breaker ni API gateway.
- Backlog ordenado por dependencia real: Épica 0 (scaffold, ✅) → 1 (Auth, ✅)
  → 2 (Catálogo) → 3 (Chat) → 4 (Transacciones) → 5 (Notificaciones). Cada
  épica trae su propia porción de frontend en React — no se deja todo para
  el final.
- Stack confirmado: todo en Java/Spring Boot en un solo deployable, todo en
  PostgreSQL con un schema por módulo, frontend en React (Vite). El panel
  admin en Angular queda para después y no bloquea nada.

## Cómo me gusta trabajar (importante)

Quiero ir aprendiendo mientras desarrollamos juntos — no expliques cada
detalle, pero sí las **decisiones técnicas importantes**. Formato acordado:
explicá la decisión **después** de implementarla, junto con el cambio (no
antes, no como paso de aprobación separado), cubriendo el concepto + el
porqué + qué otra alternativa se consideró y por qué se descartó. Si algo
queda ambiguo sobre cuánto profundizar, preguntame en vez de asumir.

No escribas código todavía si hay decisiones técnicas no triviales sin
resolver — para esas, alineemos el enfoque antes de implementar (ver
sección "Decisiones a resolver antes de codear" más abajo).

## Estado real del proyecto (Épica 0 y Épica 1 completadas)

- **Layout:** `backend/` (Spring Boot) y `frontend/` (React) son carpetas
  hermanas en la raíz del repo, con `docker-compose.yml` también en la raíz.
- **Backend:** Java 21 + Spring Boot 4.1.1 + Maven, `groupId=com.huila`,
  `artifactId=marketplace`, paquete raíz `com.huila.marketplace`. Contenido
  real hoy en `shared/` (`config/CorsConfig`, `security/SecurityConfig`,
  `web/{GlobalExceptionHandler, ApiError, HealthController}`) y en `auth/`
  completo (`AuthModuleApi`, `Role`, `UserSummary`, `domain/{User,
  FarmProfile}`, `application/{RegisterUserService, LoginService,
  FarmProfileService, AuthModuleApiImpl}`, `infrastructure/{UserRepository,
  FarmProfileRepository}`, `web/{AuthController, FarmProfileController,
  DTOs}`). `catalog/`, `chat/`, `transactions/`, `notifications/` no
  existen todavía — Catálogo nace en esta épica.
- **Auth/JWT (contrato a reutilizar, detalle completo en architecture.md
  §5):** el propio backend emite y valida JWT con Spring Security OAuth2
  Resource Server, clave simétrica HS256 (`app.jwt.secret`). Claims: `sub`
  (userId UUID), `role` (`PRODUCER`/`BUYER`), `name`, `exp`. Para un
  endpoint nuevo: público → sumarlo al `permitAll()` de `SecurityConfig`;
  protegido → nada que hacer, ya es el default; usuario autenticado en un
  controller → `@AuthenticationPrincipal Jwt jwt` +
  `UUID.fromString(jwt.getSubject())`; restringir por rol →
  `@PreAuthorize("hasRole('PRODUCER')")` usando el rol del propio JWT (no
  hace falta ir a `auth` a preguntar). `AuthModuleApi.isProducer(userId)` /
  `getUserSummary(userId)` son para cuando `catalog` necesite datos del
  productor más allá de lo que el token ya trae (ej. mostrar su nombre en
  el detalle de un producto).
- **Errores:** `GlobalExceptionHandler` (shared/web) ya traduce
  `ResponseStatusException` → status real, `MethodArgumentNotValidException`
  (de `@Valid`) → 400, `AccessDeniedException` (de `@PreAuthorize`) → 403.
  Para errores de negocio en `catalog`, lanzar `ResponseStatusException`
  directo desde `application/` (no se creó jerarquía de excepciones propia
  — ver architecture.md §5).
- **CORS:** bean `CorsConfigurationSource` en `shared/config/CorsConfig`
  (no `WebMvcConfigurer` — con endpoints protegidos el preflight lo resuelve
  la cadena de Spring Security). No debería hacer falta tocarlo en Épica 2.
- **Frontend:** React 19 + Vite + TypeScript, `react-router-dom` (agregado
  en Épica 1), cliente HTTP propio en `frontend/src/api/client.ts`
  (`apiGet/apiPost/apiPut`, todas aceptan un `token` opcional, lanzan
  `ApiError` con `status`/`message`). `auth/AuthContext.tsx` guarda el JWT
  **en memoria** (estado de React) — se pierde la sesión al recargar la
  página; quedó pendiente evaluar persistencia (localStorage o refresh
  token) más adelante, no se resuelve en esta épica salvo que lo pidas.
  `components/ProtectedRoute.tsx` redirige a `/login` sin sesión, o fuera
  de la ruta si el rol no coincide (prop `role` opcional). Cada épica suma
  sus propias `pages/`.
- **Datos:** Postgres 16 vía Docker Compose, 5 schemas, migraciones Flyway
  en `backend/src/main/resources/db/migration/<modulo>/` con rangos de
  versión reservados por módulo — `catalog`→V2xx (la próxima es
  `V201__create_schema.sql`, que ya existe con solo `CREATE SCHEMA`; tu
  primera migración de tablas es `V202__...sql`). Detalle completo en
  architecture.md §4.
- **ArchitectureTests** (spring-modulith) corre en `mvn test` y hace
  cumplir la regla dura de límites de módulo entre `auth` y lo que agregues
  en `catalog`.

### Cómo correr todo manualmente

1. Infraestructura (raíz del repo): `docker compose up -d`
   (si tenés otros contenedores propios usando 5432/8080, dan conflicto de
   puerto con `marketplace-postgres`/el backend — bajalos o remapea puertos
   antes de levantar)
2. Backend: `cd backend` y luego `mvn spring-boot:run`
   (queda en http://localhost:8080 — probar con `/health`)
   Tests: `mvn test` (incluye ArchitectureTests)
3. Frontend: `cd frontend`, primera vez `npm install`, luego `npm run dev`
   (queda en http://localhost:5173)

Puertos: Postgres 5432, RabbitMQ 5672/15672, backend 8080, frontend 5173.

Para probar el flujo de Auth manualmente: registrar un productor
(`POST /api/auth/register` con `role: "PRODUCER"`), loguear
(`POST /api/auth/login`), usar el `token` devuelto como
`Authorization: Bearer <token>` — o simplemente hacerlo desde la UI en
`/register` y `/login`.

## Qué sigue: Épica 2 — Catálogo (RF3, RF4)

Ver el detalle completo en docs/backlog.md (sección Épica 2). Resumen:

**Backend** (nace el paquete `catalog/`):
1. CRUD de productos del productor: nombre, categoría, unidad, cantidad,
   precio, foto(s), municipio, estado activo/agotado. Protegido con
   `@PreAuthorize("hasRole('PRODUCER')")`; el `userId` del productor sale
   del JWT (`@AuthenticationPrincipal Jwt`), igual que en
   `FarmProfileController`.
2. Listado y filtro del catálogo (comprador): por categoría y municipio.
   Endpoint público (no requiere login para navegar el catálogo — confirmar
   si aplica, ver decisión abajo).
3. `CatalogModuleApi`: expone lo que `chat` necesitará en la próxima épica
   (ej. `getProductSummary(productId)` con nombre, productor asociado,
   estado).

**Frontend:**
1. Panel del productor: crear/editar/eliminar productos, marcar
   activo/agotado. Reutiliza el patrón de `FarmProfilePage` (fetch con
   `auth.token`, formulario controlado).
2. Catálogo del comprador: grilla/listado con filtro por categoría y
   municipio.
3. Vista de detalle de un producto (punto de entrada al chat en Épica 3).

**Criterio de salida:** un productor gestiona sus productos desde la UI; un
comprador navega y filtra el catálogo completo de todos los productores
desde la UI.

## Decisiones a resolver antes de codear

1. **Fotos de producto:** el backlog dice "guardar como URL/ruta — sin
   pipeline de medios elaborado en MVP", pero eso todavía admite dos
   caminos distintos: (a) un campo de texto donde el productor pega una URL
   ya hosteada en otro lado (cero trabajo de storage, pero mala UX), o (b)
   un endpoint simple de upload que guarda el archivo en disco local /
   volumen y devuelve una URL servida por el propio backend (mejor UX, algo
   más de código: `MultipartFile`, carpeta de uploads, servir estáticos).
   Definilo conmigo antes de tocar el modelo de `Product`.
2. **Acceso al catálogo sin sesión:** confirmar si `GET` de listado/filtro
   de productos va en el `permitAll()` (un visitante sin cuenta puede ver
   el catálogo) o requiere login. El PDR no lo aclara explícitamente.
3. Si aparece alguna otra decisión no trivial durante el diseño de
   `CatalogModuleApi` (ej. qué tan "resumen" es `ProductSummary`), avisame
   antes de implementar en vez de asumir.

Empezá confirmando que leíste el estado actual y esperá mi ok (y las
respuestas a las decisiones de arriba) para arrancar la Épica 2.
