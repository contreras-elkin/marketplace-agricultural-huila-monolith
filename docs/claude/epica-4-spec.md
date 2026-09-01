# Épica 4 — Transacciones (RF7, RF8) · Spec

> **Estado: ACORDADO** (2026-09-01). Las 11 decisiones de abajo están resueltas con el
> usuario; este documento es el diseño contra el que se implementa. Si algo cambia durante
> la implementación, se actualiza acá en el momento.
>
> **Depende de:**
> - `chat` — `ChatModuleApi.getAgreedPurchase(conversationId)` → `AgreedPurchase(conversationId,
>   productId, buyerId, producerId, method)`. De acá sale el acuerdo "por plataforma".
> - `catalog` — `CatalogModuleApi.getProductSummary(productId)` → `ProductSummary(id, name,
>   producerId, status, price, unit)`. De acá salen precio y cantidad publicada al momento de pagar.
> - `auth` — `AuthModuleApi.getUserSummary(userId)` → nombre de comprador y productor para
>   las vistas de estado y de ventas.
>
> `transactions` **sí** expone `TransactionsModuleApi.getTransaction(id)` (Decisión 7) y
> **publica** el evento `TransaccionConfirmada`, que `notifications` (Épica 5) consumirá.

## Alcance (del backlog)

**Backend** (nace `transactions/`):
1. Integración con **Stripe en test mode** (Checkout Session alojada): iniciar el cobro de una
   compra "por plataforma" acordada en el chat.
2. **Ledger interno**: al confirmarse el pago, registrar la dispersión hacia el productor
   (bruto, comisión de plataforma —0% en fase 1—, neto).
3. **Webhook** de Stripe → confirma la transacción automáticamente (sin intervención del
   comprador después de pagar).
4. Publica el evento en proceso **`TransaccionConfirmada`** al confirmarse (sin listener
   hasta Épica 5, igual que `chat` publicó `NuevoMensajeChat`).

**Frontend:**
1. Flujo de pago **desde el chat** cuando la forma de compra acordada es `PLATFORM`:
   el comprador ve el total (precio × cantidad publicada) y arranca el pago con un clic.
2. Pantalla de **estado de la transacción** (pendiente / confirmada / fallida) para el comprador.
3. Vista simple de **ventas / ledger** para el productor (bruto, comisión, neto por venta).

**Criterio de salida:** una compra "por plataforma" acordada en el chat se paga en sandbox
desde la UI, el webhook la confirma sola, el comprador ve el estado actualizado, y el ledger
interno queda con el registro de dispersión. `mvn test` (ArchitectureTests) verde con
`transactions` respetando límites de módulo (solo `chat.ChatModuleApi`, `catalog.CatalogModuleApi`,
`auth.AuthModuleApi` + sus tipos, y `shared` — más el SDK externo de Stripe).

## Decisiones tomadas

| # | Decisión | Resolución | Porqué / alternativa descartada |
|---|---|---|---|
| 1 | Pasarela sandbox | **Stripe (test mode)** con **Checkout Session alojada** (redirect). Dependencia `com.stripe:stripe-java`. | Mejor doc de verificación de firma de webhook; `stripe listen` reenvía el webhook a `localhost` sin túnel; tarjetas de prueba conocidas (`4242…`); Checkout alojado ⇒ ningún dato de tarjeta pasa por el frontend. Requiere cuenta Stripe gratuita (test mode) + `stripe` CLI. Descartado: MercadoPago sandbox (setup más engorroso), pasarela simulada en el repo (no ejercita SDK ni firma reales). |
| 2 | ¿SDK/tokenización en el navegador? | **No.** El frontend solo hace `window.location.href = checkoutUrl`. Sin `@stripe/stripe-js`, sin campos de tarjeta en React. | Consecuencia directa de D1 (Checkout alojado). Responde la alerta del backlog. Descartado Stripe Elements embebido (mete PCI en el cliente). |
| 3 | Cantidad y monto | **Se compra todo el listado.** `quantity = product.quantity`, `unit_price = product.price`, `amount = unit_price × quantity`, traídos de `CatalogModuleApi` y **congelados** en la fila de la transacción. Sin input de cantidad en la UI. El monto nunca se acepta del cliente. | Más simple: el botón de pago muestra "Pagar $X" y listo. Descartado: input de cantidad (más UI/validación sin RF que lo pida); agregar "cantidad acordada" al chat (toca la Épica 3 cerrada). |
| 4 | Stock | **Validar `product.quantity > 0`; no descontar stock.** | Ningún RF pide gestión de inventario; el productor marca `SOLD_OUT` a mano (Épica 2). *Limitación aceptada:* dos compradores en conversaciones distintas podrían "comprar todo el listado" del mismo producto — el productor lo marca `SOLD_OUT` cuando corresponde. Descartado: descontar stock al confirmar (concurrencia/reposición sin RF). |
| 5 | Forma del ledger | **Una fila `ledger_entries` por transacción confirmada** (append-only): `transaction_id`, `producer_id`, `gross_amount`, `platform_fee_amount`, `net_amount`, `currency`, `created_at`. `UNIQUE (transaction_id)`. | Mínimo que satisface "registra la dispersión hacia el productor" y alimenta la vista del productor. Descartado: doble entrada / 2 filas con `entry_type` (architecture.md §6 desaconseja maquinaria extra). |
| 6 | Comisión de plataforma | **0% (passthrough)** en fase 1. Se **mantiene** la columna `platform_fee_amount` (siempre `0.00`) y la config `app.transactions.platform-fee-rate` (default `0.00`), más un helper `PlatformFee` — así activar comisión después es un cambio de config, sin tocar el schema. `net = gross − fee`. | El corte de plataforma no es un RF y agrega ruido a la demo. La estructura queda lista por si se quiere activar. Descartado: 5% fijo (número inventado sin respaldo). |
| 7 | `TransactionsModuleApi` | **Se crea ya**, con `getTransaction(UUID) : TransactionInfo` (404 si no existe). `TransactionInfo(id, conversationId, productId, buyerId, producerId, amount, currency, status)` + enum `TransactionStatus` en el **paquete raíz** `transactions` (como `catalog.ProductStatus`). | Decisión del usuario: tener el contrato síncrono listo aunque hoy no tenga consumidor. `TransactionsModuleApiImpl` va directo al repo (patrón de `ChatModuleApiImpl`). |
| 8 | Moneda | **`COP`** (pesos colombianos). `NUMERIC(12,2)` en la BD. Stripe trata `COP` como **moneda de dos decimales** (no zero-decimal, verificado en docs.stripe.com/currencies) → el monto se envía en **centavos** (`amount × 100`, entero); la conversión vive **solo** en `StripePaymentGateway`. Máx. Stripe para COP: 99.999.999,99. | Coherente con el dominio (precios del catálogo en pesos). Descartado: `usd` en test mode (menos honesto con el dominio; la aritmética ×100 es la misma). |
| 9 | Transacción ↔ conversación | **Una transacción activa por conversación.** Si ya hay una `PENDING` o `CONFIRMED` para esa conversación, `POST /api/transactions` responde **409** con el id de la existente (el frontend lleva al comprador a `/transacciones/{id}`). Una `FAILED` no bloquea (permite reintentar). | Demo sin ambigüedad de doble cobro. Descartado: permitir varias (más estados/UI sin RF). |
| 10 | Webhook: eventos | Escuchar **`checkout.session.completed`** (`payment_status == 'paid'`) → `PENDING → CONFIRMED` **una sola vez** (idempotente por `gateway_session_id`; si ya está `CONFIRMED`, `200` no-op). Escuchar **`checkout.session.expired`** → `FAILED` (libera la conversación para reintentar). Firma verificada con `app.stripe.webhook-secret` sobre el body **crudo**; inválida → **400**. Respuesta `200` siempre que la firma sea válida. | Cubre happy path + sesión abandonada. Descartado: solo `completed` (una sesión no pagada quedaría `PENDING` para siempre y bloquearía la conversación por D9). |
| 11 | Forma de `TransaccionConfirmada` | `record TransaccionConfirmada(UUID transactionId, UUID conversationId, UUID productId, UUID buyerId, UUID producerId, BigDecimal amount)` en el paquete raíz `transactions`. Publicado con `ApplicationEventPublisher` dentro de la transacción del webhook. Sin listener hasta Épica 5. | Épica 5 arma la notificación para comprador y productor con el monto sin re-consultar. Descartado: `(transactionId, buyerId)` (insuficiente para el texto de la notificación). |

### Puntos menores fijados al alinear (no eran decisiones abiertas)

- **`POST /api/transactions` exige `product.status == ACTIVE`** (409 si `SOLD_OUT`) además de que el producto exista. El chat sí permite conversaciones sobre `SOLD_OUT` (Épica 3), pero pagar un producto agotado no tiene sentido.
- **`catalog.ProductSummary` gana un campo `quantity`** (`BigDecimal`). Decisión 3 ("se compra todo el listado") necesita la cantidad publicada y el monto se calcula en el backend, nunca desde el request. Evolucionar el record público de `catalog` es la vía sancionada entre módulos (se actualizó `CatalogModuleApiImpl`; ningún otro consumidor construye `ProductSummary`, solo usa accessors). Descartado: un `getQuantity()` aparte en `CatalogModuleApi` (segundo round-trip) o mandar la cantidad en el body (manipulable).
- **`MyTransactionResponse` incluye `conversationId`**: la pantalla de chat, al recibir 409 en `POST /api/transactions`, busca en `GET /api/transactions/mine` la transacción viva de esa conversación y navega a su estado — sin endpoint nuevo.
- **Errores de negocio:** `ResponseStatusException` directo (sin jerarquía propia) — architecture.md §5.
- **Usuario y rol:** desde el JWT (`@AuthenticationPrincipal Jwt jwt`, `@PreAuthorize`).
- **`TransactionStatus { PENDING, CONFIRMED, FAILED }`** en el **paquete raíz** `transactions` (aparece en `TransactionInfo` del `ModuleApi`, como `catalog.ProductStatus`). La entidad JPA usa el mismo enum.
- **Aislamiento:** `transactions` nunca toca los schemas `chat`/`catalog`/`auth`; `*_id` como UUID sueltos, sin FK cross-schema.
- **Sin Saga / sin Outbox** (architecture.md §6): confirmar el pago es **una** transacción local ACID — update de estado + insert del ledger + `publishEvent` juntos.
- **Config de Stripe con default de dev** (como `app.jwt.secret`): el arranque **no** falla si falta la API key; `Stripe.apiKey` se setea en un `@PostConstruct` del gateway y las llamadas solo ocurren en runtime. `mvn test` (solo `ArchitectureTests`, análisis estático) no toca Stripe.
- **`mvn`** bajará `com.stripe:stripe-java` (última versión estable).

## Diseño acordado

### Modelo de datos — `backend/src/main/resources/db/migration/transactions/V402__create_transactions_tables.sql`

`V401` ya crea el schema `transactions`; la primera migración de **tablas** es `V402` (rango reservado `V4xx`).

```sql
CREATE TABLE transactions.transactions (
    id                  UUID PRIMARY KEY,
    conversation_id     UUID        NOT NULL,
    product_id          UUID        NOT NULL,
    buyer_id            UUID        NOT NULL,
    producer_id         UUID        NOT NULL,
    quantity            NUMERIC(12, 2) NOT NULL,
    unit_price          NUMERIC(12, 2) NOT NULL,
    amount              NUMERIC(12, 2) NOT NULL,
    currency            VARCHAR(3)  NOT NULL,
    status              VARCHAR(20) NOT NULL,
    gateway_session_id  VARCHAR(255),
    gateway_payment_id  VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL,
    confirmed_at        TIMESTAMPTZ
);
CREATE INDEX idx_transactions_conversation ON transactions.transactions (conversation_id);
CREATE INDEX idx_transactions_buyer        ON transactions.transactions (buyer_id);
CREATE INDEX idx_transactions_producer     ON transactions.transactions (producer_id);
CREATE UNIQUE INDEX uq_transactions_session ON transactions.transactions (gateway_session_id)
    WHERE gateway_session_id IS NOT NULL;

CREATE TABLE transactions.ledger_entries (
    id                   UUID PRIMARY KEY,
    transaction_id       UUID        NOT NULL,
    producer_id          UUID        NOT NULL,
    gross_amount         NUMERIC(12, 2) NOT NULL,
    platform_fee_amount  NUMERIC(12, 2) NOT NULL,
    net_amount           NUMERIC(12, 2) NOT NULL,
    currency             VARCHAR(3)  NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_ledger_transaction UNIQUE (transaction_id)
);
CREATE INDEX idx_ledger_producer ON transactions.ledger_entries (producer_id);
```

**Entidades JPA** (`transactions/domain/`), patrón de `catalog.domain.Product` / `chat.domain.Conversation`:
- `Transaction` — `id` UUID generado en el constructor; `status` `@Enumerated(EnumType.STRING)`
  `@Column(length = 20)`; `Instant` ↔ `TIMESTAMPTZ`; `BigDecimal` ↔ `NUMERIC(12,2)`.
  Dominio: `hasParticipant(UUID)`, `confirm(String gatewayPaymentId, Instant at)` (no-op si ya
  `CONFIRMED`), `fail()`.
- `LedgerEntry` — `id` UUID en el constructor; se crea una sola vez al confirmar
  (`UNIQUE (transaction_id)` como red de seguridad ante reintentos del webhook).
- `ddl-auto: validate` → tipos EXACTOS (`VARCHAR(20)` para el enum, `VARCHAR(3)` para la moneda, `TIMESTAMPTZ`).

### Contrato público — `transactions/` (paquete raíz)

```java
public interface TransactionsModuleApi {
    /** @throws org.springframework.web.server.ResponseStatusException 404 si no existe. */
    TransactionInfo getTransaction(UUID transactionId);
}

public record TransactionInfo(
    UUID id, UUID conversationId, UUID productId, UUID buyerId, UUID producerId,
    BigDecimal amount, String currency, TransactionStatus status) {}

public enum TransactionStatus { PENDING, CONFIRMED, FAILED }

public record TransaccionConfirmada(
    UUID transactionId, UUID conversationId, UUID productId,
    UUID buyerId, UUID producerId, BigDecimal amount) {}
```

`TransactionsModuleApiImpl` (`transactions/application/`) va **directo al repositorio** —
mismo patrón que `ChatModuleApiImpl` / `CatalogModuleApiImpl`. Sin consumidor en Épica 4;
se crea para dejar el contrato listo (Decisión 7).

`TransaccionConfirmada` se publica con `ApplicationEventPublisher` dentro de la transacción
que confirma el pago (webhook). Sin `@TransactionalEventListener` hasta Épica 5.

### Endpoints REST (`/api/transactions`) — `transactions/web/`

| Método | Ruta | Auth | Cuerpo / respuesta |
|---|---|---|---|
| `POST` | `/api/transactions` | `hasRole('BUYER')` | `{ conversationId }` → **201** `{ transactionId, checkoutUrl }`. Valida vía `ChatModuleApi.getAgreedPurchase`: la conversación existe, `method == PLATFORM` (**409**), el caller es el `buyerId` (**403**). Trae `ProductSummary` de `CatalogModuleApi` (404 se propaga); exige `status == ACTIVE` (**409**) y `quantity > 0`. Rechaza si ya hay transacción `PENDING`/`CONFIRMED` en esa conversación (**409** con el id existente). Congela `quantity/unit_price/amount`. Crea `Transaction(PENDING)` + Checkout Session; guarda `gateway_session_id`. |
| `GET` | `/api/transactions/{id}` | autenticado, **solo las 2 partes** (403) | `TransactionResponse` (`id`, `status`, `quantity`, `unitPrice`, `amount`, `currency`, `productName`, `otherPartyName`, `createdAt`, `confirmedAt`). Pantalla de estado del comprador (polling mientras esté `PENDING`). |
| `GET` | `/api/transactions/mine` | autenticado | Transacciones donde el caller es `buyer` **o** `producer`, orden `created_at` desc. Para el **productor**, los items `CONFIRMED` incluyen el desglose del ledger (`grossAmount`, `platformFeeAmount`, `netAmount`). |
| `POST` | `/api/transactions/webhook/stripe` | **`permitAll()`** | Body **crudo** (`@RequestBody String`) + header `Stripe-Signature`. Verifica la firma con `app.stripe.webhook-secret`; inválida → **400**. `checkout.session.completed` (paid) → confirma (idempotente por `gateway_session_id`). `checkout.session.expired` → `FAILED`. **200** si la firma es válida, aunque sea no-op. |

**`SecurityConfig`:** agregar `POST /api/transactions/webhook/stripe` al `permitAll()` **antes**
de `anyRequest().authenticated()` (mismo cuidado de orden que `/api/catalog/products/mine`).
El resto de `/api/transactions/**` queda `authenticated()`; rol y "2 partes" se resuelven por
método (`@PreAuthorize` + chequeo en el service).

### Capa de aplicación — `transactions/application/`

- **`PaymentGateway`** (interfaz) + **`StripePaymentGateway`** (impl): aísla el SDK de Stripe en
  una sola clase. `CheckoutSession createCheckout(Transaction txn, String successUrl, String cancelUrl)`
  → `{ sessionId, checkoutUrl }` (setea `client_reference_id` + `metadata[transactionId]` = id
  nuestro, `line_items` con `unit_amount` en **centavos** = `amount × 100` —COP es de dos decimales—);
  `StripeEvent parseAndVerify(String payload, String signature)` (usa `com.stripe.net.Webhook.constructEvent`).
- **`TransactionService`** — `startCheckout(buyerId, conversationId)`, `getParticipating(txnId, userId)`,
  `listFor(userId)`, `confirmFromWebhook(sessionId, paymentId)` (`@Transactional`: `txn.confirm(...)`
  + `ledgerRepository.save(new LedgerEntry(...))` + `events.publishEvent(new TransaccionConfirmada(...))`),
  `failFromWebhook(sessionId)`. Consume `ChatModuleApi`, `CatalogModuleApi`, `AuthModuleApi`.
- **`PlatformFee`** — helper puro `gross → (fee, net)` con `platform-fee-rate` (0.00 en fase 1).

### Config nueva — `application.yml`

```yaml
app:
  stripe:
    secret-key: ${STRIPE_SECRET_KEY:sk_test_placeholder}
    webhook-secret: ${STRIPE_WEBHOOK_SECRET:whsec_placeholder}
  transactions:
    currency: COP
    platform-fee-rate: 0.00
    frontend-base-url: ${TRANSACTIONS_FRONTEND_URL:http://localhost:5173}
```

`success_url = {frontend-base-url}/transacciones/{id}?pago=ok`,
`cancel_url  = {frontend-base-url}/transacciones/{id}?pago=cancelado` (el id nuestro se conoce al crear la sesión).

### Frontend

- **`transactions/types.ts`**: `TransactionStatus`, `Transaction`, `TransactionSale` (con ledger),
  `STATUS_LABELS`.
- **`transactions/api.ts`**: `startCheckout(conversationId, token)` → `{ transactionId, checkoutUrl }`;
  `getTransaction(id, token)`; `listMine(token)`.
- **`pages/ConversationPage.tsx`** (modificada): cuando `agreedPurchaseMethod === 'PLATFORM'` y el
  usuario es el **BUYER**, mostrar el bloque "Pagar por la plataforma" con el total (precio ×
  cantidad publicada) y un botón → `startCheckout` → `window.location.href = checkoutUrl`.
  Si el `POST` da 409 con un id, navegar a `/transacciones/{id}`.
- **`pages/TransactionStatusPage.tsx`** (`/transacciones/:id`, `ProtectedRoute` sin `role`):
  muestra estado; si `?pago=ok` y sigue `PENDING`, polling cada ~2 s (máx ~30 s) hasta
  `CONFIRMED`/`FAILED`. Mensaje claro para `?pago=cancelado`.
- **`pages/ProducerSalesPage.tsx`** (`/mis-ventas`, `ProtectedRoute role="PRODUCER"`):
  lista de `listMine()` con bruto / comisión / neto por venta confirmada.
- **`App.tsx`**: rutas `/transacciones/:id` y `/mis-ventas`; link "Mis ventas" en `Home` para productores.
- **`package.json`**: sin cambios.

## Plan de pruebas (end-to-end, criterio de salida)

1. `cd backend && mvn test` verde — `ArchitectureTests` ve `transactions` sin violación de
   límites: importa solo `chat.ChatModuleApi`, `catalog.CatalogModuleApi`, `auth.AuthModuleApi`
   (+ tipos) y `shared` (+ SDK de Stripe, tercero).
2. Setup: `stripe login`, luego
   `stripe listen --forward-to localhost:8080/api/transactions/webhook/stripe`; exportar el
   signing secret que imprime como `STRIPE_WEBHOOK_SECRET` y la `sk_test_…` como `STRIPE_SECRET_KEY`
   antes de `mvn spring-boot:run`.
3. Navegador (2 sesiones): comprador y productor acuerdan `PLATFORM` en `/chat/:id`. El comprador
   ve el bloque de pago con el total, "Pagar" → redirige a Stripe Checkout → paga con
   `4242 4242 4242 4242` (fecha futura, CVC cualquiera) → vuelve a `/transacciones/:id?pago=ok`.
4. El webhook (vía `stripe listen`) confirma solo: `transactions.transactions` → `CONFIRMED`,
   fila en `ledger_entries` (bruto = neto, comisión 0), y `TransaccionConfirmada` en el log
   (sin listener). La pantalla de estado pasa a "Confirmada" por el polling.
5. El productor entra a `/mis-ventas` y ve la venta con el desglose.
6. **Idempotencia:** reenviar el mismo evento (`stripe events resend <id>` o el dashboard) →
   no duplica ledger ni evento; respuesta 200.
7. **Bordes:** `POST /api/transactions` sobre conversación con `method = OFF_PLATFORM` → 409;
   sobre producto `SOLD_OUT` → 409; segunda vez con una `PENDING` viva → 409 con el id. Un
   tercer usuario: `GET /api/transactions/{id}` ajena → 403. Firma de webhook inválida → 400.
8. `docker compose down -v && docker compose up -d` + arranque → `V402` aplica desde cero.

## Archivos que nacerán (referencia)

**Backend — nuevos:**
- `transactions/TransactionsModuleApi.java`, `transactions/TransactionInfo.java`,
  `transactions/TransactionStatus.java`, `transactions/TransaccionConfirmada.java`
- `transactions/domain/{Transaction,LedgerEntry}.java`
- `transactions/application/{TransactionService,TransactionsModuleApiImpl,PaymentGateway,StripePaymentGateway,PlatformFee}.java`
- `transactions/infrastructure/{TransactionRepository,LedgerEntryRepository}.java`
- `transactions/web/{TransactionController,StripeWebhookController}.java` + DTOs
  (`CreateTransactionRequest`, `CheckoutResponse`, `TransactionResponse`, `TransactionSaleResponse`)
- `backend/src/main/resources/db/migration/transactions/V402__create_transactions_tables.sql`

**Backend — modificados:**
- `shared/security/SecurityConfig.java` (`permitAll` en el webhook)
- `catalog/ProductSummary.java` + `catalog/application/CatalogModuleApiImpl.java` (campo `quantity`)
- `backend/pom.xml` (`com.stripe:stripe-java` 29.2.0)
- `backend/src/main/resources/application.yml` (`app.stripe.*`, `app.transactions.*`)

**Frontend — nuevos:**
- `transactions/{api,types}.ts`
- `pages/{TransactionStatusPage,ProducerSalesPage}.tsx`

**Frontend — modificados:**
- `pages/ConversationPage.tsx` (bloque de pago), `App.tsx` (rutas + link "Mis ventas")

**Docs (al cerrar):** `docs/claude/estado-actual.md`, `docs/backlog.md`, este spec.
