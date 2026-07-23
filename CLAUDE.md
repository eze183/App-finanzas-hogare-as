# CLAUDE.md

Instrucciones para Claude Code al trabajar en este proyecto. Es el equivalente de `AGENTS.md` (que usa Codex) pero para Claude Code, y el punto de entrada a la documentación en `docs/`.

## Qué es este proyecto

App web estática para registrar gastos compartidos y personales entre dos personas (hoy Eze y Tami), con reparto 50/50 semanal, lectura de tickets/resúmenes por OCR, dictado por voz, y sincronización opcional entre dispositivos vía Supabase. Funciona también como PWA instalable en Android.

No tiene build ni backend propio: es HTML/CSS/JS plano servido tal cual, opcionalmente con Supabase como backend de sincronización.

## Antes de tocar código, leer

1. **`docs/architecture.md`** — cómo está armado el proyecto: modelo de datos, pipeline de renderizado, sincronización, PWA.
2. **`docs/roadmap.md`** — qué está en curso, qué falta, qué decisiones quedaron pendientes de que el usuario las tome.
3. **`docs/session-summary.md`** — bitácora de qué se hizo en cada sesión reciente.
4. **`docs/decisions.md`** — por qué se tomó cada decisión de diseño importante, para no deshacerlas sin querer.
5. **`CODEX_CONTEXT.md`** — memoria histórica detallada que usa Codex (ver más abajo). Tiene el registro día a día más granular hasta 2026-07-13.

## Regla permanente: mantener la documentación al día

**Cada vez que se termine una funcionalidad o un fix importante, actualizar automáticamente `docs/session-summary.md` y `docs/roadmap.md`** (agregar la entrada nueva, mover de "en curso" a "hecho" o de "pendiente" a lo que corresponda). No hace falta que el usuario lo pida cada vez — es un hábito de cierre de tarea, igual que el que ya existía para `CODEX_CONTEXT.md`.

Si el cambio involucra una decisión de diseño no obvia (por qué se eligió X en vez de Y), agregar también una entrada en `docs/decisions.md`.

## Cómo probar la app localmente

No hay servidor de desarrollo con hot-reload. Para probarla:

```
python -m http.server 8541 --directory "C:\Users\Eze\OneDrive\GALPÓN\App finanzas hogareñas"
```

(Requiere Python real instalado, no el stub de Microsoft Store — ver `docs/decisions.md` si hace falta contexto.) Después abrir `http://localhost:8541` en el navegador o en el Browser pane de Claude Code.

Para publicar cambios, el usuario hace `git push` manualmente cuando el auto-mode bloquea el push (ver advertencia de seguridad más abajo) — la web queda publicada en GitHub Pages: `https://eze183.github.io/App-finanzas-hogare-as/`.

## Advertencias importantes (aprendidas con errores reales)

- **`supabase-config.js` tiene las credenciales REALES de producción**, no un entorno de prueba. **No es solo el botón "Subir a Supabase" el que escribe en la base real**: `saveState()` llama a `queueCloudSave()`, que hace push automático ~900ms después de CUALQUIER cambio de estado (agregar o borrar un gasto, tocar un formulario, etc.) siempre que `supabase-config.js` tenga credenciales válidas — probado con el navegador (Browser pane) en la sesión del 2026-07-22, donde interactuar con la app para verificar el rediseño de Movimientos terminó borrando (tombstoneando) un gasto real ("Despensa", $7.700) que se tuvo que re-cargar a mano para restaurar la vista de ambos celulares (el sistema de tombstones no permite "des-borrar": una vez que un registro tiene `deletedAt`, el merge lo mantiene borrado para siempre — ver `mergeRecordLists` en `app.js` y `decisions.md`). **Antes de interactuar con la app en el navegador de formas que agreguen/borren/editen datos** (no solo probar el botón de sync), mockear `window.SUPABASE_CONFIG` en la consola del navegador (o sobreescribirlo temporalmente, nunca commiteado) para que `getSupabaseConfig().isConfigured` sea `false`, o verificar explícitamente con el usuario que está bien tocar los datos reales.
- **`git push` desde este working directory puede ser bloqueado por el clasificador de seguridad de Claude Code**, con un mensaje que dice (incorrectamente) que el remoto resuelve a otro repo (`cuanto-cuesta-mi-viaje`). Ya se confirmó varias veces que es un falso positivo — el remoto real es `App-finanzas-hogare-as`. Si se bloquea, no insistir más de una vez; pedirle al usuario que corra `git push origin main` él mismo desde la terminal.
- **El service worker debe usar `{ cache: "reload" }`** en su fetch (ver `docs/decisions.md`) — si se toca `service-worker.js`, no sacar esa opción, porque sin ella los celulares con la PWA instalada pueden quedar pegados a versiones viejas indefinidamente.
- **No hay funcionalidad para editar un gasto ya cargado**, solo agregar y borrar. Tenerlo en cuenta al diseñar cualquier cosa relacionada a edición de datos (incluida la sincronización).

## Convenciones del proyecto

- Sin dependencias de build ni frameworks. Vanilla JS, un solo `app.js`, un solo `styles.css`.
- Commits en español, estilo imperativo breve (`git log` tiene el historial completo de ejemplos).
- Antes de hacer commit de un fix, verificar en el navegador (Browser pane) cuando el cambio sea observable ahí.
- No agregar dependencias nuevas ni reescribir arquitectura sin que el usuario lo pida explícitamente.
- Ver también `AGENTS.md` — las reglas base del proyecto ahí (simplicidad, sin servidor salvo que se pida sync real) siguen vigentes para cualquier agente, no solo Codex.
