Estás trabajando en el repositorio marketplace-agricultural-huila-monolith
(ruta: D:\ELKIN\Universidad\Materias2026-b\distribuidos\repositorios\marketplace-agricultural-huila-monolith),
un monolito modular en Java + Spring Boot que es la fase 1 de una migración
Strangler Fig hacia la arquitectura de microservicios que define el PDR del proyecto.

Antes de hacer nada, lee completos estos documentos:
1. PDR: D:\ELKIN\Universidad\Materias2026-b\distribuidos\documentacion_proyecto\PDR.md
2. docs/architecture.md (en este repo) — estructura del monolito, layout de
   carpetas (backend/ + frontend/) y reglas de comunicación entre módulos
3. docs/backlog.md (en este repo) — backlog priorizado por épicas; la Épica 0
   ya está marcada como completada ahí, con las decisiones reales tomadas

Revisá también la memoria de proyecto disponible para esta ruta antes de
responder (hay memorias guardadas sobre el layout del repo, la arquitectura
del monolito, y cómo prefiero que trabajemos juntos).

## Reglas fijas, sin excepción

- Ningún módulo (auth, catalog, chat, transactions, notifications) accede
  directamente al repositorio/entidades/schema de otro módulo. Toda
  comunicación entre módulos es vía la interfaz pública `XModuleApi`
  (síncrona) o vía eventos de dominio con ApplicationEventPublisher
  (asíncrona) — está detallado en architecture.md.
- No introducir patrones no acordados para esta fase: nada de hexagonal
  completo, CQRS, event sourcing, saga, circuit breaker ni API gateway.
- Backlog ordenado por dependencia real: Épica 0 (scaffold, ✅ hecha) →
  1 (Auth) → 2 (Catálogo) → 3 (Chat) → 4 (Transacciones) → 5 (Notificaciones).
  Cada épica trae su propia porción de frontend en React — no se deja todo
  para el final.
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

## Estado real del proyecto (Épica 0 completada)

- **Layout:** `backend/` (Spring Boot) y `frontend/` (React) son carpetas
  hermanas en la raíz del repo, con `docker-compose.yml` también en la raíz.
- **Backend:** Java 21 + Spring Boot 4.1.1 + Maven, `groupId=com.huila`,
  `artifactId=marketplace`, paquete raíz `com.huila.marketplace`. Solo el
  paquete `shared/` tiene contenido real hoy (`config/CorsConfig`,
  `security/{SecurityConfig, JwtAuthenticationFilter}` — esqueleto sin
  validar tokens todavía, `web/{GlobalExceptionHandler, ApiError,
  HealthController}`). Los paquetes `auth/`, `catalog/`, `chat/`,
  `transactions/`, `notifications/` no existen todavía — cada uno nace
  con su primera clase real en la épica que le corresponde.
- **Frontend:** React 19 + Vite + TypeScript, cliente HTTP propio con
  `fetch` en `frontend/src/api/client.ts` (sin Axios todavía). Pantalla
  mínima en `App.tsx` que llama a `/health`.
- **Datos:** Postgres 16 vía Docker Compose, 5 schemas (`auth`, `catalog`,
  `chat`, `transactions`, `notifications`) creados por migraciones Flyway
  en `backend/src/main/resources/db/migration/<modulo>/`.
  Convención obligatoria: todas las carpetas comparten un solo historial
  de versiones Flyway, así que cada módulo tiene un rango reservado —
  `auth`→V1xx, `catalog`→V2xx, `chat`→V3xx, `transactions`→V4xx,
  `notifications`→V5xx. La próxima migración de auth es `V102__...sql`,
  nunca `V2__...sql`. Detalle completo en architecture.md §4.
- **Gotcha de dependencias:** en Spring Boot 4 la autoconfiguración de
  Flyway se movió a un artefacto propio (`org.springframework.boot:
  spring-boot-flyway`), ya declarado en `backend/pom.xml` — no alcanza con
  `flyway-core` solo, por si se toca el pom.
- **Seguridad:** `SecurityConfig` hace `permitAll()` a todo por ahora — no
  hay usuarios ni login hasta Épica 1. La cadena ya tiene el filtro JWT
  enganchado (`addFilterBefore`), solo falta la lógica de validación real.
- **ArchitectureTests** (spring-modulith) ya corre en `mvn test` y hará
  cumplir la regla dura de límites de módulo apenas exista un segundo
  módulo con contenido.

### Cómo correr todo manualmente

1. Infraestructura (raíz del repo): `docker compose up -d`
2. Backend: `cd backend` y luego `mvn spring-boot:run`
   (queda en http://localhost:8080 — probar con `/health`)
   Tests: `mvn test` (incluye ArchitectureTests)
3. Frontend: `cd frontend`, primera vez `npm install`, luego `npm run dev`
   (queda en http://localhost:5173)

Puertos: Postgres 5432, RabbitMQ 5672/15672, backend 8080, frontend 5173.

## Qué sigue: Épica 1 — Auth/Usuarios (RF1, RF2)

Ver el detalle completo en docs/backlog.md (sección Épica 1). Resumen:

**Backend** (nace el paquete `auth/`):
1. Registro: nombre, correo, contraseña (bcrypt), rol — único e inmutable
   tras crearse.
2. Login: valida credenciales, emite JWT (acá se rellena la lógica real del
   JwtAuthenticationFilter que hoy es solo esqueleto).
3. Perfil de finca del productor: departamento, municipio, vereda, nombre
   de finca.
4. AuthModuleApi: expone lo mínimo que otros módulos necesitan (ej.
   `getUserSummary(userId)`, `isProducer(userId)`) — nada más.

**Frontend:**
1. Formulario de registro (con selección de rol) y login.
2. Estrategia de almacenamiento del JWT en el cliente y envío automático en
   llamadas siguientes (definir acá porque el resto de pantallas la
   reutiliza).
3. Formulario de perfil de finca para el productor.
4. Ruteo básico protegido (redirige a login si no hay sesión).

**Criterio de salida:** un productor y un comprador se registran e inician
sesión desde la UI real, el JWT viaja correctamente en las siguientes
llamadas, y el productor completa su perfil de finca.

No escribas código todavía si hay decisiones técnicas no triviales sin
resolver (ej. estrategia de almacenamiento del JWT en frontend, librería
para hashing/JWT en backend) — para tareas no triviales, alineemos el
enfoque antes de implementar. Empezá confirmando que leíste el estado
actual y esperá mi ok para arrancar la Épica 1.
