# Épica 6 — Rediseño de UI / Sistema de diseño del frontend · Spec

> **Estado: IMPLEMENTADO** (2026-09-02). Las 25 decisiones de alcance + las 8 de detalle
> (`D-A`…`D-H`) se resolvieron con el usuario (todas = recomendación; paleta sin cambios).
> Los 5 cortes están completos; `npm run lint` + `npm run build` verdes y recorrido en
> navegador de todas las vistas (desktop + 375px). Pendiente de commit por épica. Estado
> vivo de detalle en [`estado-actual.md`](estado-actual.md).
>
> **Entrega:** 3 de septiembre de 2026 (día siguiente). Por eso la implementación va en
> **5 cortes verificables** (§Plan de cortes), no en un big-bang.
>
> **Depende de:** nada nuevo. Consume las APIs REST y el WebSocket STOMP **ya existentes**
> (Épicas 1–5) sin cambiar un solo contrato. Cero cambios en `backend/`. Es la primera
> épica puramente de frontend.

---

## Alcance

Épica **solo de presentación**: llevar el frontend funcional actual a una interfaz
profesional y **consistente entre todas las vistas**, sin agregar ni quitar funcionalidad.

**Sí entra:**
- Sistema de diseño: tokens CSS (paleta verde-agro, tipografía, espaciado, radios, sombras),
  reset, tema **solo claro**.
- Set de componentes presentacionales reutilizables en `src/ui/`.
- Shell de la app: `<Layout>` con header (nav por rol + campana + menú de usuario), footer,
  breadcrumbs; página 404.
- Helpers de formato unificados en `src/lib/format.ts` (dinero, fechas, cantidades).
- Rediseño de las 13 páginas + la home, reusando los componentes y formatos anteriores.
- Estados loading / error / empty unificados; toasts para confirmaciones; skeletons en
  listas y grilla.
- `lucide-react` como **única dependencia nueva** del frontend.

**No entra (fuera de alcance, explícito):**
- Ninguna funcionalidad nueva ni cambio de comportamiento observable.
- Ningún cambio en `src/api/client.ts`, en los `<módulo>/api.ts`, en los contratos de datos
  (`<módulo>/types.ts` salvo mover `formatMoney`, ver `D-A`), ni en `backend/`.
- Ningún cambio de rutas de negocio (las URLs y sus efectos quedan idénticos; solo se
  reorganiza el árbol de `<Routes>` para colgar de un `<Layout>` — mismas paths).
- Persistencia del JWT, lógica de auth, WebSocket, polling de notificaciones: intactos.
- Tema oscuro. Panel admin Angular. i18n (todo queda en español, voseo).
- Redux / estado global nuevo. Tailwind / librería de componentes.

**Criterio de salida:**
1. `cd frontend && npm run lint` (oxlint) en verde.
2. `cd frontend && npm run build` (`tsc -b && vite build`) sin errores de tipos.
3. Recorrido en navegador (Chrome) de las 13 vistas + home + 404: **paridad funcional 1:1
   con el estado previo** (registro, login, CRUD de productos, catálogo + filtros, chat en
   vivo, forma de compra, pago Stripe sandbox, estado de transacción, ventas, notificaciones)
   — todo sigue funcionando, ahora con el sistema de diseño aplicado de forma consistente.
4. `git grep` de verificación: sin cambios en `src/api/`, sin `toLocaleString`/`new Date(...)`
   sueltos para formato en `pages/` (todo pasa por `src/lib/format.ts`), sin `style={{…}}`
   inline salvo casos justificados (posición dinámica).
5. Screenshots de cada vista adjuntos.
6. `cd backend && mvn test` sigue verde (no se tocó; se corre por ritual de cierre).

---

## Decisiones ya acordadas (chat, 2026-09-02)

| # | Tema | Resolución |
|---|---|---|
| 1 | Paleta | **Verde-agro**, hex propuestos en §Design tokens (el usuario los afina) |
| 2 | Tipografía | **Del sistema** (`system-ui` stack), sin fuente web |
| 3 | Logo | **Wordmark** "Marketplace Agrícola Huila" + marca simple (hoja) en SVG inline |
| 4 | Estilo | **Limpio con acentos verdes** (referencia estructural: MercadoLibre — grilla de tarjetas, breadcrumbs, jerarquía de precio, CTAs claros; colores nuestros) |
| 5 | Tema | **Solo claro.** Se elimina `color-scheme: light dark` → `color-scheme: light` |
| 6 | Enfoque técnico | **CSS plano + design tokens + componentes** en `src/ui/` (CSS Modules, sin runtime). Cero deps salvo íconos |
| 7 | Shell | **Header persistente** (wordmark, nav por rol, campana, menú de usuario), footer con proyecto/materia + estado del backend, **breadcrumbs** en vez de `← Inicio` |
| 8 | `/` | Landing pública breve + accesos rápidos por rol al estar logueado (ver `D-F`) |
| 9 | Indicador `/health` | **Se queda**, movido a un punto discreto en el footer (`<BackendStatus>`) |
| 10 | Footer | **Sí**, con nombre del proyecto / materia / equipo |
| 11 | Navegación atrás | Breadcrumbs simples (`Inicio / Catálogo / {producto}`) |
| 12 | Responsive | **Desktop-first**, fluido y usable hasta ~768px, funcional a 375px. Demo en laptop/Chrome. Un solo breakpoint (`768px`) |
| 13 | Dinero | `formatMoney(1234567)` → `$ 1.234.567` (es-CO, sin decimales); **sufijo ` COP` solo en totales** (`formatMoney(x, { suffix: true })`) |
| 14 | Fechas | **Relativas en listas** ("hace 5 min", "ayer", "12 ago"), **absolutas en detalle** (`2 sep 2026, 3:41 p. m.`). Locale es-CO, zona America/Bogota |
| 15 | Cantidad + unidad | `formatQuantity(12, 'KILOGRAMO')` → `12 kg` (símbolo corto), o `12 kilogramos` en detalle |
| 16 | Labels de enums | Consolidación **en capa de UI**, sin mover lógica (ver `D-A`) |
| 17 | Badges de estado | `<Badge>` con mapeo fijo: transacción PENDING=warning · CONFIRMED=success · FAILED=danger; producto ACTIVE=success · SOLD_OUT=neutral; notif no leída = acento info |
| 18 | Loading/error/empty | 3 componentes unificados (`<Spinner>`/`<LoadingBlock>`, `<Alert variant>`, `<EmptyState>`) |
| 19 | Toasts | **Sí**, sistema mínimo propio (`<ToastProvider>` + `useToast()`), sin dep |
| 20 | Skeletons | **Sí**, en grilla de catálogo y listas (ver `D-G` para el detalle) |
| 21 | Íconos | **`lucide-react`** (única dep nueva; versión estable fijada al instalar) |
| 22 | Idioma | **Voseo** consistente en todo el front (coincide con el texto que ya emite el backend) |
| 23 | Rediseño por vista | Lo **propone Claude** en este spec (§Rediseño vista por vista); el usuario revisa |
| 24 | Radio de impacto | `src/pages/*`, `App.tsx`, nuevo `src/ui/`, `src/lib/`, `src/styles/`, `index.css`, `<Layout>`, 404, `index.html` (`lang`, favicon). **No**: `src/api/`, lógica de `types.ts`, rutas de negocio, comportamiento, backend |
| 25 | Calidad | `npm run lint` + `npm run build` en verde; sin funcionalidad nueva |

---

## Decisiones de detalle (resueltas 2026-09-02 — todas = recomendación)

| # | Decisión | Resolución |
|---|---|---|
| **D-A** | Dónde viven los mapas `*_LABELS` | **Cada mapa queda en su `<módulo>/types.ts`.** Solo se crea `src/lib/format.ts` (dinero/fecha/cantidad) y se mueve ahí `formatMoney`; `transactions/types.ts` lo **re-exporta** para no romper imports. La consistencia visual la da `<Badge>`, no la ubicación del texto. |
| **D-B** | Confirmar borrado de producto | **`<ConfirmDialog>` propio** (`<dialog>` nativo, ~50 líneas, reutilizable). Reemplaza `window.confirm` en `MyProductsPage`. |
| **D-C** | Landing de `/` para visitante | **Hero simple**: wordmark grande, una línea de propósito, CTAs "Ver catálogo" + "Crear cuenta", fondo con acento verde. |
| **D-D** | Header en <768px | **Wrap simple**: wordmark a la izquierda, enlaces bajan a una segunda fila (scroll horizontal si no entran). Sin JS de menú. |
| **D-E** | `favicon.svg` + `index.html` | **Reemplazar** el favicon morado default por una marca verde (hoja/brote SVG); `lang="en"` → `lang="es"`. |
| **D-F** | Home logueada | **Panel de accesos**: saludo + tarjetas-acción por rol (Productor: Mis productos, Mis ventas, Perfil de finca, Conversaciones, Notificaciones; Comprador: Catálogo, Conversaciones, Notificaciones). Sin datos agregados (sería feature). |
| **D-G** | Alcance de skeletons | **Grilla de catálogo + 4 listas** (`ConversationsPage`, `NotificationsPage`, `ProducerSalesPage`, `MyProductsPage`). Detalle y formularios: `<LoadingBlock>`. |
| **D-H** | "Mis ventas" en desktop | **Tabla real** (`<table>`, montos a la derecha, fila de totales) que colapsa a **tarjetas** en <768px. |

Paleta: la propuesta de §Design tokens se acepta sin cambios de hex.

---

## Diseño acordado

### Estructura de archivos nueva

```
frontend/src/
├── index.css                 # reset + tokens (:root) + estilos base de elementos  [reescrito]
├── styles/
│   └── utils.css             # ~6 utilidades: .container .stack .row .cluster .muted .visually-hidden
├── lib/
│   └── format.ts             # formatMoney, formatDate, formatDateTime, formatRelative, formatQuantity
├── ui/                       # componentes presentacionales (CSS Modules co-locados)
│   ├── Button.tsx  Button.module.css
│   ├── IconButton.tsx
│   ├── Field.tsx   Field.module.css          # label + control + hint + error, envuelve <input>/<select>/<textarea>
│   ├── Card.tsx    Card.module.css
│   ├── Badge.tsx   Badge.module.css          # variant: success | warning | danger | info | neutral
│   ├── Alert.tsx   Alert.module.css          # variant: error | warning | info | success ; role="alert"
│   ├── Spinner.tsx
│   ├── LoadingBlock.tsx                      # spinner + texto centrado (páginas que cargan 1 objeto)
│   ├── Skeleton.tsx  Skeleton.module.css     # <Skeleton.Line/> <Skeleton.Card/> con shimmer
│   ├── EmptyState.tsx  EmptyState.module.css # icono + título + texto + CTA opcional
│   ├── PageHeader.tsx  PageHeader.module.css # <h1> + subtítulo + slot de acciones (a la derecha)
│   ├── Breadcrumbs.tsx  Breadcrumbs.module.css
│   ├── ConfirmDialog.tsx  ConfirmDialog.module.css   # (si D-B = recomendada)
│   └── toast/
│       ├── ToastProvider.tsx  toast.module.css   # context + cola + auto-dismiss ~4s
│       └── useToast.ts                            # useToast() → { success, error, info }
├── components/
│   ├── Layout.tsx  Layout.module.css         # header + <Outlet/> + footer  [nuevo]
│   ├── AppHeader.tsx  AppHeader.module.css    # wordmark, nav por rol, <NotificationsBell/>, menú usuario  [nuevo]
│   ├── AppFooter.tsx                          # proyecto/materia + <BackendStatus/>  [nuevo]
│   ├── BackendStatus.tsx                      # el fetch a /health que hoy vive en App.tsx  [nuevo]
│   ├── Wordmark.tsx                           # marca (SVG hoja) + texto  [nuevo]
│   ├── NotificationsBell.tsx                  # [restyle: ícono lucide Bell + badge; misma lógica de polling]
│   └── ProtectedRoute.tsx                     # sin cambios de lógica
└── pages/
    ├── HomePage.tsx                           # extraído de App.tsx  [nuevo archivo, mismo contenido reescrito]
    ├── NotFoundPage.tsx                       # 404  [nuevo]
    └── … (las 13 existentes, reescritas visualmente)
```

### Design tokens — `src/index.css` (`:root`)

Propuesta (hex a afinar por el usuario). Verde-agro, limpio, tema claro:

```css
:root {
  color-scheme: light;

  /* Marca */
  --color-primary: #2e7d32;
  --color-primary-hover: #256428;
  --color-primary-active: #1e5321;
  --color-primary-contrast: #ffffff;
  --color-primary-subtle: #eaf3ea;      /* fondos seleccionados, chips */

  /* Neutrales — gris cálido levemente verdoso (no frío) */
  --color-bg: #f6f7f5;                   /* fondo de página */
  --color-surface: #ffffff;             /* tarjetas, header */
  --color-surface-sunken: #f0f2ef;      /* zonas hundidas (historial de chat) */
  --color-border: #e0e3dd;
  --color-border-strong: #c8ccc4;
  --color-text: #1b1e1a;
  --color-text-muted: #575d53;
  --color-text-subtle: #838a7d;

  /* Semánticos: texto / fondo */
  --color-success: #2e7d32;  --color-success-bg: #e7f4e8;
  --color-warning: #9a5b00;  --color-warning-bg: #fdf1dd;
  --color-danger:  #b3261e;  --color-danger-bg:  #fbe9e7;
  --color-info:    #1f6feb;  --color-info-bg:    #e8f0fe;

  /* Tipografía */
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --text-xs: .75rem;  --text-sm: .8125rem;  --text-base: .9375rem;
  --text-lg: 1.125rem;  --text-xl: 1.375rem;  --text-2xl: 1.75rem;
  --leading-tight: 1.25;  --leading-normal: 1.55;

  /* Espaciado (base 4px) */
  --space-1: .25rem; --space-2: .5rem; --space-3: .75rem; --space-4: 1rem;
  --space-5: 1.5rem; --space-6: 2rem; --space-8: 3rem;

  /* Radios / sombras / layout */
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgba(20,30,18,.06), 0 1px 3px rgba(20,30,18,.08);
  --shadow-md: 0 4px 12px rgba(20,30,18,.10);
  --container-max: 1080px;
  --header-h: 56px;
}
```

`index.css` además: box-sizing reset, `body { margin:0; background:var(--color-bg);
color:var(--color-text); font:var(--text-base)/var(--leading-normal) var(--font-sans); }`,
estilos base de `a` / `h1..h3` / `:focus-visible` (anillo verde de 2px, visible en todos
los controles), y baseline de `input,select,textarea,button` (heredan fuente, radio,
borde con token). Se elimina el `body { margin: 2rem }` actual.

### `src/lib/format.ts`

```ts
export function formatMoney(amount: number, opts?: { suffix?: boolean }): string;
//   1234567           -> "$ 1.234.567"
//   1234567,{suffix}  -> "$ 1.234.567 COP"      (Intl.NumberFormat es-CO, currency COP, maximumFractionDigits 0)

export function formatDateTime(iso: string): string;   // "2 sep 2026, 3:41 p. m."   (dateStyle medium + timeStyle short, es-CO, America/Bogota)
export function formatDate(iso: string): string;       // "2 sep 2026"
export function formatRelative(iso: string): string;   // "hace 5 min" | "hace 2 h" | "ayer" | "12 ago" | "12 ago 2025"
//   < 60s "recién" · < 60min "hace N min" · < 24h "hace N h" · ayer · < 7d "hace N días" · mismo año "12 ago" · otro "12 ago 2025"

export function formatQuantity(qty: number, unit: ProductUnit, opts?: { long?: boolean }): string;
//   (12,'KILOGRAMO')            -> "12 kg"
//   (3,'ARROBA',{long:true})    -> "3 arrobas"
```

`transactions/types.ts`: se elimina su `formatMoney` local y se agrega
`export { formatMoney } from '../lib/format';` (compat con imports actuales). Nueva firma:
el 2º parámetro pasa de `currency = 'COP'` a `opts?` — se actualizan las 3 llamadas
(`TransactionStatusPage`, `ProducerSalesPage`) que hoy pasan `txn.currency`. La moneda
siempre es COP (backend fase 1), así que no se pierde nada.

### Componentes `src/ui/` — contrato

| Componente | Props clave | Notas |
|---|---|---|
| `Button` | `variant: 'primary'\|'secondary'\|'danger'\|'ghost'` (def. primary), `size: 'sm'\|'md'`, `loading?`, `as?: 'button'\|'link'` + `to` | `loading` → spinner + `disabled` + preserva ancho. Reemplaza **todos** los `<button>` y CTAs. |
| `IconButton` | `icon`, `label` (obligatorio, va a `aria-label`), `variant` | Íconos lucide. Para acciones compactas (cerrar toast, editar en fila). |
| `Field` | `label`, `hint?`, `error?`, `required?`, `children` (el control) | Envuelve `<input>/<select>/<textarea>`. Marca `aria-invalid` + `aria-describedby`. Unifica los `<label>` sueltos de hoy. |
| `Card` | `as?`, `interactive?` (hover elevado + cursor), `padding?` | Base de todas las tarjetas de lista/grilla. `interactive` para las que son un link. |
| `Badge` | `variant`, `children` | Píldora. Mapeos de estado en cada página (o helper local `statusBadge(status)`). |
| `Alert` | `variant: 'error'\|'warning'\|'info'\|'success'`, `children` | `role="alert"` en error/warning. Reemplaza los `<p role="alert">`. |
| `Spinner` | `size?` | SVG, `aria-hidden`; el texto lo pone el contenedor. |
| `LoadingBlock` | `label?` (def. "Cargando…") | Centrado, para páginas que resuelven 1 objeto. |
| `Skeleton.Line` / `Skeleton.Card` | `count?` | Shimmer con `--color-surface-sunken`. |
| `EmptyState` | `icon`, `title`, `description?`, `action?` (`<Button>`) | Para las 6 listas/grilla vacías. |
| `PageHeader` | `title`, `subtitle?`, `actions?` | `<h1>` + fila de acciones a la derecha; debajo de los breadcrumbs. |
| `Breadcrumbs` | `items: {label, to?}[]` | Último sin link. Sustituye los `← Inicio` / `← Volver`. |
| `ConfirmDialog` | `open`, `title`, `body`, `confirmLabel`, `onConfirm`, `onCancel`, `danger?` | `<dialog>` nativo + foco atrapado. Solo si `D-B` = recomendada. |
| `ToastProvider` / `useToast` | `useToast()` → `{ success(msg), error(msg), info(msg) }` | Cola arriba-derecha, auto-dismiss ~4 s, `aria-live="polite"`. Provider en `main.tsx`, dentro de `AuthProvider`. |

### Shell — `<Layout>`

- **`main.tsx`**: `<BrowserRouter><AuthProvider><ToastProvider><App/></ToastProvider></AuthProvider></BrowserRouter>`.
- **`App.tsx`**: `<Routes>` con una ruta padre `<Route element={<Layout/>}>` que envuelve
  **todas** las actuales (mismas `path`, mismos `element`, mismos `ProtectedRoute`). `<Layout>`
  renderiza `<AppHeader/> <main className="container"><Outlet/></main> <AppFooter/>`. Se agrega
  `<Route path="*" element={<NotFoundPage/>}/>`.
- **`AppHeader`** (sticky, `--header-h`, `--color-surface`, borde inferior):
  - Izquierda: `<Wordmark/>` (link a `/`).
  - Centro/derecha: nav. **No logueado**: "Catálogo", "Ingresar", "Crear cuenta" (esta última
    `<Button size="sm">`). **Logueado**: "Catálogo", "Conversaciones", "Notificaciones"
    (`<NotificationsBell/>` con ícono + badge); si `role==='PRODUCER'` también "Mis productos",
    "Mis ventas"; y un menú de usuario (nombre + `ChevronDown`) con "Perfil de finca"
    (solo productor) y "Cerrar sesión". Ítem activo resaltado con `NavLink`.
  - <768px: comportamiento de `D-D`.
- **`AppFooter`**: "Marketplace Agrícola Huila · Sistemas Distribuidos 2026-b · Proyecto
  académico" + `<BackendStatus/>` (punto verde/rojo + "backend ok/—", el fetch a `/health`
  que hoy está inline en `Home`).
- **Breadcrumbs**: los pone cada página como primer hijo, vía `<Breadcrumbs items=[…]/>`.

### Rediseño vista por vista

Formato: **Layout** · **Componentes** · **Cambios** · **Igual que hoy** (comportamiento intacto).

**HomePage (`/`)** — extraída de `App.tsx`.
- Layout: sin breadcrumbs. No logueado → hero (`D-C`). Logueado → `PageHeader` "Hola, {nombre}"
  + grilla de `Card interactive` de accesos (`D-F`).
- Componentes: `Card`, `Button`, íconos lucide por acción.
- Cambios: el `<p>` de estado del backend se va al footer. Los enlaces de texto pasan a tarjetas/botones.
- Igual: qué se muestra según `auth`/`role`; `logout`.

**LoginPage (`/login`) · RegisterPage (`/register`)**
- Layout: sin header-nav pesado; tarjeta centrada `max-width: 400px`, `<Wordmark/>` arriba,
  `PageHeader` ("Ingresar" / "Crear cuenta"), `Field` por campo, `Button` full-width, link cruzado abajo.
- Componentes: `Card`, `Field`, `Button`, `Alert` (error).
- Cambios: `<fieldset>` de rol (Register) → 2 `Card`-radio seleccionables (Comprador / Productor)
  con ícono; validación nativa preservada; `required`/`minLength` intactos.
- Igual: `handleSubmit`, estados `submitting`, navegación post-acción (`/` / `/login`),
  mensajes de error del backend.

**CatalogPage (`/catalogo`)** — pública.
- Layout: `Breadcrumbs` (Inicio / Catálogo), `PageHeader` "Catálogo", barra de filtros en
  `Card`, grilla responsive de `Card interactive` (`repeat(auto-fill, minmax(240px, 1fr))`).
- Componentes: `Field` (select categoría, input municipio), `Button` (Filtrar / Limpiar),
  `Skeleton.Card` (carga), `EmptyState` (sin resultados), `Alert` (error), `Badge` "Agotado"
  si aplica (hoy no se listan SOLD_OUT, pero el badge queda por si el filtro cambia).
- Cambios: precio con `formatMoney`; categoría/municipio con ícono `MapPin`; foto con
  `aspect-ratio` fijo y `object-fit: cover`; placeholder "Sin foto" con ícono `ImageOff`.
- Igual: `browseCatalog(applied)`, separación filtros editados vs aplicados, navegación a detalle.

**ProductDetailPage (`/productos/:id`)** — pública.
- Layout: `Breadcrumbs` (Inicio / Catálogo / {nombre}); dos columnas en desktop (foto ~ 45% /
  info + CTA), una columna <768px.
- Componentes: `Card`, `Badge` (Agotado = neutral), `Button` (Chatear), `Alert`, `LoadingBlock`.
- Cambios: `<dl>` → lista de pares etiqueta/valor estilada (ícono por fila: `User`, `Tag`,
  `MapPin`, `Coins`, `Package`); precio `formatMoney` + `formatQuantity`; los 3 estados del
  botón de chat (no logueado / no comprador / comprador) se unifican en un `<Button>` con
  `disabled` + `title`, misma lógica `canChat`.
- Igual: `getProduct`, `handleChat` → `openConversation` → navega `/chat/:id`, gating por rol/estado/propiedad.

**MyProductsPage (`/mis-productos`)** — productor.
- Layout: `Breadcrumbs`, `PageHeader` "Mis productos" con acción `<Button>` "Nuevo producto"
  (`Plus`) a la derecha; lista de `Card` (foto 72px, nombre + `Badge` estado, meta con
  `formatMoney`/`formatQuantity`, acciones a la derecha).
- Componentes: `Card`, `Badge`, `Button`/`IconButton` (Editar `Pencil`, Marcar estado, Eliminar
  `Trash2` variant danger), `Skeleton`, `EmptyState` ("Todavía no publicaste…", CTA "Publicar el primero"),
  `Alert`, `ConfirmDialog` (`D-B`), `useToast` (éxito al cambiar estado / eliminar).
- Cambios: `window.confirm` → `ConfirmDialog` (o se mantiene, `D-B`); colores hardcodeados de
  estado → `Badge`.
- Igual: `getMyProducts`, `toggleStatus`, `remove`, `busyId`, actualización optimista de la lista.

**ProductFormPage (`/mis-productos/nuevo` · `/:id/editar`)** — productor.
- Layout: `Breadcrumbs` (… / Mis productos / Nuevo|Editar), `PageHeader`, formulario en `Card`,
  agrupado en 2 secciones ("Datos del producto" / "Foto"); `Button` submit + `Button ghost` "Cancelar".
- Componentes: `Field` (todos los campos, con `hint` en precio "COP por unidad" y cantidad),
  `Alert`, `LoadingBlock` (carga en edición), `useToast` (éxito → toast en `/mis-productos`).
- Cambios: preview de foto con marco; `datalist` de municipios preservado; number inputs con `hint`.
- Igual: prefill (perfil de finca en alta / producto en edición), `handleSubmit`
  (`createProduct`/`updateProduct` + `uploadProductPhoto`), navegación a `/mis-productos`.

**FarmProfilePage (`/farm-profile`)** — productor.
- Layout: `Breadcrumbs`, `PageHeader` "Perfil de finca", form en `Card`.
- Componentes: `Field` ×4, `Button`, `Alert`, `LoadingBlock`, `useToast` (reemplaza el
  `{saved && <p>Perfil guardado.</p>}`).
- Igual: `getFarmProfile` (404 = sin perfil, no es error), `saveFarmProfile`, `form` controlado.

**ConversationsPage (`/chat`)**
- Layout: `Breadcrumbs`, `PageHeader` "Mis conversaciones", lista de `Card interactive`.
- Componentes: fila con avatar de iniciales (`otherParticipantName`), nombre de producto (fuerte),
  "con {contraparte}", `Badge` de forma de compra (PLATFORM=info, OFF_PLATFORM=neutral, sin
  acordar=neutral outline), `formatRelative(lastMessageAt)` a la derecha; `Skeleton`, `EmptyState`
  (con CTA al catálogo), `Alert`.
- Cambios: `new Date(...).toLocaleString` → `formatRelative`; `PURCHASE_METHOD_LABELS` dentro de `Badge`.
- Igual: `listConversations`, navegación a `/chat/:id`.

**ConversationPage (`/chat/:conversationId`)** — la más "app".
- Layout: `Breadcrumbs` (Inicio / Conversaciones / {producto}); cabecera compacta (producto +
  "con {contraparte}" + `Badge` de conexión: "en línea" success / "reconectando…" warning);
  selector de forma de compra en una fila; bloque de pago (si aplica) en `Alert`/`Card` con acento;
  **historial** en zona `--color-surface-sunken` con scroll (`min-height` 240, `max-height` 60vh),
  **burbujas** (propias derecha `--color-primary-subtle`, ajenas izquierda `--color-surface`),
  hora con `formatRelative`/`toLocaleTimeString` agrupada; **composer sticky** abajo (`Field`
  sin label + `Button` `Send`).
- Componentes: `Badge`, `Button`, `Field`, `Alert`, `LoadingBlock`, `EmptyState` ("Todavía no
  hay mensajes"), `useToast` (error al guardar forma de compra).
- Cambios: solo estéticos sobre lo que ya hay (las burbujas ya existen con estilos inline →
  pasan a CSS Module); autoscroll al último mensaje al montar y al recibir (mejora de UX
  sin cambiar datos).
- Igual: carga `getConversation`+`getMessages`, socket STOMP (`connectToConversation`,
  `onMessage`, `onConnectedChange`, recarga por REST al reconectar), `handleSend`,
  `handleMethodChange`, `handlePay` (incluye el manejo de 409 → busca la transacción viva →
  `/transacciones/:id`), `window.location.href = checkoutUrl`.

**TransactionStatusPage (`/transacciones/:id`)**
- Layout: `Breadcrumbs`, `PageHeader` "Estado de la compra"; `Card` central con ícono grande de
  estado (`Clock` warning / `CheckCircle2` success / `XCircle` danger), `Badge` de estado,
  y `<dl>` estilada (producto, cantidad × precio, **Total** con `formatMoney(x,{suffix:true})`,
  contraparte, fecha de confirmación con `formatDateTime`).
- Componentes: `Badge`, `Alert` (aviso de cancelado / expirado), `LoadingBlock`.
- Cambios: `statusColor()` local → `Badge` + color de ícono por token; fechas por `format*`.
- Igual: carga + `refresh`, **polling** (`paidReturn` + `PENDING` + `pollCount < MAX_POLLS`,
  intervalo 2s), lectura de `?pago=ok|cancelado`, textos por estado.

**ProducerSalesPage (`/mis-ventas`)** — productor.
- Layout: `Breadcrumbs`, `PageHeader` "Mis ventas" con el **neto confirmado** como stat a la
  derecha; **tabla** en desktop / **tarjetas** <768px (`D-H`): Producto · Comprador · Fecha
  (`formatDate`) · Cantidad×Precio · Total · Estado (`Badge`) · Ver; fila de totales
  (`formatMoney(totalNet,{suffix:true})`). Desglose de ledger (bruto/comisión/neto) en fila
  expandible o como subtexto.
- Componentes: `Badge`, `Button`/link "Ver detalle", `Skeleton`, `EmptyState`, `Alert`.
- Cambios: `statusColor()` → `Badge`; `toLocaleDateString` → `formatDate`.
- Igual: `listMyTransactions` filtrado `role==='PRODUCER'`, cálculo de `totalNet` sobre
  `CONFIRMED`, navegación a `/transacciones/:id`.

**NotificationsPage (`/notificaciones`)**
- Layout: `Breadcrumbs`, `PageHeader` "Notificaciones" con acción "Marcar todas como leídas"
  (`<Button ghost>`, visible si hay ítems); lista de `Card` con **acento izquierdo info** si no
  leída + punto, ícono por tipo (`MessageSquare` / `CheckCircle2`), `formatRelative(createdAt)`.
- Componentes: `Card`, `Button`, `Skeleton`, `EmptyState` ("No tenés notificaciones"), `Alert`.
- Cambios: el `<button>` "reset" con estilos inline → `Card` clickable accesible (`role`/tecla);
  colores hardcodeados (`#0b5fff`) → tokens `--color-info`.
- Igual: `load`, `openNotification` (marca leída → `navigate(link)`), `markAll`.

**NotificationsBell** (`components/`)
- Cambios: `🔔` emoji → `<Bell/>` de lucide + badge numérico como `<span>` posicionado; mismo
  `aria-label` dinámico.
- Igual: polling cada 20 s, `unreadCount`, link a `/notificaciones`, errores silenciosos.

**NotFoundPage (`/*`)** — nueva.
- `EmptyState` (icono `Compass`, "Página no encontrada", CTA "Ir al inicio").

### Accesibilidad y responsive (baseline, bajo costo)

- `:focus-visible` con anillo visible en todos los controles (token).
- `<Field>` enlaza `label`/`error` por `id`/`aria-describedby`/`aria-invalid`.
- Contraste AA en la paleta (verificar los pares texto/fondo al implementar el Corte 0).
- Toasts `aria-live="polite"`; `Alert` de error `role="alert"`.
- Íconos decorativos `aria-hidden`; `IconButton` exige `label`.
- Un solo `@media (max-width: 768px)`: header (`D-D`), grillas a 1–2 columnas, tabla de ventas
  → tarjetas, detalle de producto a 1 columna, composer de chat full-width.
- Objetivo de navegador: Chrome actual (demo). Sin polyfills.

---

## Plan de pruebas (criterio de salida)

1. `cd frontend && npm run lint` → verde (oxlint; ojo `react/only-export-components` con
   `useToast`/context: separar hook y provider en archivos distintos).
2. `cd frontend && npm run build` → `tsc -b` sin errores + `vite build` OK.
3. `npm run dev` + recorrido en Chrome, con backend + `docker compose up` + `stripe listen`:
   - Registro (comprador y productor) → login → logout. Validaciones nativas siguen.
   - Productor: crear / editar / cambiar estado / eliminar producto (con `ConfirmDialog`),
     subir foto, editar perfil de finca (toast de guardado).
   - Comprador: catálogo + filtros (categoría, municipio), detalle, "Chatear".
   - Chat en vivo entre 2 sesiones (2 navegadores): mensajes, reconexión, forma de compra.
   - Acordar "Por la plataforma" → pagar con `4242…` → volver a `/transacciones/:id` → polling
     hasta "Confirmada".
   - Productor ve la venta en `/mis-ventas` (tabla + neto), notificaciones en la campana y en
     `/notificaciones` (relativo, acento no leída, marcar leída / todas).
   - 404 en una URL cualquiera.
4. Verificación de no-regresión de alcance:
   - `git diff --stat` no toca `src/api/`, `src/auth/api.ts`, `src/chat/ws.ts` ni `backend/`.
   - `git grep -nE "toLocaleString|toLocaleDateString|toLocaleTimeString|new Date\\(" src/pages src/components`
     → solo dentro de `src/lib/format.ts` (o nada).
   - `git grep -n "style={{" src/pages` → vacío salvo posicionamiento dinámico documentado.
5. Screenshots de las 14 vistas (13 + 404) adjuntos al cierre.
6. `cd backend && mvn test` → verde (sin cambios; se corre por ritual).

---

## Plan de cortes (implementación en una sesión, entrega 3-sep)

Cada corte deja el front **compilando y navegable**; nada queda "a medio estilar".

| Corte | Contenido | Verificación al cerrar el corte |
|---|---|---|
| **0 — Fundación** | `lucide-react` (install + pin); `index.css` (tokens + reset + base); `styles/utils.css`; `src/lib/format.ts` + ajuste de `transactions/types.ts`; **todo** `src/ui/` (Button, IconButton, Field, Card, Badge, Alert, Spinner, LoadingBlock, Skeleton, EmptyState, PageHeader, Breadcrumbs, ConfirmDialog, toast/); `Wordmark`, `BackendStatus`; `Layout` + `AppHeader` + `AppFooter`; `App.tsx` (ruta padre `<Layout>` + 404); `main.tsx` (`ToastProvider`); `HomePage` extraída; `index.html` (`lang`, favicon). | `npm run build` + `lint` verde. Home, header, footer y 404 se ven con el sistema aplicado. El resto de páginas ya heredan shell + tipografía (aún con su maquetación vieja adentro, pero legibles). |
| **1 — Alto tráfico** | `LoginPage`, `RegisterPage`, `CatalogPage`, `ProductDetailPage`. | Recorrido público + login en Chrome; screenshots. |
| **2 — Núcleo app** | `ConversationsPage`, `ConversationPage` (burbujas + composer sticky + autoscroll), `NotificationsPage`, `NotificationsBell`. | Chat en vivo 2 sesiones; notificaciones. |
| **3 — Productor + transacciones** | `MyProductsPage`, `ProductFormPage`, `FarmProfilePage`, `TransactionStatusPage`, `ProducerSalesPage`. | CRUD completo + flujo de pago Stripe sandbox + `/mis-ventas`. |
| **4 — Remate** | Toasts en crear/guardar/eliminar; skeletons donde falten; repaso de consistencia (spacing, tamaños de botón, breadcrumbs en todas); pasada responsive 768/375; `lint` + `build`; screenshots de las 14 vistas. | Criterio de salida completo. |

**Si el tiempo/contexto aprieta:** se recorta el **nivel de pulido** del Corte 4 (skeletons
finos, micro-detalles responsive), nunca una pantalla entera — todas pasan por Cortes 1–3 con
shell + componentes.

---

## Archivos que nacerán / se modificarán (referencia)

**Nuevos:**
- `frontend/src/styles/utils.css`
- `frontend/src/lib/format.ts`
- `frontend/src/ui/**` (≈ 14 componentes + CSS Modules)
- `frontend/src/components/{Layout,AppHeader,AppFooter,BackendStatus,Wordmark}.tsx` (+ CSS Modules)
- `frontend/src/pages/{HomePage,NotFoundPage}.tsx`

**Modificados:**
- `frontend/src/index.css` (reescrito), `frontend/src/main.tsx` (ToastProvider),
  `frontend/src/App.tsx` (ruta `<Layout>` + 404, extrae `Home`)
- `frontend/src/components/{NotificationsBell,ProtectedRoute}.tsx` (Bell: ícono; ProtectedRoute:
  sin cambios de lógica)
- Las 13 páginas de `frontend/src/pages/*` (reescritura visual, sin cambio de lógica)
- `frontend/src/transactions/types.ts` (mueve `formatMoney` a `lib/`, re-exporta)
- `frontend/index.html` (`lang="es"`, favicon), `frontend/public/favicon.svg` (marca verde)
- `frontend/package.json` / lockfile (`lucide-react`)

**Sin tocar:** `frontend/src/api/client.ts`, `frontend/src/*/api.ts`, `frontend/src/chat/ws.ts`,
`frontend/src/auth/AuthContext.tsx`, todo `backend/`.

**Docs (al cerrar):** `docs/claude/estado-actual.md`, `docs/backlog.md`, este spec.
