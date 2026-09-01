# `docs/claude/` — contexto de trabajo con Claude Code

Continuidad entre chats (una épica por chat, ver [`CLAUDE.md`](../../CLAUDE.md) §Flujo de trabajo).
Para el panorama completo del proceso, leer [`workflow.md`](workflow.md).

| Archivo | Naturaleza | Se actualiza |
|---|---|---|
| `workflow.md` | **Referencia.** Resumen estructurado de todo el proceso: las piezas, el ciclo de una épica, reglas de oro, cheat sheet. | Cuando cambie el proceso mismo |
| `estado-actual.md` | **Vivo.** Qué existe hoy en el repo, cómo se prueba. Fuente de verdad del avance. | Al cerrar cada épica |
| `epica-N-spec.md` | **Congelado tras acordarse.** Diseño de la épica N (endpoints, modelo de datos, DTOs, migraciones, plan de pruebas). Se redacta y se alinea con el usuario *antes* de implementar. | Solo si el diseño cambia durante la épica |
| `handoffs/` | **Histórico.** Prompts de arranque de las épicas 1–3, del flujo anterior (antes de separar estado/spec). Valor de referencia, no se mantienen. | Nunca |

Al arrancar una épica: leer `estado-actual.md` + la sección de esa épica en [`backlog.md`](../backlog.md)
+ [`architecture.md`](../architecture.md) + [`PDR.md`](../PDR.md), luego redactar `epica-N-spec.md`.
