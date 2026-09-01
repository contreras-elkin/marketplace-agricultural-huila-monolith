# Arquitectura — Monolito Modular (Fase 1 / Strangler Fig)

> Este documento define la estructura interna del monolito y cómo se comunican sus módulos.
> Objetivo: que extraer cada módulo a su propio microservicio más adelante (según el [PDR](PDR.md)) sea barato, sin sobre-diseñar la fase 1.

## 1. Principio rector

Un único deployable Spring Boot, con **límites de módulo estrictos pero mecanismos simples**. Nada de hexagonal completo, CQRS, event sourcing o saga en esta fase — el PDR mismo los descarta para casos que no los necesitan, y este monolito tampoco los necesita. La única regla dura es:

> **Un módulo nunca accede directamente a las tablas/entidades/repositorios de otro módulo.** Toda interacción pasa por la API pública del módulo (llamada a método) o por un evento.

Esa única regla es la que hace barata la futura extracción.

## 2. Estructura de paquetes

**Layout del repo:** `backend/` (el deployable Spring Boot) y `frontend/` (React + Vite) son carpetas hermanas en la raíz del repo — no hay dos repos separados, pero cada uno tiene su propio `pom.xml`/`package.json` y ciclo de build independiente.

```
marketplace-agricultural-huila-monolith/
├── docker-compose.yml          # Postgres + RabbitMQ (infraestructura local)
├── backend/                    # deployable Spring Boot — ver árbol de paquetes abajo
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/huila/marketplace/...
│       ├── main/resources/{application.yml, db/migration/<modulo>/}
│       └── test/java/com/huila/marketplace/ArchitectureTests.java
└── frontend/                   # React + Vite + TypeScript
    ├── package.json             # incluye react-router-dom desde Épica 1
    ├── .env / .env.example     # VITE_API_BASE_URL
    ├── index.html
    └── src/
        ├── main.tsx             # BrowserRouter + AuthProvider envolviendo <App/>
        ├── App.tsx              # define <Routes>; Home muestra /health + estado de sesión
        ├── api/client.ts        # wrapper fetch (apiGet/apiPost/apiPut, token opcional), ApiError
        ├── auth/                # AuthContext (JWT en memoria — se pierde al recargar, ver §5), api.ts (llamadas a /api/auth/*), types.ts
        ├── components/          # ProtectedRoute (redirige a /login sin sesión o sin el rol pedido)
        └── pages/                # RegisterPage, LoginPage, FarmProfilePage — cada épica suma las suyas acá
```

**Convención de frontend por módulo (desde Épica 1):** cada épica agrega sus propias `pages/` y, si expone datos reutilizables, funciones en un `<modulo>/api.ts` — no hay una carpeta `features/` ni Redux/estado global más allá de `AuthContext`. Las llamadas autenticadas usan `apiGet/apiPost/apiPut(path, body?, auth.token)`; `ProtectedRoute` acepta un `role` opcional para restringir por rol, igual que `@PreAuthorize` en el backend.

Dentro de `backend/`, un solo proyecto Maven (no multi-módulo — evita la complejidad de múltiples `pom.xml` sin aportar nada en fase 1). Separación por **paquete por módulo**, y dentro de cada módulo, 4 capas simples (convención Spring típica, no hexagonal):

```
backend/src/main/java/com/huila/marketplace/
├── MarketplaceApplication.java
├── shared/                     # kernel transversal — SIN lógica de negocio
│   ├── config/                 # beans comunes (CorsConfigurationSource, OpenAPI)
│   ├── security/                # SecurityConfig: JWT (encoder/decoder/converter), PasswordEncoder
│   └── web/                    # manejador global de excepciones, formato de error estándar
│
├── auth/
│   ├── AuthModuleApi.java      # ← única puerta de entrada pública del módulo
│   ├── Role.java, UserSummary.java   # tipos públicos que expone la API
│   ├── domain/                 # User, FarmProfile (entidades JPA)
│   ├── application/            # RegisterUserService, LoginService, FarmProfileService, AuthModuleApiImpl
│   ├── infrastructure/         # UserRepository, FarmProfileRepository — schema `auth`
│   └── web/                    # AuthController, FarmProfileController, DTOs
│
├── catalog/
│   ├── CatalogModuleApi.java
│   ├── domain/                 # Product
│   ├── application/            # CreateProduct, UpdateProduct, ListProducts (filtros)
│   ├── infrastructure/         # schema `catalog`
│   └── web/
│
├── chat/
│   ├── ChatModuleApi.java
│   ├── domain/                 # Conversation, Message
│   ├── application/            # OpenConversation, SendMessage, AgreePurchaseMethod
│   ├── infrastructure/         # schema `chat`
│   └── web/                    # WebSocket handler + REST historial
│
├── transactions/
│   ├── TransactionsModuleApi.java
│   ├── domain/                 # Transaction, LedgerEntry
│   ├── application/            # InitiatePayment, ConfirmPaymentWebhook
│   ├── infrastructure/         # schema `transactions`
│   └── web/                    # endpoint webhook de la pasarela
│
└── notifications/
    ├── domain/                 # Notification
    ├── application/            # listeners de eventos (no expone API a otros módulos)
    ├── infrastructure/         # schema `notifications`
    └── web/                    # REST para listar notificaciones del usuario
```

> **Estado real (post Épica 2):** `shared/` (`config/{CorsConfig, MediaResourceConfig}`, `security/SecurityConfig`, `web/{GlobalExceptionHandler, ApiError, HealthController}`), `auth/` y `catalog/` (completos, estructura de 4 capas como se diseñó) tienen contenido real. `catalog/` expone `CatalogModuleApi` + tipos públicos (`ProductSummary`, `ProductStatus`, `ProductCategory`, `ProductUnit`) y depende de `auth.AuthModuleApi` para el nombre del productor en el detalle — dependencia permitida por Modulith (va contra la API del módulo). `chat/`, `transactions/`, `notifications/` siguen siendo el diseño objetivo — nacen con su primera clase real en la épica que les corresponde.
>
> **Fotos de producto (Épica 2):** subida local acotada, sin blob store. `catalog/infrastructure/PhotoStorage` escribe en `app.uploads.dir` (`./uploads`, gitignored) y `shared/config/MediaResourceConfig` las sirve como estáticos en `/media/**` (ruta en el `permitAll()` de `SecurityConfig`). Al extraer `catalog` a microservicio, `PhotoStorage` pasa a ser un cliente de blob store y la URL sigue siendo la misma abstracción.

**Regla de visibilidad:** el objetivo es que solo `XModuleApi` (y los tipos que expone, ej. `UserSummary`) sean el contrato público de un módulo para el resto del monolito. En la práctica, `domain/`, `application/`, `infrastructure/` y `web/` son 4 paquetes Java distintos dentro de cada módulo (sin `module-info.java`, classpath plano), así que sus clases deben ser `public` para que Spring pueda inyectarlas entre capas del mismo módulo — Java no ofrece un nivel de visibilidad "público solo dentro de mi módulo". Por eso el aislamiento real entre módulos **no lo da el modificador `public`/paquete-privado**, sino `ArchitectureTests` (`spring-modulith-starter-test`): Modulith trata el paquete raíz de cada módulo (`auth`, `catalog`, ...) como su API y sus subpaquetes (`domain`, `application`, `infrastructure`, `web`) como internos, y falla la build si otro módulo importa algo de ahí directamente. La disciplina de "solo importar `XModuleApi`" sigue siendo la convención a seguir al escribir código nuevo — el test solo la hace cumplir.

**Verificación automática:** `spring-modulith-starter-test` + `backend/src/test/java/com/huila/marketplace/ArchitectureTests.java` con `ApplicationModules.of(MarketplaceApplication.class).verify()`. Desde que `auth` existe (Épica 1) ya hace cumplir la regla dura entre módulos con contenido real; corre en `mvn test`.

## 3. Comunicación entre módulos

Solo dos mecanismos, cada uno pensado como espejo directo de cómo se comunicarán los futuros microservicios (ver PDR §4-5):

### a) Síncrona → llamada directa a la API del módulo

Equivale al futuro REST síncrono. Un módulo inyecta la interfaz pública (`XModuleApi`) del módulo que necesita y la invoca como un método Java normal — sin HTTP, sin serialización.

```java
// dentro de chat/application/OpenConversation.java
class OpenConversation {
    private final CatalogModuleApi catalog;   // inyectado por Spring

    Conversation handle(OpenConversationCommand cmd) {
        ProductSummary product = catalog.getProduct(cmd.productId()); // llamada directa
        ...
    }
}
```

Cuando `catalog` se extraiga como microservicio, `CatalogModuleApi` se reimplementa como un cliente REST — el resto del código de `chat` no cambia.

### b) Asíncrona → eventos de dominio en proceso

Equivale a la futura cola RabbitMQ. Se usan los eventos ya nombrados en el PDR, publicados con `ApplicationEventPublisher` de Spring y escuchados con `@TransactionalEventListener` (se dispara solo si la transacción que lo originó hizo commit):

- `TransaccionConfirmada` — publicado por `transactions`, consumido por `notifications`.
- `NuevoMensajeChat` — publicado por `chat`, consumido por `notifications`.

```java
// transactions publica
applicationEventPublisher.publishEvent(new TransaccionConfirmada(transactionId, buyerId));

// notifications escucha
@TransactionalEventListener
void on(TransaccionConfirmada event) { ... }
```

`notifications` es el único módulo que **no expone** `ModuleApi` — nadie lo llama de forma síncrona, solo reacciona a eventos. Esto ya refleja su rol real en el PDR (asíncrono, tolerante a fallos).

Cuando se extraiga como microservicio, estos eventos en proceso pasan a publicarse en RabbitMQ (Spring Modulith tiene soporte de "event externalization" para esto, pero no hace falta ahora).

### Regla dura (repetida a propósito)

Nunca: inyectar un `Repository` de otro módulo, importar una entidad JPA de otro módulo, hacer un JOIN entre schemas. Siempre: pasar por `XModuleApi` o por un evento.

## 4. Datos

Una sola instancia de PostgreSQL, **un schema por módulo** (`auth`, `catalog`, `chat`, `transactions`, `notifications`), migraciones con Flyway en `backend/src/main/resources/db/migration/<modulo>/`. Ningún módulo tiene permisos para leer el schema de otro directamente — el aislamiento lógico es el mismo que tendrán como BDs separadas tras la extracción.

**Convención de versionado Flyway (importante para cualquier migración nueva):** `spring.flyway.locations` apunta a las 5 carpetas a la vez, así que Flyway las combina en **un solo historial de versiones** (`flyway_schema_history`, en el schema `public`) — un `V1` en `auth/` y un `V1` en `catalog/` colisionan, porque a Flyway solo le importa el número de versión, no la carpeta de origen. Por eso cada módulo tiene un **rango de versión reservado**:

| Módulo | Rango |
|--------|-------|
| `auth` | `V1xx` |
| `catalog` | `V2xx` |
| `chat` | `V3xx` |
| `transactions` | `V4xx` |
| `notifications` | `V5xx` |

Ej.: la próxima migración de `auth` es `V102__...sql`, no `V2__...sql` (ese rango es de `catalog`). `create-schemas` queda en `false`: cada módulo crea su propio schema explícitamente en su `V1xx__create_schema.sql` — nada implícito de Flyway creándolos por adelantado.

**Nota de dependencia (Spring Boot 4):** a partir de Boot 4 la autoconfiguración de Flyway se movió a un artefacto propio, `org.springframework.boot:spring-boot-flyway` — no alcanza con tener `flyway-core` en el classpath como en Boot 3.x. Ya está declarado en `backend/pom.xml`.

## 5. Autenticación, autorización y manejo de errores (desde Épica 1)

**JWT:** el propio monolito emite y valida sus tokens — no hay IdP externo. Se usa Spring Security **OAuth2 Resource Server** (Nimbus) con clave **simétrica HS256** (`app.jwt.secret`, mínimo 256 bits; en `application.yml` con override por `JWT_SECRET`). Claims: `sub` (userId, UUID), `role` (`PRODUCER`/`BUYER`), `name`, `iss`, `iat`, `exp` (`app.jwt.expiration-minutes`, hoy 60). El decoder/encoder/`JwtAuthenticationConverter` (mapea el claim `role` a la authority `ROLE_<role>`) viven como beans en `shared/security/SecurityConfig`.

**Convención para módulos nuevos** (repetible tal cual desde `catalog` en adelante):
- Endpoint público → agregarlo a la lista `permitAll()` en `SecurityConfig`; todo lo demás requiere JWT válido por defecto (`anyRequest().authenticated()`).
- Obtener el usuario autenticado en un controller → `@AuthenticationPrincipal Jwt jwt` y `UUID.fromString(jwt.getSubject())`. No hace falta llamar a `AuthModuleApi` solo para saber quién es el usuario logueado — el JWT ya lo trae firmado.
- Restringir un endpoint por rol → `@PreAuthorize("hasRole('PRODUCER')")` (requiere `@EnableMethodSecurity`, ya activo en `SecurityConfig`) usando el rol del propio JWT, no una consulta a `auth`. `AuthModuleApi.isProducer(userId)`/`getUserSummary(userId)` quedan para cuando otro módulo necesita datos del usuario más allá de lo que el token ya trae (ej. mostrar el nombre del productor en un producto).

**CORS:** vive en `shared/config/CorsConfig` como un bean `CorsConfigurationSource` (no un `WebMvcConfigurer`) porque la cadena de Spring Security intercepta la request antes que Spring MVC — con endpoints protegidos, el preflight `OPTIONS` y el CORS real deben resolverse dentro de esa cadena (`http.cors(...)`), que busca ese tipo de bean.

**Errores:** `shared/web/GlobalExceptionHandler` es el único lugar donde se traducen excepciones a `ApiError`. Para nuevo código de dominio: lanzar `org.springframework.web.server.ResponseStatusException` con el `HttpStatus` que corresponda (ej. `CONFLICT` en duplicados, `NOT_FOUND`) — no se creó una jerarquía de excepciones de negocio propia, para no sobre-diseñar. Los `@Valid` + anotaciones de Bean Validation en los DTOs de `web/` ya devuelven 400 automáticamente. `AccessDeniedException` (de `@PreAuthorize`) ya está mapeada a 403.

## 6. Qué NO se implementa en fase 1

Coherente con el PDR (tabla "cuándo no usar cada patrón") y con no complicar la base:

- Sin hexagonal/ports-adapters por módulo — la separación en 4 capas ya es suficiente.
- Sin CQRS ni Event Sourcing.
- Sin Saga — todo el flujo de compra vive en un solo proceso, transacciones locales ACID bastan.
- Sin Circuit Breaker — no hay llamadas de red entre módulos todavía.
- Sin API Gateway — el propio Spring Boot expone los endpoints; el Gateway aparece en la extracción.
- Sin Outbox Pattern — los eventos en proceso ya son parte de la misma transacción de BD (no hay riesgo de "guardé pero no publiqué" como sí lo hay entre procesos distintos).

## 7. Camino de extracción (referencia futura)

Cuando un módulo esté listo para salir: (1) su `ModuleApi` se convierte en cliente REST, (2) sus eventos se externalizan a RabbitMQ, (3) su schema se mueve a una BD propia, (4) se despliega aparte y el Gateway le enruta tráfico (Strangler Fig, ver `market-agri-docs/05-architecture/pattern-guide.md`). Orden sugerido de extracción: Chat primero (stack y modelo de datos más distintos — Go/Mongo), luego Notificaciones (ya es asíncrono), luego el resto según carga real observada.
