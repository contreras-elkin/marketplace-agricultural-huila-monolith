# Backlog — Monolito Modular (Fase 1)

> Ordenado por dependencia real entre módulos (ver [architecture.md](architecture.md)), no por prioridad de negocio aislada — cada épica requiere que la anterior exista para poder probarse de punta a punta. RF-x referencia los requisitos funcionales del [PDR](../../../documentacion_proyecto/PDR.md).
>
> **Frontend delgado por épica:** el entregable final es el monolito corriendo *junto con* el frontend (React), así que cada épica de backend trae su propia porción mínima de frontend que consume esa API antes de pasar a la siguiente. Esto evita descubrir problemas de integración (JWT/CORS, WebSocket real, SDK de la pasarela de pago) recién al final. El panel admin en Angular queda fuera de esta secuencia (ver "Fuera de esta fase").

## Épica 0 — Base del proyecto (sin RF directo, habilita todo lo demás) ✅ Completada

**Backend** (`backend/`, Java 21 + Spring Boot 4.1.1 + Maven):
1. ✅ Proyecto Spring Boot inicializado (`backend/pom.xml`, estructura de paquetes por módulo descrita en `architecture.md` — por ahora solo `shared/` tiene contenido real, ver nota en esa sección).
2. ✅ `docker-compose.yml` (raíz del repo): PostgreSQL 16 + RabbitMQ 3-management, sin dockerizar el backend todavía (corre local con `mvn spring-boot:run` contra esa infra).
3. ✅ Flyway configurado, una carpeta de migraciones por módulo (`backend/src/main/resources/db/migration/<modulo>/`), con rangos de versión reservados por módulo para evitar colisiones en el historial combinado — ver convención en `architecture.md` §4. Requirió agregar `spring-boot-flyway` explícitamente (Spring Boot 4 lo separó de `spring-boot-autoconfigure`).
4. ✅ Manejo global de errores + formato de error estándar (`shared/web/{GlobalExceptionHandler, ApiError}`).
5. ✅ Endpoint de salud (`/health`) — controller REST simple, no Spring Boot Actuator.
6. ✅ Esqueleto de seguridad JWT en `shared/security` (`SecurityConfig` + `JwtAuthenticationFilter`, cadena `permitAll()` por ahora ya que no hay usuarios hasta Épica 1).
7. ✅ CORS configurado para `http://localhost:5173` (origen de Vite en dev).
8. ✅ `spring-modulith-starter-test` + `ArchitectureTests` (`backend/src/test/java/.../ArchitectureTests.java`).

**Frontend** (`frontend/`, React 19 + Vite + TypeScript):
1. ✅ Proyecto inicializado con Vite (`npm create vite@latest -- --template react-ts`), cliente HTTP propio con `fetch` (`src/api/client.ts`) — sin Axios, no se justifica todavía con un solo endpoint.
2. ✅ Pantalla mínima (`App.tsx`) que llama a `/health` y muestra el resultado — validado en navegador real sin errores de CORS.

**Criterio de salida:** ✅ cumplido — `docker compose up -d` levanta Postgres+RabbitMQ, el backend arranca y corre las 5 migraciones desde cero (verificado con `docker compose down -v` + restart), `/health` responde 200, y el frontend lo muestra en pantalla.

## Épica 1 — Auth/Usuarios (RF1, RF2) ✅ Completada

Todo lo demás depende de poder identificar quién es productor y quién comprador.

**Backend** (nace el paquete `auth/`):
1. ✅ Registro: nombre, correo, contraseña (bcrypt vía `PasswordEncoder`), rol — único e inmutable tras crearse. Email único (409 si ya existe).
2. ✅ Login: valida credenciales, emite JWT. Se usó Spring Security OAuth2 Resource Server (Nimbus, HS256 con clave simétrica en `app.jwt.secret`) en vez de una librería JWT manual (ej. jjwt) — el filtro esqueleto `JwtAuthenticationFilter` de Épica 0 se eliminó porque el propio Resource Server ya resuelve el parseo/validación del Bearer token.
3. ✅ Perfil de finca del productor: departamento, municipio, vereda, nombre de finca (`PUT`/`GET /api/auth/farm-profile`, protegido con `@PreAuthorize("hasRole('PRODUCER')")` a partir del claim `role` del JWT).
4. ✅ `AuthModuleApi`: expone `getUserSummary(userId)` e `isProducer(userId)`.

**Frontend:**
1. ✅ Formulario de registro (con selección de rol) y login (`pages/RegisterPage.tsx`, `pages/LoginPage.tsx`).
2. ✅ JWT guardado en memoria (estado de React vía `auth/AuthContext.tsx`) y enviado automáticamente en llamadas siguientes — se pierde la sesión al recargar la página; queda pendiente evaluar persistencia (localStorage o refresh token) más adelante si hace falta.
3. ✅ Formulario de perfil de finca para el productor (`pages/FarmProfilePage.tsx`).
4. ✅ Ruteo protegido con `react-router-dom` (`components/ProtectedRoute.tsx`) — redirige a `/login` sin sesión, y fuera de `/farm-profile` si el rol no es productor.

**Criterio de salida:** ✅ cumplido — verificado end-to-end en navegador real: un productor se registra, inicia sesión, el JWT viaja en las llamadas siguientes (incluido CORS con credenciales entre `5173`→`8080`), y completa su perfil de finca; un comprador se registra/inicia sesión y no puede acceder a `/farm-profile` (403 backend, redirect en frontend).

## Épica 2 — Catálogo (RF3, RF4)

Depende de Auth para saber quién publica.

**Backend:**
1. CRUD de productos del productor: nombre, categoría, unidad, cantidad, precio, foto(s) (guardar como URL/ruta — sin pipeline de medios elaborado en MVP), municipio, estado activo/agotado.
2. Listado y filtro del catálogo (comprador): por categoría y municipio.
3. `CatalogModuleApi`: expone lo que `chat` necesitará (ej. `getProductSummary(productId)` con nombre, productor asociado, estado).

**Frontend:**
1. Panel del productor: crear/editar/eliminar productos, marcar activo/agotado.
2. Catálogo del comprador: grilla/listado con filtro por categoría y municipio.
3. Vista de detalle de un producto (punto de entrada al chat en la siguiente épica).

**Criterio de salida:** un productor gestiona sus productos desde la UI; un comprador navega y filtra el catálogo completo de todos los productores desde la UI.

## Épica 3 — Chat (RF5, RF6)

Depende de Auth (identidad) y Catálogo (de qué producto se habla y quién es el productor).

**Backend:**
1. Abrir conversación asociada a un producto entre comprador y productor (usa `CatalogModuleApi` para validar producto/productor).
2. Mensajería en tiempo real vía WebSocket.
3. Historial de mensajes por conversación (REST).
4. Registrar el acuerdo de forma de compra dentro del chat: "por plataforma" o "por fuera" (un campo/estado simple en la conversación; no automatiza nada, solo registra la elección de las partes).
5. `ChatModuleApi`: expone lo que `transactions` necesitará (ej. `getAgreedPurchase(conversationId)`).

**Frontend:**
1. Botón "chatear" desde el detalle de producto que abre/crea la conversación.
2. Ventana de chat con conexión WebSocket real (mensajes en vivo, no polling) — es el punto donde más vale la pena validar temprano: reconexión, cómo viaja el JWT en el handshake, orden de mensajes.
3. Selector de forma de compra ("por plataforma" / "por fuera") dentro del chat.

**Criterio de salida:** comprador y productor chatean en tiempo real desde la UI sobre un producto y dejan registrada la forma de compra elegida.

## Épica 4 — Transacciones (RF7, RF8)

Depende de Chat (de dónde sale el acuerdo de compra por plataforma) y Catálogo (precio/producto).

**Backend:**
1. Integración con pasarela de pago en modo sandbox (iniciar cobro).
2. Ledger interno: registro de la dispersión hacia el productor.
3. Webhook de la pasarela → confirma la transacción automáticamente.
4. Publica el evento en proceso `TransaccionConfirmada` al confirmarse.

**Frontend:**
1. Flujo de pago desde el chat cuando se eligió "por plataforma" — **atención:** verificar temprano en esta épica si la pasarela sandbox elegida requiere SDK/tokenización desde el navegador (algunas lo requieren); si es así, ese trabajo de frontend nace aquí, no se puede dejar para después.
2. Pantalla de estado de la transacción (pendiente/confirmada) para el comprador.
3. Vista simple de ledger/dispersión para el productor.

**Criterio de salida:** una compra "por plataforma" acordada en el chat se paga en sandbox desde la UI, el webhook la confirma sola, el comprador ve el estado actualizado, y el ledger interno queda con el registro de dispersión.

## Épica 5 — Notificaciones (RF9)

Depende de Transacciones y Chat (son quienes publican los eventos que consume).

**Backend:**
1. Listener de `TransaccionConfirmada` → crea notificación para el comprador (y opcionalmente productor).
2. Listener de `NuevoMensajeChat` → crea notificación para el destinatario del mensaje.
3. Endpoint REST simple para que el usuario liste sus notificaciones.

**Frontend:**
1. Indicador/badge de notificaciones no leídas.
2. Listado de notificaciones del usuario.

**Criterio de salida:** al confirmarse una transacción o llegar un mensaje nuevo, aparece una notificación en la UI del usuario correcto, incluso si se generó unos segundos después (asíncrono).

## Fuera de esta fase (no planificar todavía)

- Extracción real a microservicios (Strangler Fig) — solo aplica cuando el monolito ya funciona de punta a punta.
- Panel administrativo en Angular — es una app interna aparte (menor prioridad que el marketplace React); se planifica una vez el marketplace esté completo, no bloquea ninguna épica de arriba.
- Pulido visual/UX del frontend más allá de lo funcional — cada épica entrega frontend funcional, no diseño final.
- Todo lo que el PDR marca como fuera de alcance del MVP (§2): reputación, seguimiento de compras fuera de plataforma, verificación de identidad, logística, geolocalización con mapa, selección definitiva de pasarela de producción.

## Resumen de orden

```
Épica 0 (base) → Épica 1 (auth) → Épica 2 (catálogo) → Épica 3 (chat) → Épica 4 (transacciones) → Épica 5 (notificaciones)
```

Cada épica es demostrable de punta a punta antes de empezar la siguiente — evita construir sobre supuestos no probados de un módulo que aún no existe.
