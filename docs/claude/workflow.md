# Workflow con Claude Code — Marketplace Agrícola Huila

Resumen del proceso de desarrollo asistido que montamos. Léelo cuando necesites recordar
cómo encaja todo. El detalle operativo vive en [`../../CLAUDE.md`](../../CLAUDE.md) y en
[`../../.claude/skills/epica/SKILL.md`](../../.claude/skills/epica/SKILL.md).

## La idea en una frase

**Una épica por chat**, con un **spec acordado antes de codear**, y **todo el contexto en
git** — nunca solo en la memoria de un chat.

## Las piezas

| Archivo | Qué es | Cuándo se toca |
|---|---|---|
| `CLAUDE.md` (raíz) | Reglas duras + lectura obligatoria + comandos. Claude lo carga solo en **cada** sesión. | Casi nunca; solo si cambia una regla del proyecto |
| `docs/claude/estado-actual.md` | Doc **vivo**: dónde estamos, qué existe, cómo se prueba. | Al cerrar cada épica |
| `docs/claude/epica-N-spec.md` | Diseño acordado de la épica N (endpoints, datos, DTOs, migraciones, plan de pruebas). Congelado tras acordarse. | Se crea al arrancar la épica; se ajusta solo si el diseño cambia en el camino |
| `docs/claude/handoffs/` | Histórico: los prompts de arranque del flujo viejo (épicas 1–3). Referencia, no se mantiene. | Nunca |
| `.claude/skills/epica/SKILL.md` | El skill que ejecuta el ritual de arranque y cierre. Se invoca con `/epica`. | Casi nunca |
| `docs/architecture.md` · `docs/backlog.md` · `docs/PDR.md` | El **qué** y el **porqué** del *proyecto* (no del workflow): estructura, épicas, requisitos. | `backlog.md` al cerrar cada épica (marcar ✅ + decisiones); los otros rara vez |
| Memoria automática de Claude | Red de seguridad extra del contexto, fuera del repo. | Sola; la fuente de verdad son los docs en git |

## El ciclo de una épica

### 1. Arranque (chat nuevo)

- Abre un chat nuevo. Di **"arranquemos la Épica N"** o `/epica arranque`.
- Claude lee, en orden: `estado-actual.md` → `backlog.md` (sección de la épica) → `architecture.md` → `PDR.md` → `epica-N-spec.md` si ya hay borrador.
- Claude redacta/afina `docs/claude/epica-N-spec.md` y te presenta las **decisiones a resolver** una por una (recomendación + porqué + alternativa). Tú eliges.
- Cuando no quedan decisiones abiertas, el spec deja de ser `BORRADOR` y **recién ahí se implementa**.

### 2. Durante la implementación

- Se codea **contra el spec**. Si el diseño cambia, se actualiza `epica-N-spec.md` en el momento.
- Claude explica las decisiones técnicas importantes **después** de implementarlas (concepto + porqué + alternativa descartada), sin pausar para pre-aprobación.
- Se respetan siempre las reglas duras de `CLAUDE.md`: aislamiento de módulos, rangos Flyway, usuario/rol desde el JWT, `ResponseStatusException` para errores de negocio.

### 3. Cierre (mismo chat)

- Di **"cerremos la épica"** o `/epica cierre`.
- `cd backend && mvn test` en verde (+ `npm run lint` y prueba en navegador si tocó frontend).
- Se actualiza `estado-actual.md` (épica → ✅, módulo nuevo documentado) y `backlog.md` (✅ Completada + Decisiones tomadas).
- Claude propone el/los commit(s) — **uno por épica** (o dos: backend / frontend). Tú commiteas.

## Reglas de oro

1. **Una épica por chat.** No mezclar. Evita que el contexto se sature y se degrade.
2. **Nada no trivial sin spec acordado.** Las decisiones de diseño se toman cuando corregirlas es gratis, no a mitad del código.
3. **El contexto vive en git.** `estado-actual.md` + `epica-N-spec.md` son la continuidad entre chats; no hay que pegar nada a mano.
4. **Un commit por épica.** Historia limpia, `git bisect` posible.
5. **Qué se versiona:** todo — `CLAUDE.md`, `.claude/skills/`, `.claude/launch.json`, `docs/claude/`. **Qué NO:** `.claude/settings.local.json`, `CLAUDE.local.md` (personales, en `.gitignore`).

## Cómo empezar un chat nuevo (el prompt mínimo)

- **Antes:** pegabas el handoff a mano + "lee arquitectura, backlog y PDR".
- **Ahora:** **"arranquemos la Épica N"** (o `/epica arranque`). `CLAUDE.md` se carga solo y define qué leer.

Si es un chat de mantenimiento (no una épica), basta con pedir lo que necesites — `CLAUDE.md`
ya le dio a Claude las reglas y los punteros.

## Qué cambió respecto al flujo viejo

| Antes | Ahora |
|---|---|
| Un `handoff-epica-N.md` por chat, escrito a mano, que mezclaba estado + plan + decisiones | `estado-actual.md` (vivo) + `epica-N-spec.md` (diseño) separados |
| Recargabas 4 docs a mano en cada chat | `CLAUDE.md` auto-cargado; el skill sabe qué leer |
| El ritual estaba en tu cabeza | El ritual está en `.claude/skills/epica/SKILL.md` |

## Cheat sheet

**Frases que disparan el skill:** "arranquemos / empecemos la Épica N", "cerremos la épica",
"terminé la Épica N", `/epica`, `/epica arranque`, `/epica cierre`.

**Comandos:**
```bash
docker compose up -d                               # infra (Postgres + RabbitMQ)
docker compose down -v && docker compose up -d     # resetear la BD desde cero
cd backend && mvn spring-boot:run                  # backend → :8080  (/health)
cd backend && mvn test                             # ArchitectureTests
cd frontend && npm run dev                         # frontend → :5173
cd frontend && npm run lint
```

**Rangos Flyway:** `auth` V1xx · `catalog` V2xx · `chat` V3xx · `transactions` V4xx ·
`notifications` V5xx. Primera migración de tablas de un módulo nuevo = `V{n}02` (`V{n}01`
crea el schema).

**Orden de épicas:** 0 scaffold ✅ · 1 Auth ✅ · 2 Catálogo ✅ · **3 Chat** · 4 Transacciones · 5 Notificaciones.
