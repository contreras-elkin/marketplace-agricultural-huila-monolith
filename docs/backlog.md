# Backlog — Monolito Modular (Fase 1)

> Ordenado por dependencia real entre módulos (ver [architecture.md](architecture.md)), no por prioridad de negocio aislada — cada épica requiere que la anterior exista para poder probarse de punta a punta. RF-x referencia los requisitos funcionales del [PDR](PDR.md).
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

## Épica 2 — Catálogo (RF3, RF4) ✅ Completada

Depende de Auth para saber quién publica.

**Backend** (nace el paquete `catalog/`):
1. ✅ CRUD de productos del productor: nombre, categoría, unidad, cantidad, precio, foto, municipio, estado activo/agotado. Protegido con `@PreAuthorize("hasRole('PRODUCER')")` por método (el controller mezcla rutas públicas y de productor); el `producerId` sale del JWT; chequeo de propiedad en editar/eliminar/foto (403 si es de otro productor).
2. ✅ Listado y filtro del catálogo (comprador): `GET /api/catalog/products?category=&municipality=` **público** (`permitAll()`), solo devuelve `ACTIVE`, filtro por municipio case-insensitive, armado con `JpaSpecificationExecutor`. Detalle público `GET /api/catalog/products/{id}` enriquecido con el nombre del productor vía `AuthModuleApi`.
3. ✅ `CatalogModuleApi.getProductSummary(productId)` → `ProductSummary(id, name, producerId, status, price, unit)` — mínimo, solo lo que chat (Épica 3) y transactions (Épica 4) van a necesitar.

**Decisiones tomadas (ver docs/claude/handoffs/handoff-epica-2.md §"Decisiones a resolver"):**
- **Fotos:** upload local, **una por producto**. `POST /api/catalog/products/{id}/photo` (multipart) → guarda en `app.uploads.dir` (`./uploads`, gitignored) con nombre `UUID.ext`, whitelist JPG/PNG/WebP, límite 5 MB; se sirve como estático en `/media/**` (bean `shared/config/MediaResourceConfig`, ruta en el `permitAll()`). Descartado: campo de URL externa (mala UX) y pipeline elaborado / blob store (sobra para MVP). Al extraer catalog, se cambia `PhotoStorage` por un cliente de blob store.
- **Catálogo sin sesión:** `GET` de listado y detalle son públicos — coherente con "catálogo = alta disponibilidad, muchas lecturas" del PDR; la identidad se exige recién al abrir el chat (Épica 3).
- **Borrado:** lógico (`deleted_at`), filtrado en todas las queries y en `CatalogModuleApi`. Evita conversaciones/transacciones huérfanas en épicas siguientes.
- **`category` y `unit`:** enum cerrado (`ProductCategory`, `ProductUnit` en el paquete raíz del módulo, mapeados `EnumType.STRING`). `municipality` sigue texto libre (coherente con `FarmProfile`; el form ofrece un `<datalist>` de municipios del Huila y prellena con el del perfil de finca).
- **Estado:** `ProductStatus { ACTIVE, SOLD_OUT }`, default `ACTIVE`; `SOLD_OUT` se ve en el detalle pero no en la grilla ni habilita el chat.
- Se sumó a `shared`: `apiDelete`/`apiUpload`/`mediaUrl` en el cliente del frontend; handlers 400 (`MethodArgumentTypeMismatchException`) y 413 (`MaxUploadSizeExceededException`) en `GlobalExceptionHandler`. Migración `V202__create_products_table.sql`.

**Frontend:**
1. ✅ Panel del productor (`pages/MyProductsPage`, `pages/ProductFormPage`): crear/editar/eliminar, toggle activo/agotado, subir foto. Rutas `/mis-productos[...]` con `ProtectedRoute role="PRODUCER"`.
2. ✅ Catálogo del comprador (`pages/CatalogPage`): grilla con filtro por categoría (desplegable) y municipio (texto). Ruta pública `/catalogo`.
3. ✅ Vista de detalle (`pages/ProductDetailPage`, ruta pública `/productos/:id`) con nombre del productor y botón "Chatear" deshabilitado (placeholder de Épica 3).

**Criterio de salida:** ✅ cumplido — verificado end-to-end en navegador real y con pruebas de API: un productor crea/edita/agota/elimina sus productos desde la UI; un visitante sin cuenta navega y filtra el catálogo de todos los productores por categoría y municipio y abre el detalle de un producto. `mvn test` (ArchitectureTests) verde: `catalog` respeta los límites de módulo, dependiendo solo de `auth.AuthModuleApi`.

## Épica 3 — Chat (RF5, RF6) ✅ Completada

Depende de Auth (identidad) y Catálogo (de qué producto se habla y quién es el productor).

**Backend** (nace el paquete `chat/`):
1. ✅ Abrir conversación asociada a un producto entre comprador y productor. `POST /api/chat/conversations` (`hasRole('BUYER')`, `buyerId` del JWT), valida el producto y saca el `producerId` vía `CatalogModuleApi.getProductSummary`. Única por `(product_id, buyer_id)` (constraint), idempotente (201 al crear / 200 si ya existía).
2. ✅ Mensajería en tiempo real vía WebSocket **STOMP** (`spring-boot-starter-websocket`, broker simple en memoria). Handshake `/ws`; JWT en el header `Authorization` del frame `CONNECT`, validado por un `ChannelInterceptor` que reusa el `JwtDecoder` de `shared`; `SUBSCRIBE`/`SEND` a `/…/conversations/{id}` exigen ser participante. Envío en `SEND /app/conversations/{id}/messages`, fan-out por `/topic/conversations/{id}`.
3. ✅ Historial de mensajes por conversación: `GET /api/chat/conversations/{id}/messages` (solo lectura, orden `sent_at` asc, sin paginación). Detalle `GET /api/chat/conversations/{id}` y lista `GET /api/chat/conversations` (buyer o producer, con nombres resueltos vía `auth`/`catalog`).
4. ✅ Forma de compra: `AgreedPurchaseMethod {PLATFORM, OFF_PLATFORM}` (null = sin acordar), `PUT /api/chat/conversations/{id}/purchase-method`, cualquiera de las dos partes, last-write-wins, sin máquina de estados.
5. ✅ `ChatModuleApi.getAgreedPurchase(conversationId)` → `AgreedPurchase(conversationId, productId, buyerId, producerId, method)` (404 si no existe). Evento `NuevoMensajeChat` publicado al persistir cada mensaje (sin listener hasta Épica 5).

**Frontend:**
1. ✅ Botón "Chatear" en `ProductDetailPage` (activo para `BUYER`, producto `ACTIVE` y ajeno) → `POST` y navega a `/chat/:id`.
2. ✅ `ConversationPage` (`/chat/:conversationId`) con WebSocket real (`@stomp/stompjs`): mensajes en vivo, reconexión automática con recarga del historial por REST, orden por `sent_at`. Persistencia del JWT en `localStorage` resuelta en esta épica (deuda de Épica 1).
3. ✅ Selector de forma de compra dentro del chat. `ConversationsPage` (`/chat`) lista "Mis conversaciones" (entry point del productor).

**Criterio de salida:** ✅ cumplido — verificado end-to-end en navegador real (2 sesiones) y con pruebas de API: el comprador abre el chat desde el detalle del producto, comprador y productor intercambian mensajes en vivo sin recargar, la conversación se reusa al reabrirla, un tercer usuario recibe 403, y la forma de compra elegida persiste y se ve en ambos lados. `mvn test` (ArchitectureTests) verde: `chat` respeta los límites, dependiendo solo de `auth.AuthModuleApi` y `catalog.CatalogModuleApi`.

**Decisiones tomadas (ver `docs/claude/epica-3-spec.md` §"Decisiones tomadas"):**
- **Transporte:** STOMP + broker simple en memoria (no RabbitMQ como relay — eso es post-extracción). Descartado WebSocket nativo (ruteo/serialización/sesiones a mano).
- **JWT en el WebSocket:** header `Authorization: Bearer` en el frame `CONNECT`, validado con un `ChannelInterceptor` que reusa el `JwtDecoder` de `SecurityConfig`. `/ws/**` va en `permitAll()` (el handshake no lleva token). Nunca en query param.
- **Persistencia del JWT (frontend):** `localStorage`, rehidratando por decodificación del payload del token (sin verificar firma; se descarta si venció). Descartado *refresh token* (sobre-ingeniería para fase 1). Un 401 en llamada autenticada dispara `auth:expired` → logout.
- **Unicidad:** una conversación por `(product_id, buyer_id)` (constraint `UNIQUE`); solo el comprador la inicia, el productor responde.
- **Modelo de datos (`V302`):** `conversations` + `messages`, `*_id` como UUID sueltos (sin FK cross-schema), sin paginación en el historial. `AgreedPurchaseMethod` y `NuevoMensajeChat` viven en el paquete raíz `chat`.
- **`ChatModuleApi` mínimo:** `AgreedPurchase` solo lleva ids + `method`; `transactions` re-consulta precio/cantidad a `catalog` (no se congelan al acordar).
- **Evento `NuevoMensajeChat`:** se publica ya, dentro de la transacción de `postMessage`, aunque Épica 5 aún no tenga listener.
- **Autorización:** toda operación sobre una conversación (REST y WS) exige que el usuario sea el `buyerId` o el `producerId`. `SOLD_OUT` no bloquea el chat en el backend (gating solo de UI). El envío de mensajes es solo por WS.
- Se sumó a `shared`: `/ws/**` en el `permitAll()` de `SecurityConfig`. Dependencia nueva en `backend/pom.xml`: `spring-boot-starter-websocket`. Frontend: `@stomp/stompjs`, `wsUrl()` en `api/client.ts`.

## Épica 4 — Transacciones (RF7, RF8) ✅ Completada

Depende de Chat (de dónde sale el acuerdo de compra por plataforma) y Catálogo (precio/producto).

**Backend** (nace el paquete `transactions/`):
1. ✅ Integración con **Stripe (test mode)**, Checkout Session **alojada** (redirect): `POST /api/transactions` (`hasRole('BUYER')`, body `{conversationId}`) valida el acuerdo vía `ChatModuleApi.getAgreedPurchase` (existe, `method == PLATFORM` → 409, caller == buyer → 403) y el producto vía `CatalogModuleApi` (`ACTIVE` → 409, `quantity > 0`), congela `quantity`/`unit_price`/`amount` (= `price × quantity`, "se compra todo el listado"), crea `Transaction(PENDING)` y la sesión Stripe. Una transacción activa (PENDING|CONFIRMED) por conversación → 409.
2. ✅ Ledger interno: al confirmarse, una fila `transactions.ledger_entries` (`gross`/`platform_fee`/`net`, append-only, `UNIQUE (transaction_id)`). Comisión **0 %** en fase 1 (`app.transactions.platform-fee-rate = 0.00`), estructura lista para activarla.
3. ✅ Webhook `POST /api/transactions/webhook/stripe` (`permitAll`, firma `Stripe-Signature` verificada sobre el body crudo → 400 si inválida): `checkout.session.completed` → `PENDING→CONFIRMED` idempotente por `gateway_session_id`; `checkout.session.expired` → `FAILED`.
4. ✅ Publica `TransaccionConfirmada(transactionId, conversationId, productId, buyerId, producerId, amount)` dentro de la transacción del webhook (sin listener hasta Épica 5). También expone `TransactionsModuleApi.getTransaction(id)` (sin consumidor aún, contrato listo).

**Frontend:**
1. ✅ Bloque de pago en `ConversationPage` (comprador, `method == PLATFORM`) → `startCheckout` → `window.location.href = checkoutUrl`. Checkout alojado ⇒ **sin SDK/tokenización en el navegador** (no se agregó ninguna dependencia).
2. ✅ `TransactionStatusPage` (`/transacciones/:id`) — estado pendiente/confirmada/fallida; polling al volver de Stripe con `?pago=ok` hasta `CONFIRMED`.
3. ✅ `ProducerSalesPage` (`/mis-ventas`, `role="PRODUCER"`) — ventas con desglose bruto/comisión/neto y total neto confirmado.

**Criterio de salida:** ✅ cumplido — verificado end-to-end (API + navegador con Stripe Checkout real de test + `stripe listen`): compra "por plataforma" acordada en el chat, pagada con `4242…`, confirmada sola por el webhook, el comprador ve "Confirmada" por polling, el productor ve la venta con la dispersión en el ledger. Bordes probados: reenvío del evento (idempotente, ledger sigue 1 fila), 2ª transacción en la misma conversación → 409, `OFF_PLATFORM` → 409, tercero ajeno → 403, firma inválida → 400, productor `POST` → 403. `mvn test` (ArchitectureTests) verde: `transactions` importa solo `chat.ChatModuleApi`, `catalog.CatalogModuleApi`, `auth.AuthModuleApi` (+ tipos) y `shared`, más el SDK de Stripe.

**Decisiones tomadas (ver `docs/claude/epica-4-spec.md` §"Decisiones tomadas"):**
- **Pasarela:** Stripe test mode + Checkout Session alojada (redirect). Descartado MercadoPago sandbox (setup más engorroso) y una pasarela simulada en el repo (no ejercita SDK ni verificación de firma reales).
- **Sin SDK en el frontend:** consecuencia del Checkout alojado — el front solo redirige. Responde la alerta del backlog sobre tokenización en el navegador.
- **Monto:** "se compra todo el listado" — `amount = price × quantity` publicada, `unit_price`/`quantity`/`amount` congelados en la fila. El monto nunca se acepta del cliente. Se validó contra el stock pero **no se descuenta** (ningún RF pide inventario). Requirió agregar `quantity` a `catalog.ProductSummary`.
- **Ledger:** una fila por transacción confirmada (`gross`/`fee`/`net`). Descartada la doble entrada (2 filas con `entry_type`). Comisión **0 %** en fase 1; la columna `platform_fee_amount` y `PlatformFee` quedan listos para activar una tasa sin tocar el schema.
- **`TransactionsModuleApi`:** se crea ya con `getTransaction(id)` aunque no tenga consumidor (decisión del usuario, contra el YAGNI del spec).
- **Moneda:** `COP`. Stripe la trata como moneda de dos decimales → `unit_amount` = `amount × 100`; la conversión vive solo en `StripePaymentGateway`.
- **Cardinalidad:** una transacción activa por conversación (409 con el id existente). Una `FAILED` no bloquea.
- **Webhook:** `checkout.session.completed` + `checkout.session.expired`; idempotencia en tres capas (`gateway_session_id`, `Transaction.confirm()` devuelve `boolean`, `UNIQUE (transaction_id)` en ledger). `@Transactional` en `handleWebhook` (no solo en `confirm`) por el self-invocation. Sin saga, sin outbox: estado + ledger + evento en una transacción local.
- **Ledger = registro, no ejecución:** no hay transferencia real al productor en ningún lado; el ledger es la "cuenta por pagar" (paso "dispersión/payout" fuera del MVP), como anticipó el PDR §7.
- **Secretos de Stripe fuera de git:** `application.yml` versionado con placeholders; claves reales por env o `backend/config/application.yml` (gitignored). Dependencia nueva en `pom.xml`: `com.stripe:stripe-java`. Ruta nueva en `permitAll()`: el webhook.

## Épica 5 — Notificaciones (RF9) ✅ Completada

Depende de Transacciones y Chat (son quienes publican los eventos que consume). `notifications`
es el único módulo que **no expone `ModuleApi`**: solo reacciona a eventos.

**Backend** (nace el código de `notifications/`):
1. ✅ Listener de `TransaccionConfirmada` → dos notificaciones: comprador ("Tu compra fue confirmada") y productor ("Tenés una venta confirmada"), nombre del producto vía `CatalogModuleApi`, link `/transacciones/{id}`.
2. ✅ Listener de `NuevoMensajeChat` → notificación para el `recipientId` del evento ("Nuevo mensaje de {nombre}", vía `AuthModuleApi`), link `/chat/{id}`. Ambos listeners son `@Async` + `@TransactionalEventListener(AFTER_COMMIT)` + `@Transactional(REQUIRES_NEW)` en un pool dedicado; el cuerpo va en `try/catch` + `log.warn` (un fallo nunca vuelve a `chat`/`transactions`).
3. ✅ REST `GET /api/notifications` (`{ items, unreadCount }`, últimas 50), `PUT /api/notifications/{id}/read` (204, 404 si es ajena), `PUT /api/notifications/read-all` (`{ updated }`). Todo `authenticated()`; `recipientId` = JWT.

**Frontend:**
1. ✅ `components/NotificationsBell` — 🔔 con badge de no leídas en `Home`, polling cada 20 s.
2. ✅ `pages/NotificationsPage` (`/notificaciones`) — lista, no leídas con acento, clic marca leída + navega al `link`, botón "marcar todas como leídas".

**Criterio de salida:** ✅ cumplido — verificado end-to-end (script Node + navegador con Stripe test + `stripe listen`): un mensaje de chat genera notificación para el destinatario (no para el emisor) en ~0.4 s; un pago confirmado genera notificación para comprador y productor ~60 ms tras el commit; el badge sube en el navegador sin recargar por el polling; `markRead`/`read-all` bajan el contador; notif ajena → 404; reenvío del webhook de Stripe **no** duplica (dedupe por `existsByRecipientIdAndTypeAndSourceRefId` + índice único parcial). `mvn test` (ArchitectureTests) verde: `notifications` importa solo `chat.NuevoMensajeChat`, `transactions.TransaccionConfirmada`, `auth.AuthModuleApi`, `catalog.CatalogModuleApi` (+ tipos) y `shared`.

**Decisiones tomadas (ver `docs/claude/epica-5-spec.md` §"Decisiones tomadas"):**
- **Texto enriquecido:** el listener resuelve nombres vía `AuthModuleApi`/`CatalogModuleApi` (llamadas síncronas entre módulos) y guarda `title`/`body`/`link` ya armados. Descartado el texto genérico sin nombres.
- **Listener asíncrono:** `@Async("notificationsExecutor")` + `@TransactionalEventListener(AFTER_COMMIT)` + `@Transactional`, con `@EnableAsync` y un `ThreadPoolTaskExecutor` dedicado (`NotificationsAsyncConfig`). Espejo del futuro consumidor RabbitMQ; el envío de mensaje / webhook no espera. Descartado el sync puro (más simple pero mete un insert en el hot path).
- **Modelo de datos desnormalizado:** `type` + `title` + `body` + `link` + `read_at` en la fila; el frontend solo pinta. Descartado `type` + `reference_id` con render en el cliente.
- **`TransaccionConfirmada` notifica a ambas partes** (comprador y productor). Descartado "solo comprador".
- **Entrega por polling REST** (~20 s), no push STOMP: el criterio de salida tolera el desfase y evita wiring de user-destinations.
- **Badge solo en `Home`** + página `/notificaciones`, sin layout compartido (fuera de fase).
- **Dedupe:** columna `source_ref_id` (`messageId` / `transactionId`) + índice único parcial `(recipient_id, type, source_ref_id)` — lleva `recipient_id` porque `TransaccionConfirmada` produce dos filas con el mismo `(type, transactionId)`. El listener también chequea `existsBy...` antes de insertar.
- **`NotificationType`** es interno de `notifications/domain` (ningún otro módulo lo consume). `notifications` no expone `ModuleApi`.
- **`SecurityConfig`, `pom.xml` y los otros módulos no se tocaron** — módulo consumidor puro.

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
