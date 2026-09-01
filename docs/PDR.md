# PDR — Marketplace Agrícola Huila (MVP)

## 1. Contexto y problema

El sistema busca acercar directamente a productores agrícolas y compradores, reduciendo la dependencia de intermediarios que reducen el margen del productor. Cada usuario tiene **un único rol**: productor (publica y vende) o comprador (navega y compra). Los productores publican productos con fotos e información básica; los compradores navegan el catálogo y, desde cada producto, abren un **chat** con el productor para acordar la forma de compra: por plataforma (pago vía pasarela) o por fuera (compartiendo WhatsApp o número de cuenta a través del mismo chat).

### ¿Por qué distribuido y no monolítico?

Los distintos servicios tienen perfiles de carga, disponibilidad y consistencia muy diferentes:

- El **catálogo** necesita alta disponibilidad y tolera lectura ligeramente desactualizada (muchas lecturas, pocas escrituras).
- La **autenticación** y las **transacciones** necesitan consistencia fuerte (no puede haber ambigüedad sobre si un usuario está autenticado o si un pago quedó confirmado).
- El **chat** necesita baja latencia y un modelo de datos distinto (mensajes) al resto del sistema.
- Las **notificaciones** pueden procesarse de forma asíncrona y tolerar fallas temporales sin tumbar el resto del sistema.

Separarlos en servicios independientes permite escalar y fallar de forma aislada, en vez de que un pico de tráfico en catálogo o una caída del servicio de notificaciones afecte la autenticación o las transacciones.

## 2. Objetivos y alcance

**General:** Permitir el acercamiento directo entre productor y comprador de productos agrícolas, reduciendo la necesidad de intermediarios.

**Específicos:**

- Permitir registro y autenticación de usuarios con un único rol (productor o comprador).
- Permitir que el productor gestione (crear, editar, eliminar) sus productos publicados.
- Permitir que el comprador navegue y filtre el catálogo de productos disponibles.
- Permitir que comprador y productor se comuniquen por chat asociado a cada producto para acordar la compra.
- Permitir el pago de una compra dentro de la plataforma mediante integración con una pasarela de pago (sandbox), con un ledger interno que registra la dispersión hacia el productor.
- Confirmar automáticamente la transacción cuando el pago se procesa por la plataforma (vía webhook de la pasarela).
- Notificar eventos relevantes: transacción confirmada, nuevo mensaje en chat.

**Fuera de alcance (MVP):**

- Calificaciones o reputación entre comprador y productor.
- Seguimiento o confirmación de transacciones acordadas por fuera de la plataforma — quedan bajo el propio acuerdo de las partes, sin registro ni intervención del sistema.
- Verificación de identidad (cédula-rostro con IA).
- Logística de transporte o almacenamiento.
- Geolocalización con mapa (solo filtro por municipio/texto).
- Selección definitiva de pasarela de pago para producción (el MVP opera en modo sandbox/pruebas, sin dinero real).

## 3. Requisitos

### Funcionales

| ID | Descripción |
|----|-------------|
| RF1 | Registro con nombre, correo, contraseña y rol (productor o comprador — único e inmutable en el MVP); login con correo/contraseña. |
| RF2 | El productor completa perfil de finca: departamento, municipio, vereda, nombre de finca. |
| RF3 | El productor puede crear, editar y eliminar productos (nombre, categoría, unidad, cantidad, precio, foto(s), municipio, estado activo/agotado). |
| RF4 | El comprador navega el catálogo con filtro por categoría y municipio. |
| RF5 | Al seleccionar un producto, el comprador puede abrir un chat con el productor asociado a ese producto. |
| RF6 | Dentro del chat, comprador y productor acuerdan la forma de compra: por plataforma (pago vía pasarela) o por fuera (compartiendo WhatsApp o número de cuenta por el mismo chat). |
| RF7 | Si la compra es por plataforma, el pago se procesa mediante integración con una pasarela de pago (sandbox); un ledger interno en el servicio de Transacciones registra la dispersión hacia el productor. |
| RF8 | Cuando la compra es por plataforma, la transacción se confirma automáticamente vía webhook de la pasarela de pago. Las compras acordadas por fuera de la plataforma no tienen seguimiento ni confirmación dentro del sistema. |
| RF9 | El sistema notifica eventos relevantes: transacción confirmada (compra por plataforma), nuevo mensaje en chat. |

### No funcionales

- **Disponibilidad:** catálogo, autenticación y chat deben mantenerse operativos aunque notificaciones falle temporalmente.
- **Latencia:** respuestas de catálogo/auth < 1-2s; mensajes de chat con baja latencia (casi tiempo real).
- **Consistencia:** fuerte en autenticación (estado de sesión) y en transacciones (un pago no puede quedar en estado ambiguo); eventual en notificaciones y mensajes de chat.
- **Seguridad:** contraseñas hasheadas (bcrypt), autenticación por JWT; credenciales/tokens de la pasarela de pago se manejan solo en el backend (nunca expuestos en el frontend); todo el flujo de pago opera en modo sandbox (sin dinero real).
- **Escalabilidad:** catálogo y chat deben poder escalar horizontalmente de forma independiente a auth y transacciones.

## 4. Arquitectura preliminar

Servicios: **Auth/Usuarios**, **Catálogo**, **Chat/Mensajería**, **Transacciones** (pagos + ledger interno de dispersión), **Notificaciones**, con un **API Gateway** al frente.

- Auth, Catálogo y Transacciones se comunican vía REST síncrono con el gateway.
- Chat se comunica en tiempo casi real (WebSocket) a través del gateway.
- Transacciones dispara el evento `TransacciónConfirmada` (originado por el webhook de la pasarela cuando la compra es por plataforma) que Notificaciones consume de forma asíncrona vía cola de mensajes.
- Chat dispara el evento `NuevoMensajeChat` que Notificaciones consume de forma asíncrona.

## 5. Decisiones de diseño clave

- **Comunicación:** REST síncrono para auth/catálogo/transacciones; WebSocket para chat; asíncrono (cola) para los eventos `TransacciónConfirmada` y `NuevoMensajeChat` → notificación.
- **Modelo de datos:** una única instancia de **PostgreSQL**, con un **schema independiente por servicio** (`auth`, `catalog`, `transactions`, `notifications`) — se prioriza esta separación lógica sobre "database per service" por directriz del curso, dado que esta última requiere infraestructura más avanzada de la que dispone el equipo. El servicio de **Chat/Mensajería** usa **MongoDB** en una instancia aparte: su modelo de datos flexible (documentos) y alto volumen de escritura encajan mejor que un esquema relacional, y al vivir en su propio motor no compite por recursos con el resto de servicios transaccionales.
- **CAP:** catálogo y chat priorizan disponibilidad; auth y transacciones priorizan consistencia.
- **Tolerancia a fallos:** si Notificaciones cae, el evento queda en cola y se procesa al recuperarse; catálogo/auth/chat/transacciones siguen funcionando normal.
  > **Riesgo aceptado:** al compartir una única instancia de PostgreSQL, una caída del motor de base de datos sí afecta simultáneamente a Auth, Catálogo y Transacciones, aunque estén lógicamente separados por schema. Se acepta este riesgo para el alcance del MVP académico (ver sección 7).

## 6. Stack tecnológico

| Servicio | Backend | Base de datos |
|----------|---------|----------------|
| Auth/Usuarios | Java + Spring Boot | PostgreSQL (schema `auth`) |
| Catálogo | Java + Spring Boot | PostgreSQL (schema `catalog`) |
| Transacciones (pagos + ledger de dispersión) | Java + Spring Boot | PostgreSQL (schema `transactions`) |
| Notificaciones | Java + Spring Boot | PostgreSQL (schema `notifications`) |
| Chat/Mensajería | **Go** — concurrencia nativa (goroutines/channels) para sostener muchas conexiones de chat simultáneas con bajo overhead | **MongoDB** — modelo de documentos flexible y alta escritura, sin necesidad de joins |

**Frontend:**

| Aplicación | Tecnología | Justificación |
|------------|-----------|----------------|
| Marketplace (compradores/productores: catálogo, productos, chat, pagos) | **React** | Cara pública de mayor volumen de usuarios; el equipo tiene más experiencia en React, lo que reduce riesgo en la app más crítica. |
| Panel administrativo interno | **Angular** | Uso interno, menor volumen de usuarios; estructura "batteries-included" de Angular (routing, forms, DI) encaja bien con CRUDs administrativos y de seguimiento de transacciones/ledger. |

**Infraestructura común:**

- **RabbitMQ** — cola de mensajes para eventos asíncronos (`TransacciónConfirmada`, `NuevoMensajeChat`).
- **Docker Compose** — orquestación local de todos los servicios.

## 7. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Equipo de 2 desarrolladores manteniendo 5 microservicios + gateway + 2 motores de BD + broker | Docker Compose local, alcance acotado, división clara de servicios por desarrollador |
| Pasarela de pago aún no seleccionada; el sandbox elegido podría no soportar dispersión automática | Ledger interno en el servicio de Transacciones como respaldo para registrar y controlar la dispersión manualmente si es necesario |
| Manejo de flujos de pago en un proyecto académico | Todo el flujo opera en modo sandbox/pruebas — no se mueve dinero real |
| Compras acordadas por fuera de la plataforma quedan sin protección ni trazabilidad del sistema (riesgo de fraude entre las partes) | Se informa al usuario en el chat que estas negociaciones son bajo su propio riesgo; el sistema no interviene ni las registra |
| Scope creep hacia verificación de identidad antes de tener el MVP sólido | Fase 2 documentada pero no implementada aún |

## 8. Cronograma

Pendiente de definir hitos
