# Épica 3 — Chat (RF5, RF6) · Spec

> **Estado: BORRADOR.** Las "Decisiones a resolver" de abajo **no están cerradas**. Al
> arrancar el chat de Épica 3: resolverlas con el usuario una por una (recomendación +
> porqué + alternativa, y el usuario elige), volcar el resultado en la sección "Diseño
> acordado", y recién entonces implementar. Fuente: `handoffs/handoff-epica-3.md` + `backlog.md` §Épica 3.
>
> **Depende de:** `auth` (identidad, `AuthModuleApi.getUserSummary`) y `catalog`
> (`CatalogModuleApi.getProductSummary` → producto + `producerId` + `status`).

## Alcance (del backlog)

**Backend** (nace `chat/`):
1. Abrir conversación asociada a un producto, entre comprador y productor. Valida el producto
   con `CatalogModuleApi.getProductSummary(productId)`; `buyerId` del JWT.
2. Mensajería en tiempo real vía WebSocket.
3. Historial de mensajes por conversación (REST).
4. Registrar la forma de compra acordada dentro del chat: `PLATFORM` / `OFF_PLATFORM`
   (campo simple en la conversación; no automatiza nada, solo registra la elección).
5. `ChatModuleApi` con lo que `transactions` (Épica 4) necesitará (ej. `getAgreedPurchase(conversationId)`).

**Frontend:**
1. Botón "Chatear" en `ProductDetailPage` (hoy deshabilitado) que abre/crea la conversación.
2. Ventana de chat con WebSocket real (mensajes en vivo, no polling): reconexión, JWT en el
   handshake, orden de mensajes.
3. Selector de forma de compra dentro del chat.

**Criterio de salida:** comprador y productor chatean en tiempo real desde la UI sobre un
producto y dejan registrada la forma de compra elegida. `mvn test` (ArchitectureTests) verde
con `chat` respetando límites de módulo (solo `auth.AuthModuleApi` y `catalog.CatalogModuleApi`).

## Decisiones a resolver (PENDIENTE — alinear con el usuario)

| # | Decisión | Recomendación tentativa | Alternativa |
|---|---|---|---|
| 1 | Transporte WebSocket | **STOMP** (`spring-boot-starter-websocket` + broker simple en memoria; cliente `@stomp/stompjs`): topics pub/sub, reconexión estándar | WS nativo (`WebSocketHandler` + `HandshakeInterceptor`): más liviano, ruteo/serialización a mano |
| 2 | Cómo viaja/valida el JWT en el WS | Header `Authorization: Bearer` en el frame `CONNECT` de STOMP, validado con un `ChannelInterceptor` que reusa el `JwtDecoder` de `SecurityConfig` y setea el `Principal` | Token en primer mensaje post-connect / subprotocolo. **Nunca** en query param |
| 3 | Persistencia del JWT en frontend (deferida desde Épica 1) | Resolverla **ahora** (el chat vive de sesión estable; un refresh mata sesión + socket) — `localStorage` del token | Seguir difiriendo: el chat asume "si recargás, volvés a loguear" |
| 4 | Unicidad de la conversación | Única por `(product_id, buyer_id)` (constraint único); solo el comprador la inicia, el productor responde | Permitir múltiples hilos por par |
| 5 | Modelo de datos `chat` (schema `chat`, `V302`) | `Conversation`(id, product_id, buyer_id, producer_id, created_at, agreed_purchase_method nullable) + `Message`(id, conversation_id, sender_id, body, sent_at). Sin FK cross-schema (UUID sueltos). Sin paginación en el historial (ordenar por `sent_at`) | Paginación desde ya; campos extra |
| 6 | "Forma de compra" — enum y quién la fija | `AgreedPurchaseMethod {PLATFORM, OFF_PLATFORM}` (null = sin acordar); cualquiera de las dos partes la fija, last-write-wins (sin máquina de estados); endpoint REST dedicado `PUT /api/chat/conversations/{id}/purchase-method` | Mensaje especial por WS; requerir confirmación de ambas partes |
| 7 | `ChatModuleApi.getAgreedPurchase(conversationId)` — forma | Mínimo: `(conversationId, productId, buyerId, producerId, method)`; `transactions` re-consulta precio/cantidad a `catalog` | Congelar precio/cantidad al momento del acuerdo |
| 8 | Evento `NuevoMensajeChat` | Publicarlo **ya** con `ApplicationEventPublisher` aunque Épica 5 aún no tenga listener (así Épica 5 es puro consumidor) | Diferir a Épica 5 |
| 9 | Autorización sobre una conversación | Solo el `buyerId` y el `producerId` de esa conversación leen el historial y postean (patrón "dueño" de catalog, con dos partes). Aplica al REST y al handler WS | — |
| 10 | CORS del WebSocket | El endpoint de handshake (`/ws`) necesita su propio `setAllowedOrigins(http://localhost:5173)` en la config de WebSocket (el `CorsConfigurationSource` actual solo cubre HTTP) | — |

## Diseño acordado

_(Se completa tras resolver la tabla anterior. Lo de abajo es el borrador asumiendo que se
aceptan todas las recomendaciones tentativas — no implementar hasta confirmar.)_

### Modelo de datos — `db/migration/chat/V302__create_chat_tables.sql`
- `chat.conversations` — `id UUID PK`, `product_id UUID NOT NULL`, `buyer_id UUID NOT NULL`,
  `producer_id UUID NOT NULL`, `agreed_purchase_method VARCHAR(20)` (null), `created_at TIMESTAMPTZ`.
  Único `(product_id, buyer_id)`.
- `chat.messages` — `id UUID PK`, `conversation_id UUID NOT NULL`, `sender_id UUID NOT NULL`,
  `body TEXT NOT NULL`, `sent_at TIMESTAMPTZ`. Índice `(conversation_id, sent_at)`.

### Endpoints REST (`/api/chat`)
- `POST /api/chat/conversations` — body `{productId}`; `buyerId` del JWT (`hasRole('BUYER')`).
  Valida producto vía `CatalogModuleApi`; crea o devuelve la conversación existente.
- `GET /api/chat/conversations` — lista las conversaciones del usuario autenticado (como buyer o producer).
- `GET /api/chat/conversations/{id}/messages` — historial ordenado por `sent_at`; solo las dos partes (403 si no).
- `PUT /api/chat/conversations/{id}/purchase-method` — body `{method}`; solo las dos partes.

### WebSocket (STOMP)
- Handshake en `/ws`. `CONNECT` con `Authorization: Bearer <jwt>`; `ChannelInterceptor` valida
  con el `JwtDecoder` bean y setea `Principal`.
- Suscripción: `/topic/conversations/{id}` (solo si el `Principal` es parte de la conversación).
- Envío: `/app/conversations/{id}/messages` → persiste `Message`, publica a `/topic/...` y
  dispara el evento `NuevoMensajeChat`.

### `ChatModuleApi`
```java
record AgreedPurchase(UUID conversationId, UUID productId, UUID buyerId, UUID producerId, AgreedPurchaseMethod method) {}
AgreedPurchase getAgreedPurchase(UUID conversationId); // 404 si no existe
```

### Evento
`NuevoMensajeChat(conversationId, messageId, senderId, recipientId)` — `ApplicationEventPublisher`,
sin listener en esta épica.

### Frontend
- `chat/{api.ts, types.ts}` + dependencia `@stomp/stompjs`.
- `pages/ConversationPage.tsx` (`/chat/:conversationId`, `ProtectedRoute` sin `role` fijo —
  ambas partes). Lista de conversaciones en `/chat` o en `Home`.
- `ProductDetailPage`: habilitar el botón "Chatear" (solo `BUYER`, producto `ACTIVE`) → `POST` + navegar.
- Resolver persistencia del token en `AuthContext` (decisión #3).

## Plan de pruebas (end-to-end, criterio de salida)
1. `mvn test` verde (ArchitectureTests ve `chat`, sin violaciones de límite).
2. Navegador: comprador abre `/productos/:id` de un productor distinto → "Chatear" → se crea la conversación.
3. Dos navegadores (comprador y productor) en la misma conversación → un mensaje aparece en vivo en el otro sin recargar.
4. Reconexión: cortar red / recargar → el socket se restablece y el historial se recarga por REST.
5. Selector de forma de compra → `PLATFORM` → persiste y se ve en ambos lados.
6. Un tercer usuario no puede leer ni postear en esa conversación (403).

## Archivos que nacerán (referencia)
- Backend: `chat/` (ModuleApi + tipos, `domain/{Conversation,Message}`, `application/*`,
  `infrastructure/*`, `web/{REST + WS config + handlers}`), `db/migration/chat/V302__...sql`,
  cambios en `shared/security/SecurityConfig` (permitAll `/ws` si aplica) y config WebSocket.
- Frontend: `chat/{api,types}.ts`, `pages/ConversationPage.tsx`, cambios en `ProductDetailPage`,
  `AuthContext`, `App.tsx`, `package.json` (`@stomp/stompjs`).
