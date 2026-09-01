# Épica 3 — Chat (RF5, RF6) · Spec

> **Estado: ACORDADO** (2026-08-31). Las 10 decisiones de abajo están resueltas con el
> usuario; este documento es el diseño contra el que se implementa. Si algo cambia durante
> la implementación, se actualiza acá en el momento.
>
> **Depende de:** `auth` (`AuthModuleApi.getUserSummary` → nombre del otro participante) y
> `catalog` (`CatalogModuleApi.getProductSummary` → producto existe + `producerId` + `status`).
> `chat` **no** expone datos a esos módulos; sí publicará un evento que `notifications`
> (Épica 5) consumirá.

## Alcance (del backlog)

**Backend** (nace `chat/`):
1. Abrir conversación asociada a un producto, entre comprador y productor. Valida el producto
   con `CatalogModuleApi.getProductSummary(productId)`; `buyerId` del JWT.
2. Mensajería en tiempo real vía WebSocket (STOMP).
3. Historial de mensajes por conversación (REST, solo lectura).
4. Registrar la forma de compra acordada dentro del chat: `PLATFORM` / `OFF_PLATFORM`
   (campo simple en la conversación; no automatiza nada, solo registra la elección).
5. `ChatModuleApi` con lo que `transactions` (Épica 4) necesitará (`getAgreedPurchase(conversationId)`).

**Frontend:**
1. Botón "Chatear" en `ProductDetailPage` (hoy deshabilitado) que abre/crea la conversación.
2. Ventana de chat con WebSocket real (mensajes en vivo, no polling): reconexión, JWT en el
   handshake STOMP, orden de mensajes.
3. Selector de forma de compra dentro del chat.
4. Página "Mis conversaciones" (entry point del productor para descubrir conversaciones que
   abrió un comprador).
5. Persistencia del JWT en `localStorage` (deuda de Épica 1, se salda acá).

**Criterio de salida:** comprador y productor chatean en tiempo real desde la UI sobre un
producto y dejan registrada la forma de compra elegida. `mvn test` (ArchitectureTests) verde
con `chat` respetando límites de módulo (solo `auth.AuthModuleApi` y `catalog.CatalogModuleApi`,
más `shared`).

## Decisiones tomadas

| # | Decisión | Resolución | Porqué / alternativa descartada |
|---|---|---|---|
| 1 | Transporte WebSocket | **STOMP** sobre `spring-boot-starter-websocket`, broker simple en memoria (`/topic`), prefijo de app `/app`. Cliente `@stomp/stompjs`. | Respuesta idiomática de Spring: pub/sub por topic y reconexión estándar del cliente sin escribirla. Descartado WS nativo (`WebSocketHandler`): obliga a rutear/serializar y mantener sesiones por conversación a mano, justo en la parte más delicada. RabbitMQ como relay STOMP queda para post-extracción. |
| 2 | JWT en el WebSocket | Header `Authorization: Bearer <jwt>` en el frame **`CONNECT`** de STOMP. Un `ChannelInterceptor` sobre el canal inbound valida ese token con el `JwtDecoder` bean de `shared/security/SecurityConfig` y setea el `Principal` (name = `sub`). | El handshake HTTP no lleva el token (el cliente STOMP no controla esos headers de forma portable); el `CONNECT` sí. Reusar el `JwtDecoder` = misma validación HS256 que el REST. **Nunca** `?token=` en la URL (regla de seguridad: nada sensible en query params). |
| 3 | Persistencia del JWT en frontend | `localStorage`. `AuthContext` inicializa el token desde `localStorage` al montar, lo escribe en login y lo borra en logout. El `user` se rehidrata **decodificando el payload del JWT** (base64, sin verificar firma — solo para leer `sub`/`role`/`name`). Si una llamada devuelve 401, limpiar y mandar a `/login`. | El chat vive de sesión estable: hoy un refresh mata sesión + socket y hace imposible probar reconexión. `localStorage` es el mínimo viable. Descartado refresh token (sobre-ingeniería para fase 1, contradice "sin patrones no acordados"). Riesgo aceptado: token legible por JS (XSS) — MVP académico. |
| 4 | Unicidad de la conversación | Una por `(product_id, buyer_id)` — constraint `UNIQUE`. Solo el `BUYER` la crea; `POST` es idempotente (crea o devuelve la existente). El productor solo responde. | RF5 lo sugiere ("desde el producto, el comprador abre un chat"). Evita hilos duplicados en la UI. Descartado permitir múltiples hilos por par: ningún RF lo pide y complica lista y reapertura. |
| 5 | Modelo de datos `chat` (`V302`) | `Conversation`(id, product_id, buyer_id, producer_id, agreed_purchase_method nullable, created_at) + `Message`(id, conversation_id, sender_id, body, sent_at). Sin FK cross-schema (UUID sueltos). Sin paginación en el historial. | Mismo criterio que `catalog`: sin FK entre schemas (aislamiento lógico = futuras BDs separadas). Paginación descartada por ahora: el backlog no la pide y "sin patrones no acordados" desaconseja adelantarla; si hace falta se agrega `?before=&limit=` sin romper el contrato. |
| 6 | "Forma de compra" — enum y quién la fija | `AgreedPurchaseMethod { PLATFORM, OFF_PLATFORM }` (null = sin acordar). Endpoint REST dedicado `PUT /api/chat/conversations/{id}/purchase-method`. Cualquiera de las dos partes la fija, **last-write-wins**, sin máquina de estados. | El backlog es explícito: "no automatiza nada, solo registra la elección de las partes". Descartado mensaje especial por WS / confirmación de ambas partes: scope creep, el sistema no valida ni interviene en este acuerdo (PDR §2). |
| 7 | `ChatModuleApi.getAgreedPurchase` — forma | `record AgreedPurchase(UUID conversationId, UUID productId, UUID buyerId, UUID producerId, AgreedPurchaseMethod method)`. 404 si la conversación no existe. Transacciones re-consulta precio/cantidad a `CatalogModuleApi` cuando lo necesite. | Mismo criterio que `ProductSummary`: contrato chico, sin acoplamiento temporal. Descartado congelar precio/cantidad al acordar: mete datos de `catalog` en el schema de `chat` y presupone cómo Épica 4 quiere manejar cambios de precio. |
| 8 | Evento `NuevoMensajeChat` | Se publica **ya** en esta épica con `ApplicationEventPublisher`, al persistir cada mensaje, dentro de la misma transacción. Sin listener todavía. | Épica 5 queda como puro consumidor (solo agrega el `@TransactionalEventListener`). El publisher es una línea; el nombre ya está en el PDR/architecture.md §3. |
| 9 | Autorización sobre una conversación | En toda operación sobre una conversación (GET historial, GET detalle, PUT purchase-method, `SUBSCRIBE` al topic, `SEND` de mensaje) se verifica que el usuario autenticado sea el `buyer_id` **o** el `producer_id` de esa conversación. Si no: 403 (REST) / se rechaza el frame (WS). | Patrón "dueño" de `catalog`, extendido a dos partes permitidas. |
| 10 | CORS / seguridad del endpoint WS | Handshake en `/ws`, agregado al `permitAll()` de `SecurityConfig` (la auth real es el `CONNECT`). En la config STOMP: `addEndpoint("/ws").setAllowedOrigins("http://localhost:5173")`, **sin SockJS** (el cliente `@stomp/stompjs` usa WebSocket nativo del browser; SockJS es fallback innecesario en local). | El `CorsConfigurationSource` HTTP no cubre el handshake de upgrade. `permitAll` en `/ws` porque el handshake no lleva token. |

### Puntos menores fijados al alinear (no eran decisiones abiertas)

- **`AgreedPurchaseMethod` y `NuevoMensajeChat`** viven en el **paquete raíz** `com.huila.marketplace.chat` (son parte del contrato del módulo hacia afuera, como `ProductStatus` en `catalog`).
- **`SOLD_OUT` no bloquea el chat en el backend.** El `POST` valida solo que el producto exista y no esté borrado, y que `buyer != producer`. El gating por `SOLD_OUT` es de UI (el botón "Chatear" no se muestra), porque un producto agotado puede volver a `ACTIVE` y la conversación se reusa.
- **El envío de mensajes es solo por WS** (`SEND` a `/app/...`). No hay `POST` REST de mensaje. El REST de historial es solo lectura.
- **`mvn`** bajará una dependencia nueva: `spring-boot-starter-websocket`.

## Diseño acordado

### Modelo de datos — `backend/src/main/resources/db/migration/chat/V302__create_chat_tables.sql`

```sql
CREATE TABLE chat.conversations (
    id                     UUID PRIMARY KEY,
    product_id             UUID        NOT NULL,
    buyer_id               UUID        NOT NULL,
    producer_id            UUID        NOT NULL,
    agreed_purchase_method VARCHAR(20),
    created_at             TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_conversation_product_buyer UNIQUE (product_id, buyer_id)
);
CREATE INDEX idx_conversations_buyer    ON chat.conversations (buyer_id);
CREATE INDEX idx_conversations_producer ON chat.conversations (producer_id);

CREATE TABLE chat.messages (
    id              UUID PRIMARY KEY,
    conversation_id UUID        NOT NULL,
    sender_id       UUID        NOT NULL,
    body            TEXT        NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_messages_conversation_sent ON chat.messages (conversation_id, sent_at);
```

**Entidades JPA** (`chat/domain/`), patrón de `catalog.domain.Product`:
- `Conversation` — `id` UUID generado en el constructor (no `@GeneratedValue`); `agreedPurchaseMethod`
  `@Enumerated(EnumType.STRING)` `@Column(length = 20)`, nullable; `createdAt` `Instant` ↔ `TIMESTAMPTZ`.
  Método de dominio `agree(AgreedPurchaseMethod)` (last-write-wins) y `hasParticipant(UUID)`.
- `Message` — `id` UUID en el constructor; `body` `@Column(columnDefinition = "text")`; `sentAt` `Instant`.
- `ddl-auto: validate` → los tipos deben calzar EXACTO (largo de `VARCHAR(20)` para el enum, `TIMESTAMPTZ`).

### Contrato público — `chat/` (paquete raíz)

```java
public interface ChatModuleApi {
    AgreedPurchase getAgreedPurchase(UUID conversationId); // 404 (ResponseStatusException) si no existe
}

public record AgreedPurchase(
    UUID conversationId, UUID productId, UUID buyerId, UUID producerId,
    AgreedPurchaseMethod method) {}   // method == null → sin acordar todavía

public enum AgreedPurchaseMethod { PLATFORM, OFF_PLATFORM }

public record NuevoMensajeChat(
    UUID conversationId, UUID messageId, UUID senderId, UUID recipientId) {}
```

`ChatModuleApiImpl` (`chat/application/`) va **directo al repositorio** (no pasa por
`ConversationService`, que modela casos de uso con autorización que no aplican entre módulos) —
mismo patrón que `CatalogModuleApiImpl` / `AuthModuleApiImpl`.

### Endpoints REST (`/api/chat`) — `chat/web/ChatController`

| Método | Ruta | Auth | Cuerpo / respuesta |
|---|---|---|---|
| `POST` | `/api/chat/conversations` | `hasRole('BUYER')` | `{ productId }` → 201 `ConversationResponse`. Valida producto vía `CatalogModuleApi` (404 se propaga); `buyerId` del JWT; `producerId` del `ProductSummary`. Rechaza `buyer == producer` (400). Idempotente: si ya existe `(productId, buyerId)`, devuelve esa (200). |
| `GET` | `/api/chat/conversations` | autenticado | Lista `ConversationSummaryResponse[]` donde el usuario es `buyer` **o** `producer`. Cada item: `id`, `productId`, `productName` (vía `CatalogModuleApi`), `otherParticipantName` (vía `AuthModuleApi.getUserSummary`), `agreedPurchaseMethod`, `lastMessageAt`. Orden: actividad reciente desc. |
| `GET` | `/api/chat/conversations/{id}` | autenticado, **solo las 2 partes** (403) | `ConversationResponse` con nombres resueltos — para la cabecera de la ventana cuando se entra por URL directa. |
| `GET` | `/api/chat/conversations/{id}/messages` | autenticado, **solo las 2 partes** (403) | `MessageResponse[]` (`id`, `conversationId`, `senderId`, `body`, `sentAt`), orden `sent_at` asc. Sin paginación. |
| `PUT` | `/api/chat/conversations/{id}/purchase-method` | autenticado, **solo las 2 partes** (403) | `{ method: "PLATFORM" \| "OFF_PLATFORM" }` → 200 `ConversationResponse`. Last-write-wins. |

Rutas nuevas en `SecurityConfig`: solo `/ws/**` va a `permitAll()`. Todo `/api/chat/**` es
`authenticated()` por el default; el rol/2-partes se resuelve por método (`@PreAuthorize` +
chequeo de participante en `ConversationService`). Errores de negocio → `ResponseStatusException`.

### WebSocket STOMP — `chat/web/`

- **`WebSocketConfig`** (`@EnableWebSocketMessageBroker`):
  - `registry.addEndpoint("/ws").setAllowedOrigins("http://localhost:5173")` (sin SockJS).
  - `registry.enableSimpleBroker("/topic")`; `registry.setApplicationDestinationPrefixes("/app")`.
  - `configureClientInboundChannel(...)` → registra `StompAuthChannelInterceptor`.
- **`StompAuthChannelInterceptor`** (`ChannelInterceptor`):
  - En `StompCommand.CONNECT`: lee `Authorization: Bearer <jwt>`, valida con el `JwtDecoder`
    bean; si falla, `throw` (rechaza el CONNECT). Setea `accessor.setUser(...)` con el `sub`.
  - En `SUBSCRIBE` a `/topic/conversations/{id}` y `SEND` a `/app/conversations/{id}/messages`:
    verifica que el `Principal` sea parte de esa conversación (consulta a `ConversationService`);
    si no, `throw`.
- **`ChatMessagingController`** (`@MessageMapping("/conversations/{id}/messages")`):
  - Body `{ body }`. Valida: `Principal` es parte, `body` no vacío, `length <= 2000`.
  - Persiste `Message` (`senderId` = Principal), publica `MessageResponse` a
    `/topic/conversations/{id}`, y `applicationEventPublisher.publishEvent(new NuevoMensajeChat(...))`
    (`recipientId` = la otra parte) — todo en la misma transacción.

### Frontend

- **`package.json`**: `+ @stomp/stompjs`.
- **`auth/AuthContext.tsx`**: token desde/hacia `localStorage`; `user` decodificado del JWT al
  rehidratar; `logout()` limpia `localStorage`. (Decisión #3.)
- **`api/client.ts`**: helper `wsUrl()` que deriva `ws://…/ws` de `VITE_API_BASE_URL`.
- **`chat/types.ts`**: `Conversation`, `ConversationSummary`, `Message`, `AgreedPurchaseMethod`,
  `PURCHASE_METHOD_LABELS`.
- **`chat/api.ts`**: `createConversation(productId, token)`, `listConversations(token)`,
  `getConversation(id, token)`, `getMessages(id, token)`, `setPurchaseMethod(id, method, token)`.
- **`chat/ws.ts`**: fábrica del `Client` STOMP (`brokerURL: wsUrl()`, `connectHeaders:
  { Authorization: 'Bearer ' + token }`, `reconnectDelay: 5000`), con helpers `subscribe`/`send`.
- **`pages/ConversationPage.tsx`** (`/chat/:conversationId`, `ProtectedRoute` sin `role`):
  carga historial por REST → abre STOMP → `SUBSCRIBE /topic/conversations/{id}` → append en vivo;
  input que hace `SEND /app/conversations/{id}/messages`; selector de forma de compra
  (`setPurchaseMethod` + refleja el valor); header con `otherParticipantName` + `productName`.
  Al reconectar el socket, recargar el historial por REST (cubre los mensajes perdidos durante el corte).
- **`pages/ConversationsPage.tsx`** (`/chat`, `ProtectedRoute` sin `role`): lista de
  `listConversations()`. Entry point del productor.
- **`pages/ProductDetailPage.tsx`**: "Chatear" habilitado solo si hay sesión, `role === 'BUYER'`,
  el producto no es propio y `status === 'ACTIVE'`. Click → `createConversation` → navegar a `/chat/:id`.
- **`App.tsx`**: rutas `/chat` y `/chat/:conversationId`; link "Mis conversaciones" en `Home`.

## Plan de pruebas (end-to-end, criterio de salida)

1. `cd backend && mvn test` verde — `ArchitectureTests` ve `chat` y no hay violaciones de
   límite (`chat` importa solo `auth.AuthModuleApi`, `catalog.CatalogModuleApi` + tipos, y `shared`).
2. Navegador: comprador logueado abre `/productos/:id` de **otro** productor → "Chatear" →
   se crea la conversación y navega a `/chat/:id`. Segundo "Chatear" sobre el mismo producto →
   misma conversación (idempotente).
3. Dos sesiones (comprador en un navegador, productor en ventana incógnito) en la misma
   conversación → un mensaje enviado por uno aparece en vivo en el otro sin recargar; el orden
   se mantiene.
4. Reconexión: recargar la página del comprador → el token sobrevive en `localStorage`, la
   sesión no se pierde, el socket se restablece solo y el historial se recarga por REST.
5. Selector de forma de compra → `PLATFORM` → `PUT` persiste; al recargar y en el otro lado
   se ve el valor.
6. Un tercer usuario (otro comprador): `GET /api/chat/conversations/{id}/messages` → 403;
   intento de `SUBSCRIBE` a ese `/topic/conversations/{id}` → rechazado.
7. `mvn spring-boot:run` arranca con la migración `V302` aplicada desde cero
   (`docker compose down -v && up -d`).

## Archivos que nacerán (referencia)

**Backend — nuevos:**
- `chat/ChatModuleApi.java`, `chat/AgreedPurchase.java`, `chat/AgreedPurchaseMethod.java`, `chat/NuevoMensajeChat.java`
- `chat/domain/{Conversation,Message}.java`
- `chat/application/{ConversationService,ChatModuleApiImpl}.java`
- `chat/infrastructure/{ConversationRepository,MessageRepository}.java`
- `chat/web/{ChatController,ChatMessagingController,WebSocketConfig,StompAuthChannelInterceptor}.java` + DTOs
  (`CreateConversationRequest`, `ConversationResponse`, `ConversationSummaryResponse`, `MessageResponse`,
  `PurchaseMethodRequest`, `SendMessagePayload`)
- `backend/src/main/resources/db/migration/chat/V302__create_chat_tables.sql`

**Backend — modificados:**
- `shared/security/SecurityConfig.java` (`permitAll` en `/ws/**`)
- `backend/pom.xml` (`spring-boot-starter-websocket`)

**Frontend — nuevos:**
- `chat/{api,types,ws}.ts`
- `pages/{ConversationsPage,ConversationPage}.tsx`

**Frontend — modificados:**
- `auth/AuthContext.tsx` (localStorage), `api/client.ts` (`wsUrl()`), `pages/ProductDetailPage.tsx`
  (habilitar botón), `App.tsx` (rutas + link), `package.json` (`@stomp/stompjs`)

**Docs (al cerrar):** `docs/claude/estado-actual.md`, `docs/backlog.md`, este spec.
