# Arquitectura

Extraído directamente del código el 2026-07-20. Si algo cambia, actualizar este archivo junto con el cambio.

## Stack

- HTML/CSS/JS plano, sin build, sin framework, sin bundler, sin `package.json`.
- Persistencia local: `localStorage` (clave `home-expenses-v1`).
- Sincronización opcional: Supabase (tabla `app_state`, una sola fila por hogar).
- OCR de tickets: [Tesseract.js](https://github.com/naptha/tesseract.js) v5 por CDN.
- Lectura de PDF (resúmenes de tarjeta): [pdf.js](https://mozilla.github.io/pdf.js/) v4.10.38 por CDN, cargado como módulo ES.
- Dictado por voz: Web Speech API nativa del navegador (`SpeechRecognition`/`webkitSpeechRecognition`), sin librería externa.
- Tipografía: Manrope (títulos/números) + Inter (cuerpo), cargadas por `<link>` a Google Fonts.
- PWA: `manifest.json` + `service-worker.js`, instalable en Android.
- Hosting: GitHub Pages (`https://eze183.github.io/App-finanzas-hogare-as/`), deploy automático al hacer push a `main`.

## Archivos

| Archivo | Rol |
|---|---|
| `index.html` | Estructura completa de la interfaz. Todas las vistas viven en el DOM permanentemente; se muestran/ocultan con clases CSS (`app-view-hidden`, `is-hidden`), no hay router. |
| `app.js` | Toda la lógica: estado, render, OCR, voz, sync, exportación. ~2820 líneas, sin módulos, un solo archivo cargado como `<script src="./app.js">` clásico (no `type="module"`). |
| `styles.css` | Todos los estilos. Paleta por variables CSS en `:root`, con overrides para `.personal-mode`. |
| `service-worker.js` | Cache de la PWA. Estrategia network-first con `{ cache: "reload" }` para evitar quedarse pegado a versiones viejas (ver `decisions.md`). |
| `manifest.json` | Manifest de PWA. |
| `supabase-config.js` | Credenciales de Supabase (URL, publishable key, `stateId`). **Son las credenciales reales de producción**, no un placeholder. |
| `supabase-setup.sql` | Script para crear la tabla `app_state` y las policies de RLS en Supabase. Se corre una sola vez desde el SQL editor de Supabase. |
| `icon.svg` | Ícono de la app/PWA. |
| `README.md` | Guía de uso orientada al usuario final. |
| `AGENTS.md` / `CODEX_CONTEXT.md` | Memoria de proyecto para Codex (ver `decisions.md` sobre por qué coexiste con este `docs/`). |
| `.gitattributes` | Solo normalización de line endings (`text=auto`). |

No hay `package.json`, `node_modules`, ni configuración de build. Los `preview-*.png` en la raíz son capturas históricas de sesiones anteriores, no se usan en runtime.

## Modelo de datos

El estado completo de la app es un único objeto JS (variable `state` en `app.js`), inicializado por `loadState()` y guardado en `localStorage` por `saveState()`. Forma (`defaultState`):

```js
{
  people: ["Eze", "Tami"],       // nombres de las 2 personas, editable en Configuración
  peopleUpdatedAt: 0,             // timestamp del último cambio de nombre (para sync, ver abajo)
  deviceOwner: "Eze",             // a qué persona pertenece ESTE dispositivo/navegador — NO se sincroniza
  expenses: [],                   // gastos comunes (reparto 50/50)
  personalExpenses: [],           // gastos personales (no se reparten)
  settlements: [],                // historial de semanas saldadas
  recurringExpenses: [],          // plantillas de gastos recurrentes
  budgets: {},                    // { categoria: montoLimite }
  budgetsUpdatedAt: 0,            // timestamp del último cambio de presupuestos (para sync)
}
```

Cada gasto (`expenses`/`personalExpenses`) y cada recurrente tiene esta forma normalizada (por `normalizeExpense`/`normalizePersonalExpense`/`normalizeRecurringExpense`):

```js
{
  id,                // crypto.randomUUID() (createId())
  date, payer/owner, category, paymentMethod, amount, note,
  recurringId,        // solo en expenses: referencia a la plantilla que lo generó, o ""
  createdAt,          // timestamp de creación, no cambia nunca
  updatedAt,          // timestamp de la última modificación de contenido (rename de persona, por ejemplo)
  deletedAt,          // null normalmente; timestamp si está "borrado" (tombstone, ver sync más abajo)
}
```

`state.settlements` tiene además `weekKey`, `weekLabel`, `settledAt`, `total`, `amount`, `debtor`, `creditor`, `people` (snapshot de los nombres al momento de saldar), y `updatedAt`.

Todo el estado pasa siempre por `normalizeState()`/`normalizeExpense()`/etc. al cargar (`loadState`), al mezclar con la nube (`mergeCloudState`), y al armar el payload de subida (`getCloudStatePayload`) — así que un registro con forma inválida o campos faltantes nunca llega a `render()`.

## Pipeline de renderizado

No hay virtual DOM ni framework: `render()` (en `app.js`) recalcula y reescribe el HTML de todas las secciones visibles cada vez que algo cambia. Se llama después de cualquier mutación de estado (agregar, borrar, importar, etc.) y también al cambiar de semana o al entrar a la vista Resumen.

```
render()
 ├─ getCurrentWeekExpenses() / getCurrentWeekPersonalExpenses()   (filtran semana + deletedAt)
 ├─ renderPeople(), renderFilterValues(), renderWeekLabel()
 ├─ renderSummary(), renderSettlementDetail(), renderMonthlySummary()
 ├─ renderCategories(), renderBudgets(), renderRecurringExpenses()
 ├─ renderChart()          → dibuja en <canvas> (barras o torta)
 ├─ renderTable()           → columnas por persona en Movimientos > Gastos comunes
 ├─ renderPersonalExpenses()
 └─ renderSettlementHistory()
```

No hay memoización: cada `render()` reconstruye el `innerHTML` de cada sección desde cero. Para una app de este tamaño (decenas de gastos por semana) el costo es despreciable.

## Navegación y vistas

No hay router. Cuatro pestañas principales (`#loadViewButton`, `#summaryViewButton`, `#movementsViewButton`, `#historyViewButton`) controladas por `setAppView()`, que alterna la clase `app-view-hidden` sobre secciones marcadas con `.load-view-section`, `.summary-view-section`, `.movements-view-section`, `.history-view-section`.

Aparte, un switch global "Comunes/Personales" (`#commonTabButton`/`#personalTabButton`, arriba de todo en la app, fuera de las 4 pestañas) controlado por `setEntryMode()`. Este switch:
- decide qué formulario de carga se muestra (común vs. personal),
- decide qué tabla se muestra en Movimientos (`setRecordsMode()`),
- cambia el tema visual completo de la app a la paleta rosa "personal" (clase `.personal-mode` en `html`, `body` y `#appShell`).

Es decir: es un modo global de la app, no un filtro local de una sola vista.

## Cómo se carga un gasto

Cuatro caminos, todos terminan llenando el mismo formulario (`#expenseForm`/`#personalExpenseForm`) para que el usuario confirme antes de guardar — **nada se guarda automáticamente**:

1. **Manual**: llenar el formulario y tocar "Agregar gasto"/"Agregar personal".
2. **Foto de ticket** (`handleDocumentFileChange` → `processDocumentFile` → OCR con Tesseract → `extractExpenseFromReceiptText`): completa fecha, monto y descripción. La categoría hay que elegirla a mano.
3. **Archivo de resumen de tarjeta** (mismo entry point, pero `detectDocumentType()` lo clasifica como "statement" en vez de "receipt"): extrae varios consumos con `extractStatementCandidates`/`extractStatementLine`, los separa en comunes/personales por palabras clave (`sharedExpenseKeywords`, `householdCommonCategories`), y los muestra en una lista con checkboxes (`renderStatementReview`) para importar varios de una vez.
4. **Dictado por voz** (`handleVoiceExpenseClick` → Web Speech API → `parseVoiceExpense`): interpreta una frase tipo "comida 8500 pagó Eze supermercado" y completa el formulario, incluso decidiendo automáticamente si es un gasto común o personal.

`detectDocumentType()` es el punto más delicado de todo el pipeline de OCR: distingue un ticket común de un resumen de tarjeta contando líneas que "parecen fecha". Ya se corrigieron varios falsos positivos ahí (ver `decisions.md`).

## Sincronización con Supabase

**Estado al 2026-07-20: el modelo de merge descrito acá está implementado, commiteado (`135956e`) y pusheado a GitHub Pages.**

Diseño (antes del merge, y el problema que resolvió):

- Antes: `pushStateToSupabase` subía el estado local completo con `UPSERT`, reemplazando lo que hubiera en la nube. Si dos dispositivos agregaban gastos distintos casi al mismo tiempo, el que subía último **pisaba** el gasto del otro. Riesgo real de pérdida de datos, encontrado en revisión de código, no reportado por el usuario.

- Ahora: sincronización basada en **merge por id + tombstones**, no reemplazo:
  - Cada gasto/personal/recurrente tiene `id`, `updatedAt`, `deletedAt`.
  - Borrar un gasto ya NO lo saca del array: le pone `deletedAt = Date.now()` (`tombstoneRecords()`). Todos los lectores de gastos (`getCurrentWeekExpenses`, `getCurrentMonthExpenses`, etc.) filtran `!expense.deletedAt`.
  - `mergeRecordLists(local, remote)` hace unión por `id`: un id nuevo en cualquiera de los dos lados sobrevive; un id en ambos lados se resuelve por `updatedAt` más reciente, y si cualquiera de los dos lo tiene tombstoneado, el resultado queda tombstoneado (el borrado gana).
  - `pruneTombstones()` descarta tombstones de más de 90 días (`TOMBSTONE_RETENTION_MS`) para no crecer indefinidamente. Nunca poda registros vivos.
  - `settlements` se mezclan igual por id y además se deduplican por `weekKey` (`dedupeSettlementsByWeek`) por si dos dispositivos saldan la misma semana antes de sincronizar.
  - `people` y `budgets` (que no son arrays con id, son un array de 2 nombres y un objeto plano) se resuelven por last-write-wins de todo el campo, comparando `peopleUpdatedAt`/`budgetsUpdatedAt` — **no** hacen merge granular. Es una simplificación consciente (ver `decisions.md`), no un merge tan fino como el de los gastos.
  - `pushStateToSupabase` ahora primero trae el estado remoto actual, lo mezcla con el local (`mergeCloudState`), guarda el resultado localmente, y recién ahí sube. `pullStateFromSupabase`/`applyCloudState` hacen lo mismo pero sin subir.

- Disparadores de sincronización: `saveState()` dispara `queueCloudSave()` (debounce de 900ms → push silencioso). Pull automático cada 15s mientras la pestaña está visible (`startCloudAutoPull`), más pull al recuperar foco/visibilidad. Los botones de Configuración ("Subir"/"Traer") son solo para forzarlo, no son necesarios en el uso normal.

- `deviceOwner` (a qué persona pertenece el dispositivo) es la única parte del estado que **nunca** se sincroniza — es local a cada navegador a propósito.

## PWA / Service Worker

- `manifest.json` estándar, ícono único (`icon.svg`, SVG, `purpose: any maskable`).
- `service-worker.js`: cachea solo los archivos propios (mismo origen; deja pasar sin tocar cualquier fetch a otro dominio como Supabase o los CDN de Tesseract/pdf.js). Estrategia: intenta red primero con `{ cache: "reload" }` (fuerza bypass del caché HTTP normal del navegador, no solo del Cache Storage del service worker), y solo cae al caché si la red falla.
- `CACHE_NAME` y `APP_VERSION` (en `app.js`) se suben juntos en cada cambio relevante, por convención, aunque técnicamente el `cache: "reload"` ya no depende de eso para funcionar.

## Estilos y theming

- Paleta por variables CSS en `:root` de `styles.css` (fondo grafito oscuro, acento esmeralda `#10b981`).
- Modo personal: mismas variables sobreescritas bajo `.personal-mode` (rosa `#f472b6`), aplicado a `html`, `body` y `#appShell` a la vez por `setRecordsMode()`.
- Tipografía: `--font-heading` (Manrope 800, para títulos y números grandes) y `--font-body` (Inter, para el resto).
- Radios de borde por variables: `--radius-sm` (10px, controles), `--radius-md` (14px, tarjetas), `--radius-lg` (18px, contenedores grandes).
- Responsive: breakpoints en 900px (paneles de 2 columnas pasan a 1) y 580px (tablas pasan a formato tarjeta, tipografía de pestañas se achica).

## Cosas no obvias que vale la pena recordar

- El `state` global se reasigna por completo en varias funciones (`applyCloudState`, `mergeCloudState`, rename de personas) — no es inmutable, pero tampoco se muta en profundidad sin cuidado; cada mutación pasa por `normalizeState` en algún punto del ciclo.
- No existe edición de gastos ya cargados, solo alta y baja. Cualquier feature de "editar" tendría que sumarse a mano (ver `roadmap.md`).
- El OCR de tickets llena fecha/monto/descripción pero **no** la categoría — el usuario siempre la elige a mano en ese camino.
- Los montos se muestran sin decimales (`moneyFormatter` con `maximumFractionDigits: 0`) pero se guardan y exportan (CSV) con precisión completa — es solo un cambio visual.
