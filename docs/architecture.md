# Arquitectura

Extraído directamente del código el 2026-07-20. Si algo cambia, actualizar este archivo junto con el cambio.

## Stack

- HTML/CSS/JS plano, sin build, sin framework, sin bundler, sin `package.json`.
- Persistencia local: `localStorage` (clave `home-expenses-v1`).
- Datos financieros privados por dispositivo: `localStorage` (clave `home-expenses-private-finance-v1`), fuera del estado sincronizado y de los backups compartidos.
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
  budgets: {},                    // { categoria: montoLimite } — límites de gastos COMUNES
  budgetsUpdatedAt: 0,            // timestamp del último cambio de presupuestos comunes (para sync)
  personalBudgets: {},            // { categoria: montoLimite } — límites de gastos PERSONALES (separados)
  personalBudgetsUpdatedAt: 0,    // timestamp del último cambio de presupuestos personales (para sync)
}
```

Cada gasto (`expenses`/`personalExpenses`) y cada recurrente tiene esta forma normalizada (por `normalizeExpense`/`normalizePersonalExpense`/`normalizeRecurringExpense`):

```js
{
  id,                // crypto.randomUUID() (createId())
  date, payer/owner, category, paymentMethod, amount, note,
  recurringId,        // solo en expenses: referencia a la plantilla que lo generó, o ""
  card,               // solo en personalExpenses: tarjeta elegida si paymentMethod es "Tarjeta de crédito", o ""
  installments,       // solo en personalExpenses: cantidad de cuotas (1 si no es compra en cuotas)
  firstInstallmentMonth, // solo en personalExpenses: mes del primer vencimiento, "YYYY-MM" (default: mes de date)
  usdAmount, usdRate,  // si el gasto se cargó en US$: monto original y cotización MEP usada (null si se cargó en pesos); amount ya está convertido a pesos
  createdAt,          // timestamp de creación, no cambia nunca
  updatedAt,          // timestamp de la última modificación de contenido (rename de persona, por ejemplo)
  deletedAt,          // null normalmente; timestamp si está "borrado" (tombstone, ver sync más abajo)
}
```

`state.settlements` tiene además `weekKey`, `weekLabel`, `settledAt`, `total`, `amount`, `debtor`, `creditor`, `people` (snapshot de los nombres al momento de saldar), y `updatedAt`.

### Compras en cuotas (solo gastos personales)

**Decisión** (2026-07-20, ampliada el 2026-08-06): en vez de una entidad nueva, `card`/`installments`/`firstInstallmentMonth` son campos opcionales de `personalExpenses`. El monto cargado es el **total de la compra** (no la cuota mensual) — se registra una sola vez, no se generan gastos nuevos cada mes.

**Nada del seguimiento se persiste**: todo se deriva en cada `render()`. Las funciones viven juntas en `app.js` bajo el comentario `--- Compras en cuotas ---`:

- `getInstallmentPlans()` arma un plan por cada gasto personal con `installments > 1`: monto de cuota (`amount / installments`), mes del primer y último vencimiento. Los meses se manejan como enteros (`año * 12 + mes`) con los helpers `monthIndex`/`monthIndexFromKey`/`monthKeyFromIndex`/`monthLabelFromIndex`, lo que evita aritmética de fechas y problemas de fin de mes.
- `installmentNumberAt(plan, monthIdx)` devuelve qué cuota (1..N) toca ese mes, o 0 si la compra no está activa.
- `getInstallmentsSnapshot()` es el cálculo central: compras activas este mes (con cuota actual, cuotas restantes y monto restante), compras terminadas en los últimos 3 meses, total del mes, deuda total pendiente, desglose por tarjeta y proyección de los próximos 12 meses.

`renderInstallments()` (llamado desde `render()`) pinta con eso la vista Cuotas (`renderInstallmentsView`) y la tira recordatoria de Cargar/Resumen (`renderInstallmentsReminder`).

`firstInstallmentMonth` existe para que "cuota N/M" coincida con el resumen real de la tarjeta: la fecha de la compra no siempre cae en el mismo período que el primer débito. Se autocompleta desde `date` al cargar y queda editable; la variable `firstInstallmentTouched` evita que cambiar la fecha pise un valor elegido a mano.

No hay generación automática de gastos ni notificaciones push (sin backend no hay push real con la app cerrada) — todo se recalcula a partir de la fecha real del dispositivo, así que no se puede "perder" un mes ni duplicar el conteo.

### Ingreso y resto privados

Desde v36 (con la interfaz v37) el ingreso neto se guarda por dueño y mes (`YYYY-MM`) en `home-expenses-private-finance-v1`. No entra en `state`, `getCloudStatePayload()` ni el backup JSON. `renderPrivateIncomeAnalysis()` calcula para el mes seleccionado: parte 50/50 de los comunes, gastos personales de una sola vez, cuotas activas aunque la compra sea anterior, resto estimado e impacto de cada categoría común sobre el ingreso del dueño. El estado compartido conserva el mismo esquema, incluidas las colecciones históricas `expenses`, `personalExpenses` y `settlements`; el cambio visual no migra ni recrea esos registros.

Todo el estado pasa siempre por `normalizeState()`/`normalizeExpense()`/etc. al cargar (`loadState`), al mezclar con la nube (`mergeCloudState`), y al armar el payload de subida (`getCloudStatePayload`) — así que un registro con forma inválida o campos faltantes nunca llega a `render()`.

## Pipeline de renderizado

No hay virtual DOM ni framework: `render()` (en `app.js`) recalcula y reescribe el HTML de todas las secciones visibles cada vez que algo cambia. Se llama después de cualquier mutación de estado (agregar, borrar, importar, etc.) y también al cambiar el período o al entrar a la vista Resumen.

```
render()
 ├─ getPeriodExpenses() / getPeriodPersonalExpenses()   (filtran período + deletedAt)
 ├─ renderPeople(), renderFilterValues(), renderPeriodLabel()
 ├─ renderSummary(), renderSettlementDetail(), renderMonthlySummary()
 ├─ renderCategories(), renderBudgets(), renderRecurringExpenses()
 ├─ renderChart()          → dibuja en <canvas> (barras o torta)
 ├─ renderTable()           → columnas por persona en Movimientos > Gastos comunes
 ├─ renderPersonalExpenses()
 └─ renderSettlementHistory()
```

No hay memoización: cada `render()` reconstruye el `innerHTML` de cada sección desde cero. Para una app de este tamaño (decenas de gastos por semana) el costo es despreciable.

## Navegación y vistas

### Período seleccionado

**Decisión** (2026-08-25): el rango de fechas que mira toda la app son los inputs `#periodStart` / `#periodEnd` del encabezado — no hay estado en `state`, se leen del DOM. Antes era una sola semana lunes-domingo (`#weekStart`).

`getSelectedPeriodRange()` los devuelve como `{ start, end }` (invirtiéndolos si el usuario los pone al revés) y de ahí salen `isExpenseInSelectedPeriod()`, `getPeriodExpenses()` y `getPeriodPersonalExpenses()`. Ojo con dos funciones parecidas: `getSelectedPeriodKey()` es la **identidad del cierre saldado** (puede ser compuesta, ver `decisions.md`) y `getSelectedPeriodStartKey()` es la fecha ISO de inicio, que es la que se usa para prellenar campos de fecha.

Los presets Semana/Mes y las flechas ‹ › solo escriben esos dos inputs (`setSelectedPeriod()`, `shiftSelectedPeriod()`).

No hay router. Cinco vistas (`#loadViewButton`, `#summaryViewButton`, `#movementsViewButton`, `#historyViewButton`, `#installmentsViewButton`) controladas por `setAppView()`, que alterna la clase `app-view-hidden` sobre secciones marcadas con `.load-view-section`, `.summary-view-section`, `.movements-view-section`, `.history-view-section`, `.installments-view-section`.

Se ven **cuatro botones a la vez**: Historial (solo gastos comunes) y Cuotas (solo gastos personales) se turnan en la misma ranura según el modo activo — lo maneja `setEntryMode()`, que además saca al usuario de la vista que acaba de ocultarse.

Aparte, un switch global "Comunes/Personales" (`#commonTabButton`/`#personalTabButton`, arriba de todo en la app, fuera de las 4 pestañas) controlado por `setEntryMode()`. Este switch:
- decide qué formulario de carga se muestra (común vs. personal),
- decide qué tabla se muestra en Movimientos (`setRecordsMode()`),
- cambia el tema visual completo de la app a la paleta rosa "personal" (clase `.personal-mode` en `html`, `body` y `#appShell`).

Es decir: es un modo global de la app, no un filtro local de una sola vista.

**Resumen e Historial también son sensibles a este modo** (desde 2026-07-20): en modo personal, `render()` calcula `totalAmount`/`Vista mensual`/el gráfico por categoría a partir de `personalExpenses` en vez de `expenses`, y oculta las tarjetas "Persona pagó"/"Para emparejar" y el panel "Detalle del cierre" (`#personATotalCard`/`#personBTotalCard`/`#settlementCard`/`#settlementDetailCard`, toggleados en `renderSummary()`/`renderSettlementDetail()`) porque no existe reparto 50/50 en gastos personales. La pestaña Historial (saldos entre personas) tampoco aplica a gastos personales, así que `setEntryMode()` oculta directamente el botón `#historyViewButton` y redirige a "Cargar" si el usuario estaba ahí al cambiar a modo personal. `currentEntryMode` (global en `app.js`, actualizado por `setRecordsMode()`) es la fuente de verdad que lee `render()` para decidir qué mostrar.

## Cómo se carga un gasto

Cuatro caminos, todos terminan llenando el mismo formulario (`#expenseForm`/`#personalExpenseForm`) para que el usuario confirme antes de guardar — **nada se guarda automáticamente**:

1. **Manual**: llenar el formulario y tocar "Agregar gasto"/"Agregar personal".
2. **Foto de ticket** (`handleDocumentFileChange` → `processDocumentFile` → OCR con Tesseract → `extractExpenseFromReceiptText`): completa fecha, monto y descripción. La categoría hay que elegirla a mano.
3. **Archivo de resumen de tarjeta** (mismo entry point, pero `detectDocumentType()` lo clasifica como "statement" en vez de "receipt"): extrae varios consumos con `extractStatementCandidates`/`extractStatementLine`, los separa en comunes/personales por palabras clave (`sharedExpenseKeywords`, `householdCommonCategories`), y los muestra en una lista con checkboxes (`renderStatementReview`) para importar varios de una vez.
4. **Dictado por voz** (`handleVoiceExpenseClick` → Web Speech API → `parseVoiceExpense`): interpreta una frase tipo "comida 8500 pagó Eze supermercado" y completa el formulario, incluso decidiendo automáticamente si es un gasto común o personal.

`detectDocumentType()` es el punto más delicado de todo el pipeline de OCR: distingue un ticket común de un resumen de tarjeta contando líneas que "parecen fecha". Ya se corrigieron varios falsos positivos ahí (ver `decisions.md`).

## Sincronización con Supabase

Actualización 2026-09-15, **publicada en `main` y GitHub Pages como v35**, con autorización del usuario después de confirmar su backup. Ver [proteccion-datos.md](proteccion-datos.md).

- La fila `app_state` mantiene el esquema existente (`id`, `data`, `updated_at`). Sin migraciones.
- Pull y push entran a una única cola local. Se valida la lectura remota, combina por ID y escribe con filtro por la revisión leída (`updated_at`); si no devuelve filas, relee y reintenta. La primera creación usa INSERT; un conflicto de clave obliga a releer. No hay upsert.
- Cada petición tiene timeout de 20 segundos. Fallos conservan el estado local y programan reintentos de 1 a 60 segundos. El arranque, foco, visibilidad, evento online y timer de 15 segundos vuelven a intentar enviar el estado local combinado.
- `mergeRecordLists` une IDs y conserva borrados; timestamps iguales se desempatan de forma estable. No se podan tombstones sin confirmación de todos los dispositivos.
- Personas y cada conjunto de presupuestos siguen resolviéndose como campos completos con sus propios timestamps. El dueño del dispositivo es local; se conserva su posición al renombrar personas.
- Los cierres ya no se deduplican por período. Cada ajuste crea un registro con `supersedes` y `adjustment`; el historial mantiene todas las versiones y reaperturas. Conflictos offline se conservan para conciliación.
- El almacenamiento local y los backups se validan antes de normalizar. Los backups se combinan, conservan el dueño y dejan una copia previa local. Un estado ilegible detiene el arranque para evitar sobrescrituras vacías.

**Compatibilidad:** esta protección no puede impedir las escrituras incondicionales de clientes antiguos. Todos los dispositivos deben cargar v35. La publicación se verificó descargando archivos estáticos; PostgreSQL/PostgREST real no se probó, ya que el entorno integrado usa una API simulada con el SDK real.

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
- Editar un gasto ya cargado (desde el botón "✎" en Movimientos) reutiliza el mismo formulario de Cargar en modo edición: `editingExpense` (variable global) guarda `{ id, type }` mientras dura, `startEditingExpense()`/`cancelEditingExpense()` prellenan/limpian, y el submit actualiza el registro por `id` en vez de crear uno nuevo (ver `decisions.md`, 2026-08-03). No hizo falta tocar `mergeRecordLists` — ya resolvía por `id` + `updatedAt` completo.
- El OCR de tickets llena fecha/monto/descripción pero **no** la categoría — el usuario siempre la elige a mano en ese camino.
- Los montos se muestran sin decimales (`moneyFormatter` con `maximumFractionDigits: 0`) pero se guardan y exportan (CSV) con precisión completa — es solo un cambio visual.
