---
name: epica
description: >-
  Ritual de trabajo por épica del monolito Marketplace Agrícola Huila — se construye una
  épica por chat. Úsalo cuando el usuario vaya a EMPEZAR a trabajar en una épica del backlog
  ("arranquemos la Épica 3", "empecemos la épica de chat", "vamos con la siguiente épica",
  "/epica", "/epica arranque") o cuando vaya a CERRAR una épica terminada ("cerremos la
  épica", "terminé la Épica 3", "ya quedó, actualiza el estado y el backlog", "/epica cierre").
  En arranque carga el contexto obligatorio (docs/claude/estado-actual.md, docs/backlog.md,
  docs/architecture.md, docs/PDR.md) y redacta/afina docs/claude/epica-N-spec.md, alineando
  las decisiones abiertas con el usuario ANTES de implementar. En cierre actualiza
  docs/claude/estado-actual.md, marca la épica en docs/backlog.md, corre mvn test y propone
  el commit. Es el procedimiento acordado: no lo hagas a mano ni te saltes el spec.
---

# Ritual de épica — Marketplace Agrícola Huila

El proyecto se construye **una épica por chat** (ver [`CLAUDE.md`](../../../CLAUDE.md)
§Flujo de trabajo). Cada chat de épica tiene dos momentos con procedimiento fijo:
**arranque** (cargar contexto → redactar el spec → alinear → implementar) y **cierre**
(verificar → actualizar estado → backlog → proponer commit). Este skill es ese procedimiento.

Por qué existe: sin un arranque disciplinado, cada chat re-descubre el estado del repo a
tientas y las decisiones de diseño se toman a mitad de la implementación, cuando ya cuesta
caro cambiarlas. Sin un cierre disciplinado, el chat siguiente arranca con información vieja.

## Detectar la fase

- Arg `arranque` o `cierre` → esa fase.
- Sin arg: inferir del mensaje. "empecemos / arranquemos / vamos con la Épica N" → arranque.
  "cerremos / terminé / ya quedó la Épica N" → cierre. Si el chat ya venía implementando y el
  usuario dice "listo / funciona", suele ser cierre.
- Si es ambiguo, preguntar antes de actuar.

---

## Arranque

### 1. Cargar el contexto obligatorio

Leer en este orden:
1. `docs/claude/estado-actual.md` — qué existe hoy, qué falta, cómo se prueba.
2. `docs/backlog.md` — la sección de la épica objetivo (alcance, criterio de salida) y las
   "Decisiones tomadas" de épicas previas que puedan aplicar (varias de Catálogo aplican a Chat).
3. `docs/architecture.md` — §2 estructura, §3 comunicación entre módulos, §4 Flyway, §5
   auth/errores. Es la convención a reutilizar, no a reinventar.
4. `docs/PDR.md` — los RF de la épica y los no funcionales relevantes.
5. `docs/claude/epica-N-spec.md` si ya existe (puede haber un borrador de una sesión previa).

Confirmar al usuario en 3-4 líneas: de qué estado partimos y cuál es la épica.

### 2. Redactar / afinar el spec

Escribir `docs/claude/epica-N-spec.md` con esta estructura (ejemplo real y vigente:
`docs/claude/epica-3-spec.md`):

- **Encabezado** — estado (`BORRADOR` mientras haya decisiones sin cerrar) y de qué depende
  (qué `XModuleApi` de otros módulos consume, vía la regla de aislamiento).
- **Alcance** — condensado del backlog: backend + frontend + criterio de salida.
- **Decisiones a resolver** — tabla `# | decisión | recomendación tentativa | alternativa`.
  Salen de lo que el backlog/PDR dejan abierto y de lo que aparezca al diseñar el modelo de
  datos y los contratos. Cada fila: recomendación + porqué + alternativa descartada.
- **Diseño acordado** — modelo de datos (tabla + migración en el rango Flyway del módulo),
  endpoints REST, `XModuleApi` nuevo y sus tipos, eventos publicados, frontend
  (`<modulo>/{api,types}.ts`, `pages/`, rutas). Marcar borrador mientras queden decisiones abiertas.
- **Plan de pruebas** — pasos end-to-end que demuestran el criterio de salida (navegador + `mvn test`).
- **Archivos que nacerán** — lista de referencia.

### 3. Alinear antes de implementar

Presentar las "Decisiones a resolver" al usuario **una por una** (recomendación + porqué +
alternativa, y el usuario elige — es el formato de aprendizaje acordado en `CLAUDE.md`).
Volcar cada respuesta en "Diseño acordado" y quitar el marbete `BORRADOR` cuando no quede
ninguna decisión abierta.

No escribir código de las partes no triviales hasta que el spec esté acordado. Sí se puede
adelantar scaffolding obvio (crear el paquete del módulo, revisar la migración de schema
`V{n}01` existente) mientras se alinea el resto.

### 4. Implementar contra el spec

Seguir el spec. Si el diseño cambia en el camino, actualizar `epica-N-spec.md` en el momento
— no dejarlo desincronizado. Respetar las reglas duras de `CLAUDE.md`: aislamiento de módulos
(solo `XModuleApi` / eventos), rango Flyway del módulo, usuario y rol desde el JWT,
`ResponseStatusException` para errores de negocio.

Explicar las decisiones técnicas importantes **después** de implementarlas, junto con el
cambio (concepto + porqué + alternativa descartada). Sin pausa de pre-aprobación salvo que
aparezca una decisión de diseño no trivial no contemplada en el spec.

---

## Cierre

### 1. Verificar

- `cd backend && mvn test` en verde. Incluye `ArchitectureTests`: el módulo nuevo debe
  respetar los límites (solo importar el `XModuleApi` de otros módulos, nunca sus
  `domain/application/infrastructure/web`).
- Si el frontend cambió: `cd frontend && npm run lint` y, cuando aplique, una prueba
  end-to-end en navegador que cubra el criterio de salida del backlog.

Si algo falla, arreglarlo antes de seguir — no cerrar una épica con el test rojo.

### 2. Actualizar `docs/claude/estado-actual.md`

- Mover la épica a ✅ en la tabla de progreso; actualizar "Épica en curso" y la fecha del encabezado.
- Añadir la subsección del módulo nuevo en "Backend — qué existe" y/o "Frontend — qué existe":
  contrato público, endpoints, migración, páginas. Mismo nivel de detalle que la de `catalog`.
- Sumar los gotchas nuevos que sigan vigentes; quitar los que dejaron de aplicar.
- Mantenerlo **delgado**: es estado, no el porqué. El porqué vive en el backlog y el spec.

### 3. Actualizar `docs/backlog.md`

- Marcar la épica `✅ Completada` y sus ítems.
- Añadir/ajustar su sección "Decisiones tomadas" con lo que se resolvió en el spec, para que
  el backlog siga siendo el registro navegable de decisiones del proyecto.

### 4. Proponer el commit (no ejecutarlo sin que el usuario lo pida)

Un commit por épica; dos si fue grande (`feat` de backend y `feat`/`chore` de frontend).
Conventional Commits, scope = módulo. Incluir en el mismo commit los docs actualizados
(`estado-actual.md`, `backlog.md`, `epica-N-spec.md`). Terminar con el trailer
`Co-Authored-By` habitual.

**Ejemplo 1**
Input: cerrada la Épica 3 — módulo `chat` completo (conversaciones, WebSocket, historial, forma de compra) + UI
Output: `feat(chat): add product conversations, realtime messaging, and purchase agreement`

**Ejemplo 2**
Input: cierre de la Épica 3, solo la parte de frontend en un commit aparte
Output: `feat(chat): add conversation UI with live websocket messaging`

Presentar el mensaje propuesto y esperar el ok del usuario para hacer `git commit`.

---

## Recordatorio — rangos Flyway

`auth` V1xx · `catalog` V2xx · `chat` V3xx · `transactions` V4xx · `notifications` V5xx.
Todas las carpetas comparten un único historial, por eso los rangos. La primera migración de
**tablas** de un módulo nuevo es `V{n}02` (`V{n}01` ya crea el schema).
