# CLAUDE.md — Marketplace Agrícola Huila

Reglas y convenciones del repo. Claude las lee al inicio de cada sesión. Lo volátil
(estado de avance, decisiones de cada épica) **no** va aquí, va en `docs/`.

## Qué es este repo

MVP que acerca productores agrícolas del Huila directamente con compradores (proyecto
académico, Sistemas Distribuidos 2026-b, equipo de 2). El PDR (ver tabla siguiente)
describe una arquitectura de microservicios; **este repo es la fase 1 de una migración
Strangler Fig**: un único deployable Spring Boot con límites de módulo estrictos que
más adelante se parte en esos microservicios. En fase 1 se simplifica a propósito el
diseño políglota del PDR (Java+Go, Postgres+Mongo) a **un solo stack: Java + PostgreSQL**.

## Antes de tocar código — lectura obligatoria

| Documento | Cuándo | Qué aporta |
|---|---|---|
| `docs/claude/estado-actual.md` | siempre, al arrancar | Qué existe hoy, qué falta, cómo probarlo. Punto de continuidad entre chats. |
| `docs/backlog.md` | siempre | Épicas ordenadas por dependencia, criterio de salida y decisiones ya tomadas por épica. |
| `docs/architecture.md` | antes de crear/mover código | Estructura interna, capas por módulo, reglas de comunicación, convención Flyway, auth/errores (§5). |
| PDR — `docs/PDR.md` | al arrancar una épica nueva | Visión de producto, RF1–RF9, no funcionales, arquitectura objetivo. |
| `docs/claude/epica-N-spec.md` | si existe para la épica en curso | Diseño acordado de esa épica antes de implementar. |

## Reglas duras (sin excepción)

- **Aislamiento de módulos:** un módulo (`auth`, `catalog`, `chat`, `transactions`,
  `notifications`) **nunca** accede al repositorio/entidades/schema de otro. Toda
  interacción pasa por la interfaz pública `XModuleApi` (síncrona) o por un evento de
  dominio (asíncrona). `ArchitectureTests` (spring-modulith) lo verifica en `mvn test`.
- **Sin patrones no acordados para fase 1:** nada de hexagonal completo, CQRS, event
  sourcing, saga, circuit breaker ni API gateway. Capas simples
  `domain / application / infrastructure / web` por módulo.
- **Un solo stack:** todo Java/Spring Boot en un deployable, todo PostgreSQL con un
  schema por módulo, frontend React (Vite). El panel admin Angular queda para después
  y no bloquea ninguna épica.
- **Rangos de versión Flyway reservados** (todas las carpetas comparten un único
  historial): `auth` V1xx · `catalog` V2xx · `chat` V3xx · `transactions` V4xx ·
  `notifications` V5xx. La siguiente migración de un módulo usa su rango, nunca `V2__`.
- **Nada de dinero real:** el flujo de pago (Épica 4) opera solo en sandbox; tokens de
  la pasarela viven solo en el backend.

## Estructura

`backend/` (Spring Boot) y `frontend/` (React + Vite) son carpetas hermanas; cada una
con su propio build. `docker-compose.yml` en la raíz (Postgres + RabbitMQ).

Backend: un solo proyecto Maven, paquete raíz `com.huila.marketplace`, **paquete por
módulo** + `shared/` (kernel transversal, sin lógica de negocio). El contrato público
de un módulo es su `XModuleApi` + los tipos que expone; el resto son internos aunque
Java los obligue a ser `public`.

Estado real de los módulos: `auth` y `catalog` completos; `chat`, `transactions`,
`notifications` solo tienen su `V*01__create_schema.sql`. Ver `docs/claude/estado-actual.md`.

## Comunicación entre módulos (solo estos dos mecanismos)

- **Síncrona:** inyectar la interfaz `XModuleApi` del módulo destino y llamarla como
  método Java. Espejo del futuro REST. `notifications` no expone API — solo consume.
- **Asíncrona:** `ApplicationEventPublisher` + `@TransactionalEventListener`, con los
  nombres del PDR: `TransaccionConfirmada`, `NuevoMensajeChat`. Espejo de RabbitMQ.

## Convenciones para código nuevo

**Backend**
- Usuario autenticado en un controller: `@AuthenticationPrincipal Jwt jwt` +
  `UUID.fromString(jwt.getSubject())`. No consultar `auth` solo para saber quién está
  logueado — el JWT ya trae `sub`, `role`, `name` firmados.
- Restringir por rol: `@PreAuthorize("hasRole('PRODUCER')")` con el rol del propio JWT.
- Endpoint público: agregarlo al `permitAll()` de `shared/security/SecurityConfig`
  (ojo con el orden: rutas específicas como `.../mine` antes de los comodines).
- Errores: lanzar `org.springframework.web.server.ResponseStatusException` con el
  `HttpStatus` correcto. No crear jerarquía de excepciones propia. La traducción a
  `ApiError` vive solo en `shared/web/GlobalExceptionHandler`.
- `AuthModuleApi.getUserSummary(userId)` / `isProducer(userId)` son para cuando un
  módulo necesita datos del usuario más allá de lo que el token trae.

**Frontend**
- Cliente HTTP propio en `src/api/client.ts` (`apiGet/apiPost/apiPut/apiDelete/apiUpload`,
  `mediaUrl`) — sin Axios. Todas aceptan `token` opcional y lanzan `ApiError`.
- JWT en memoria (`auth/AuthContext.tsx`) — se pierde al recargar; persistencia aún no
  decidida. Al probar en navegador, navegar con clics internos, no recargas de página.
- Cada épica agrega sus `pages/` y, si expone datos, un `<modulo>/api.ts` + `types.ts`.
  Sin Redux ni estado global más allá de `AuthContext`. `ProtectedRoute` acepta `role`.

**Idioma:** responder en español; comentarios y nombres de dominio en español, como el
código existente.

## Comandos

```bash
docker compose up -d                       # infra (Postgres 16 + RabbitMQ) — desde la raíz
docker compose down -v && docker compose up -d   # resetear la BD desde cero

cd backend && mvn spring-boot:run          # backend → http://localhost:8080 (health: /health)
cd backend && mvn test                     # tests, incluye ArchitectureTests (límites de módulo)

cd frontend && npm install                 # primera vez
cd frontend && npm run dev                 # frontend → http://localhost:5173
cd frontend && npm run lint                # oxlint
```

Puertos: Postgres 5432 · RabbitMQ 5672 / 15672 (management) · backend 8080 · frontend 5173.
Preview del frontend en Claude Code: `preview_start` con `{name: "frontend"}` (ver `.claude/launch.json`).

## Flujo de trabajo

**Una épica por chat.** No mezclar épicas en una sesión (evita saturar el contexto).

**Al arrancar una épica:**
1. Leer la lectura obligatoria de arriba (sección de esa épica en el backlog + estado actual).
2. Redactar `docs/claude/epica-N-spec.md`: endpoints, modelo de datos, DTOs, migraciones,
   plan de pruebas, decisiones y preguntas abiertas. **Alinear con el usuario antes de implementar.**
3. Implementar contra el spec; si el diseño cambia en el camino, actualizar el spec.

**Al cerrar una épica:**
1. Actualizar `docs/claude/estado-actual.md` (qué quedó, qué falta, cómo se prueba).
2. Marcar ✅ en `docs/backlog.md` con las decisiones tomadas.
3. `cd backend && mvn test` en verde.
4. Proponer un commit por épica (o por slice backend / frontend).

## Cómo trabajar con el usuario

Es un proyecto de aprendizaje. Al terminar un bloque de trabajo (una tarea de épica, un
archivo no trivial, una decisión de límite de módulo), explicar la **decisión técnica
importante** en la misma respuesta, *después* de implementar: concepto + porqué +
alternativa considerada y por qué se descartó. No pausar para pre-aprobación, salvo que
haya una decisión de diseño no trivial sin resolver — en ese caso, alinear primero.
