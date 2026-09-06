# PDR — Marketplace Agrícola Huila (MVP - 1 Corte)

## 1. Contexto y problema

El sistema busca acercar directamente a productores agrícolas y compradores, reduciendo la dependencia de intermediarios que reducen el margen del productor. Cada usuario tiene **un único rol**: productor (publica y vende) o comprador (navega y compra). Los productores publican productos con fotos e información básica; los compradores navegan el catálogo y, desde cada producto, abren un **chat** con el productor para acordar la forma de compra: por plataforma (pago vía pasarela) o por fuera (compartiendo WhatsApp o número de cuenta a través del mismo chat).

### ¿Por qué monolito Stringler Pattern?

Los distintos módulos tienen perfiles de carga, disponibilidad y consistencia muy diferentes, teniendo en cuenta eso,la idea es por medio del Patrón Stringler partir de un sola aplicación e ir extrayendo los distintos módulos que lo necesiten, al punto de llegar a tener microservicios. A continuación la justificación de la separación:

- El **catálogo** necesita alta disponibilidad y tolera lectura ligeramente desactualizada (muchas lecturas, pocas escrituras).
- La **autenticación** y las **transacciones** necesitan consistencia fuerte (no puede haber ambigüedad sobre si un usuario está autenticado o si un pago quedó confirmado).
- El **chat** necesita baja latencia y un modelo de datos distinto (mensajes) al resto del sistema.
- Las **notificaciones** pueden procesarse de forma asíncrona y tolerar fallas temporales sin tumbar el resto del sistema.

Iniciamos con un solo deployable, pero organizado y segmentado por módulos.

## 2. Objetivos y alcance

**General:** Lograr el desarrollo de las principales funcionalidades del sistema, reduciendo el alcance a una estructura de un monolito modular para el MVP del **corte 1**.

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


## 4. Arquitectura preliminar

Monolito Modular: Separación clara entre los dominios de negocio definidos. Se restringe la posibilidad de acoplar servicios, esquemas y repositorios entre servicios.

Módulos: **Auth/Usuarios**, **Catálogo**, **Chat/Mensajería**, **Transacciones** (pagos + ledger interno de dispersión), **Notificaciones**.

Comunicación: cada módulo expondrá una interfaz que será implementada por los módulos que la necesiten, dicha interfaz tendrá reglas de negocio que proveerán todo lo necesario para los otros módulos. 



## 5. Decisiones de diseño clave

- **Comunicación:** implementación de interfaces con las reglas de negocio necesarias
- **Modelo de datos:** una única instancia de **PostgreSQL**, con un **schema independiente por módulo** (`auth`, `catalog`, `transactions`, `notifications`) 


## 6. Stack tecnológico
| Tecnología | Justificación | 
|----------|-----------------|
| Java + Spring Boot | Lenguaje fuertemente tipado y framework potente para gestión de transacciones
| PostgreSQL|  Motor de BD conocida por el equipo y eventual herramienta con potencia para la gestión de microservicios furutos |
| React + vite | Herramienta conocida por el equipo de desarrollo y práctica  | 
| Docker | Contenerización de la BD|



**Infraestructura común:**

- **RabbitMQ** — cola de mensajes para eventos asíncronos (`TransacciónConfirmada`, `NuevoMensajeChat`).
- **Docker Compose** — orquestación local de todos los servicios.

## 7. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Equipo de 2 desarrolladores manteniendo 5 modulos +  motor de BD | Docker Compose local, alcance acotado, división clara de servicios por desarrollador |
| Sandbox elegido podría no soportar dispersión automática | Ledger interno en el servicio de Transacciones como respaldo para registrar y controlar la dispersión manualmente si es necesario |
| Manejo de flujos de pago en un proyecto académico | Todo el flujo opera en modo sandbox/pruebas — no se mueve dinero real |
| Compras acordadas por fuera de la plataforma quedan sin protección ni trazabilidad del sistema (riesgo de fraude entre las partes) | Se informa al usuario en el chat que estas negociaciones son bajo su propio riesgo; el sistema no interviene ni las registra |


## 8. Cronograma

Pendiente de definir hitos
