# Épica 5 — Notificaciones (RF9) · Spec

> **Estado: ACORDADO** (2026-09-01). Las 7 decisiones de abajo están resueltas con
> el usuario (eligió todas las recomendaciones tentativas); este documento es el
> diseño contra el que se implementa. Si algo cambia durante la implementación, se
> actualiza acá en el momento.
>
> **Depende de** (solo eventos + APIs públicas, nunca schemas ajenos):
> - `chat` — evento `NuevoMensajeChat(conversationId, messageId, senderId, recipientId)`,
>   publicado en la transacción de `postMessage`. Ya existe, sin listener.
> - `transactions` — evento `TransaccionConfirmada(transactionId, conversationId, productId,
>   buyerId, producerId, amount)`, publicado en la transacción del webhook. Ya existe, sin listener.
> - `auth` — `AuthModuleApi.getUserSummary(userId)` → nombre para el texto de la notificación
>   (según Decisión 1).
> - `catalog` — `CatalogModuleApi.getProductSummary(productId)` → nombre del producto
>   (solo si Decisión 1 = "enriquecido").
>
> `notifications` es el **único módulo que no expone `ModuleApi`** (architecture.md §3b):
> nadie lo llama de forma síncrona, solo reacciona a eventos.

## Alcance (del backlog)

**Backend** (nace el código de `notifications/`; hoy solo tiene `V501__create_schema.sql`):
1. Listener de `TransaccionConfirmada` → crea notificación para el comprador (y el productor,
   según Decisión 4).
2. Listener de `NuevoMensajeChat` → crea notificación para el destinatario del mensaje
   (`recipientId` del evento).
3. Endpoint REST para que el usuario liste sus notificaciones y las marque como leídas.

**Frontend:**
1. Indicador/badge de notificaciones no leídas.
2. Listado de notificaciones del usuario.

**Criterio de salida:** al confirmarse una transacción o llegar un mensaje nuevo, aparece una
notificación en la UI del usuario correcto, **incluso si se generó unos segundos después**
(asíncrono). `mvn test` (ArchitectureTests) verde con `notifications` respetando límites de
módulo: solo importa los tipos de evento (`chat.NuevoMensajeChat`, `transactions.TransaccionConfirmada`),
`auth.AuthModuleApi`, `catalog.CatalogModuleApi` y `shared`.

## Decisiones tomadas

Las 7 se resolvieron eligiendo la recomendación tentativa.

| # | Decisión | Resolución | Porqué / alternativa descartada |
|---|---|---|---|
| 1 | Texto de la notificación: genérico vs enriquecido | **Enriquecido.** `AuthModuleApi.getUserSummary(senderId)` → "Nuevo mensaje de {nombre}"; `CatalogModuleApi.getProductSummary(productId)` → "Venta confirmada: {producto}". | Son llamadas síncronas entre módulos ya sancionadas y hacen la demo legible; como el listener es asíncrono, ese round-trip no pega en el hot path de chat. Descartado el texto genérico ("Tenés un mensaje nuevo"): cero dependencias, pero la notificación dice poco. |
| 2 | Sincronía del listener | **`@Async("notificationsExecutor")` + `@TransactionalEventListener(phase = AFTER_COMMIT)` + `@Transactional`** en cada método, con `@EnableAsync` y un `ThreadPoolTaskExecutor` dedicado. | Espejo fiel del futuro consumidor RabbitMQ (objetivo de Distribuidos): el `SEND` del mensaje y el webhook devuelven sin esperar; un fallo del listener se captura y logea, nunca afecta a `chat`/`transactions`. Descartado el sync puro: más simple pero suma un insert de latencia en el mismo hilo del envío/webhook. |
| 3 | Modelo de datos | **Texto desnormalizado**: el listener arma `title`, `body`, `link` y `type` una sola vez y se guardan; el frontend solo pinta. | Coherente con "sin patrones no acordados" y con no repartir lógica de presentación. Descartado `type` + `reference_id` (+ `metadata` JSON) con render en el front: más flexible para reword/i18n, pero mueve lógica al cliente y lo obliga a conocer los tipos de evento. |
| 4 | `TransaccionConfirmada`: ¿a quién notifica? | **A ambas partes.** Comprador: "Tu compra fue confirmada"; productor: "Tenés una venta confirmada". Dos inserts (el evento ya trae `buyerId` y `producerId`). | RF9 habla de "eventos relevantes" y la venta lo es para el productor. Descartado "solo comprador" (literal del backlog: "y opcionalmente productor"): menos ruido pero menos útil. |
| 5 | Entrega al frontend | **Polling REST**: el badge llama a `GET /api/notifications` cada ~20 s y al montar. | El criterio de salida tolera explícitamente "unos segundos después"; cero wiring nuevo. Descartado push STOMP a `/user/queue/notifications`: tiempo real y reusa el socket de Épica 3, pero suma registro de sesión de usuario STOMP y haría falta un fallback igual. |
| 6 | Dónde vive el badge | **`NotificationsBell` en `Home`** + página `/notificaciones` dedicada. | Hoy no hay layout compartido (cada página trae su `<main>`); introducir uno es "pulido UX", fuera de fase. Descartado un `<AppHeader>` en todas las páginas autenticadas: mejor UX, pero toca todas las páginas. |
| 7 | Dedupe / idempotencia | **Sí**: columna `source_ref_id` (= `messageId` / `transactionId`) + índice único parcial `(recipient_id, type, source_ref_id)`; el listener chequea `existsByRecipientIdAndTypeAndSourceRefId` antes de insertar. | Evita duplicados ante una re-entrega del evento — hoy improbable con eventos en proceso, esperable con RabbitMQ. Mismo criterio que `uq_transactions_session` en Épica 4. Descartado omitirlo (YAGNI): los publishers publican una sola vez hoy, pero la red de seguridad es una columna + un índice. |

### Puntos menores ya fijados (no son decisiones abiertas)

- **`@TransactionalEventListener`, no `@EventListener`** — architecture.md §3b lo pide explícito y
  ambos publishers publican dentro de `@Transactional`, así que la notificación solo nace si el
  mensaje / la confirmación hizo commit. (Un evento publicado sin transacción activa lo
  descartaría; no es el caso.)
- **`NotificationType`** vive en `notifications/domain` (interno): ningún otro módulo lo consume,
  no va al paquete raíz.
- **`@EnableAsync` + `Executor` dedicado** en `notifications/application/NotificationsAsyncConfig`
  — mantiene el blast radius dentro del módulo. Pool chico (`core 2 / max 4 / queue 100`), nombre
  `notificationsExecutor`, referenciado como `@Async("notificationsExecutor")`.
- **El listener nunca propaga**: cuerpo entero en `try/catch` + `log.warn`. Una notificación que
  falla no puede afectar a chat/transactions (refuerza el no funcional del PDR: "el resto sigue
  aunque notificaciones falle").
- **Errores de negocio del REST**: `ResponseStatusException` directo (architecture.md §5).
- **Usuario**: `@AuthenticationPrincipal Jwt jwt` + `UUID.fromString(jwt.getSubject())`. El
  `recipientId` de las queries es SIEMPRE el del JWT — no se puede listar/marcar lo ajeno.
- **`SecurityConfig` no se toca**: no hay ruta pública nueva ni comodín; todo `/api/notifications/**`
  cae en `anyRequest().authenticated()`.
- **Aislamiento**: `*_id` como UUID sueltos, sin FK cross-schema (igual que `chat`/`transactions`).
- **Sin paginación** en el historial (igual que `chat`); el `GET` devuelve las últimas ~50.

## Diseño acordado

### Modelo de datos — `backend/src/main/resources/db/migration/notifications/V502__create_notifications_tables.sql`

`V501` ya crea el schema `notifications`; la primera migración de **tablas** es `V502`
(rango reservado `V5xx`).

```sql
CREATE TABLE notifications.notifications (
    id             UUID PRIMARY KEY,
    recipient_id   UUID         NOT NULL,
    type           VARCHAR(30)  NOT NULL,   -- NUEVO_MENSAJE_CHAT | TRANSACCION_CONFIRMADA
    title          VARCHAR(160) NOT NULL,
    body           TEXT         NOT NULL,
    link           VARCHAR(255),            -- ruta del frontend ("/chat/{id}", "/transacciones/{id}")
    source_ref_id  UUID,                    -- messageId / transactionId que originó la notif (Decisión 7)
    read_at        TIMESTAMPTZ,             -- NULL = no leída
    created_at     TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_notifications_recipient
    ON notifications.notifications (recipient_id, created_at DESC);
-- Dedupe (Decisión 7): re-entrega del mismo evento para el mismo destinatario. Lleva
-- recipient_id porque TransaccionConfirmada genera DOS notificaciones con el mismo
-- (type, source_ref_id) — una para el comprador y otra para el productor.
CREATE UNIQUE INDEX uq_notifications_source
    ON notifications.notifications (recipient_id, type, source_ref_id)
    WHERE source_ref_id IS NOT NULL;
```

**Entidades JPA** (`notifications/domain/`), patrón de `catalog.domain.Product` /
`chat.domain.Conversation`:
- `Notification` — `id` UUID generado en el constructor (no `@GeneratedValue`); `type`
  `@Enumerated(EnumType.STRING)` `@Column(length = 30)`; `readAt` `Instant` nullable ↔ `TIMESTAMPTZ`;
  `createdAt` `Instant`. Dominio: `markRead(Instant)` (no-op si ya estaba leída), `isRead()`.
- `NotificationType { NUEVO_MENSAJE_CHAT, TRANSACCION_CONFIRMADA }` (enum en `notifications/domain`).
- `ddl-auto: validate` → tipos EXACTOS (`VARCHAR(30)` para el enum, `TIMESTAMPTZ` para los `Instant`).

### Capa de aplicación — `notifications/application/`

- **`NotificationEventListener`** (`@Component`) — dos métodos, uno por evento, cada uno
  `@Async("notificationsExecutor") @TransactionalEventListener(phase = AFTER_COMMIT) @Transactional`:
  - `on(NuevoMensajeChat e)` → arma `title`/`body`/`link` (`/chat/{conversationId}`), chequea
    dedupe (`existsByRecipientIdAndTypeAndSourceRefId`, `sourceRefId = e.messageId()`) y guarda
    la notificación para `e.recipientId()`.
  - `on(TransaccionConfirmada e)` → crea **dos** notificaciones (`/transacciones/{transactionId}`,
    `sourceRefId = e.transactionId()`): una para `e.buyerId()` ("Tu compra fue confirmada") y
    otra para `e.producerId()` ("Tenés una venta confirmada"). El dedupe es por
    `(recipientId, type, sourceRefId)` — por eso el índice único lleva `recipient_id`.
  - Depende de `AuthModuleApi` y `CatalogModuleApi`. Todo el cuerpo en `try/catch` + `log.warn`:
    una notificación que falla nunca afecta a `chat`/`transactions`.
- **`NotificationService`** — `list(recipientId)` (últimas ~50, `created_at` desc),
  `unreadCount(recipientId)`, `markRead(id, recipientId)` (404 si no existe o no es del usuario),
  `markAllRead(recipientId)`.
- **`NotificationsAsyncConfig`** — `@Configuration @EnableAsync`; bean `notificationsExecutor`
  (`ThreadPoolTaskExecutor`, `core 2 / max 4 / queue 100`, prefijo de hilo `notif-`).

### Infraestructura — `notifications/infrastructure/NotificationRepository`

`JpaRepository<Notification, UUID>` +:
- `List<Notification> findTop50ByRecipientIdOrderByCreatedAtDesc(UUID recipientId)`
- `long countByRecipientIdAndReadAtIsNull(UUID recipientId)`
- `boolean existsByRecipientIdAndTypeAndSourceRefId(UUID recipientId, NotificationType type, UUID sourceRefId)` — dedupe
- `@Modifying @Query` para "marcar todas como leídas" del usuario en un solo `UPDATE` (devuelve `int` = filas afectadas).

### Endpoints REST (`/api/notifications`) — `notifications/web/NotificationController`

| Método | Ruta | Auth | Cuerpo / respuesta |
|---|---|---|---|
| `GET` | `/api/notifications` | autenticado | `NotificationListResponse { items: NotificationResponse[], unreadCount }`. `items` = últimas ~50 del usuario (`recipientId` = JWT), `created_at` desc. `NotificationResponse(id, type, title, body, link, read, createdAt)`. Una sola llamada sirve al badge y a la página. |
| `PUT` | `/api/notifications/{id}/read` | autenticado | Marca esa notificación como leída. 404 si no existe o no es del usuario (no se distingue, para no filtrar ids ajenos). 200 sin cuerpo (o la notif actualizada). |
| `PUT` | `/api/notifications/read-all` | autenticado | Marca todas las del usuario como leídas → 200 `{ updated: n }`. |

Sin cambios en `SecurityConfig` (todo `authenticated()` por default).

### Frontend

- **`notifications/types.ts`**: `NotificationType`, `Notification` (`{ id, type, title, body, link, read, createdAt }`),
  `NotificationList` (`{ items, unreadCount }`), `TYPE_LABELS`.
- **`notifications/api.ts`**: `listNotifications(token)`, `markNotificationRead(id, token)`,
  `markAllNotificationsRead(token)`.
- **`components/NotificationsBell.tsx`**: al montar y luego cada ~20 s (`setInterval`, limpiado en
  unmount) llama a `listNotifications`; muestra 🔔 con badge del `unreadCount`; enlaza a
  `/notificaciones`. Se renderiza en `Home` (rama autenticada).
- **`pages/NotificationsPage.tsx`** (`/notificaciones`, `ProtectedRoute` sin `role`): lista
  completa; al hacer clic en un ítem → `markNotificationRead(id)` y luego `navigate(item.link)`
  si hay link. Botón "marcar todas como leídas".
- **`App.tsx`**: ruta `/notificaciones`; `Home` renderiza `<NotificationsBell />` y un
  `<Link to="/notificaciones">`.

## Plan de pruebas (end-to-end, criterio de salida)

1. `cd backend && mvn test` verde — `ArchitectureTests` ve `notifications` sin violación de
   límites: importa solo `chat.NuevoMensajeChat`, `transactions.TransaccionConfirmada`,
   `auth.AuthModuleApi`, `catalog.CatalogModuleApi` y `shared`.
2. `docker compose down -v && docker compose up -d` + arranque → `V502` aplica desde cero.
3. Navegador, 2 sesiones (comprador y productor): el comprador manda un mensaje en `/chat/:id`.
   En pocos segundos, **sin recargar**, el badge del productor sube y aparece la notificación
   "Nuevo mensaje de {comprador}" que enlaza a `/chat/:id`. Al abrirla se marca leída y el badge baja.
4. Flujo de pago de Épica 4 (`stripe listen`): al confirmar el webhook, el comprador recibe
   "Compra confirmada" y el productor "Venta confirmada" (Decisión 4), ambas con link a
   `/transacciones/:id`. Se observa el **desfase asíncrono**: la notif aparece unos segundos
   después, vía el polling, sin que el usuario recargue.
5. "Marcar todas como leídas" → `unreadCount` a 0.
6. Un tercer usuario: `PUT /api/notifications/{id}/read` sobre una notif ajena → 404.
7. Idempotencia: `stripe events resend <id>` (o reenviar el evento de chat) → no se duplica la
   notificación (`existsByRecipientIdAndTypeAndSourceRefId` + índice único parcial); el REST responde igual.

## Archivos que nacerán (referencia)

**Backend — nuevos:**
- `notifications/domain/{Notification,NotificationType}.java`
- `notifications/application/{NotificationEventListener,NotificationService,NotificationsAsyncConfig}.java`
- `notifications/infrastructure/NotificationRepository.java`
- `notifications/web/NotificationController.java` + DTOs (`NotificationResponse`,
  `NotificationListResponse`, `MarkAllReadResponse`)
- `backend/src/main/resources/db/migration/notifications/V502__create_notifications_tables.sql`

**Backend — modificados:** ninguno previsto (módulo consumidor puro: sin cambios en `shared`,
`SecurityConfig`, `pom.xml` ni los otros módulos).

**Frontend — nuevos:**
- `notifications/{api,types}.ts`
- `components/NotificationsBell.tsx`
- `pages/NotificationsPage.tsx`

**Frontend — modificados:**
- `App.tsx` (ruta `/notificaciones` + `<NotificationsBell/>` y link en `Home`)

**Docs (al cerrar):** `docs/claude/estado-actual.md`, `docs/backlog.md`, este spec.
