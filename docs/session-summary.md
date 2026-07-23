# Resumen de sesiones

Bitácora cronológica de trabajo en el proyecto. Se actualiza automáticamente al cerrar cada funcionalidad o fix importante (agregar una entrada nueva arriba de todo, con fecha).

**Relación con `CODEX_CONTEXT.md`**: ese archivo es la memoria detallada que usa específicamente Codex (con instrucciones de `AGENTS.md` para leerlo/actualizarlo). Este archivo (`docs/session-summary.md`) es el equivalente pensado para cualquier agente, incluido Claude Code, y es el que se mantiene al día de acá en adelante por instrucción del usuario. No se duplica contenido innecesariamente: las entradas de antes del 2026-07-20 están condensadas acá (el detalle completo, línea por línea, sigue en `CODEX_CONTEXT.md`); de acá en adelante este archivo tiene el registro completo.

---

## 2026-07-22 — Rediseño Modernist: Movimientos, e incidente real de sync durante la prueba

Se continuó el rediseño Modernist retomando el punto donde había quedado la sesión anterior (`roadmap.md`): la pantalla Movimientos. Se reemplazó la vista de gastos comunes (dos columnas, una por persona) y la de gastos personales (tabla) por una única lista agrupada por día con tag de persona por fila, siguiendo el mockup de `design-export/Gastos del Hogar - Rediseño.dc.html` (screen 3). A diferencia de los pasos anteriores del rediseño (que fueron solo reestructuración de HTML/CSS sin tocar lógica), este paso sí modificó `app.js`: se reescribieron `renderTable` y `renderPersonalExpenses` para usar una función común de agrupado por día (`groupExpensesByDay`/`renderMovementGroups`/`renderMovementRow`), y se eliminaron los elementos `commonColumnAList`/`commonColumnBList`/`commonColumnAName`/`commonColumnBName`/`commonColumnATotal`/`commonColumnBTotal` (ya no existen — la nueva estructura usa un único `#commonExpenseColumns`). Se conservaron intactos los filtros, las acciones de cabecera y los manejadores de borrado (`data-id`/`data-personal-id`, delegados sobre los mismos contenedores). Se limpió el CSS que quedó sin uso (`table`/`th`/`td`/`.table-wrap`/`.person-columns`/`.person-column*` y sus reglas responsive), agregando `.movement-list`/`.movement-day-heading`/`.movement-tag`/`.person-expense-main`.

**Incidente durante la verificación en el navegador**: para confirmar que la nueva vista funcionaba se cargaron gastos de prueba y se probó el botón de borrar directamente en el navegador (Browser pane), apuntando al `index.html` servido por `python -m http.server`. Ese `index.html` carga `supabase-config.js` con las credenciales reales de producción (como en cualquier uso normal de la app), y se descubrió que `saveState()` dispara `queueCloudSave()` — un push automático a Supabase ~900ms después de **cualquier** cambio de estado, no solo al tocar el botón "Subir a Supabase". Como resultado, al probar el borrado se tombstoneó por accidente un gasto real ya sincronizado ("Despensa", $7.700, Eze, Supermercado, Tarjeta de débito, 2026-07-22). Se detectó de inmediato revisando `localStorage` tras la prueba. Como el sistema de tombstones no tiene forma de "des-borrar" (`mergeRecordLists` en `app.js`: si cualquiera de las dos copias — local o remota — tiene `deletedAt`, ese valor gana siempre, sin importar cuál tiene el `updatedAt` más nuevo), la única forma de recuperar el gasto fue volver a cargarlo a mano con los mismos datos (queda con un `id` nuevo, se perdió el `createdAt` original, pero es visible de nuevo para ambos celulares tras la próxima sincronización). Se confirmó el push de la corrección viendo el estado "Sincronizado con Supabase" en la propia app. Los gastos de prueba agregados también quedaron tombstoneados en la base real (igual que debris de pruebas de sesiones anteriores que ya estaba ahí, ej. "Prueba" $3.000) — inofensivo, ya que un tombstone no aporta información visible, pero es basura acumulada en la tabla real.

**Se reforzó la advertencia en `CLAUDE.md`** con este hallazgo específico (antes solo advertía sobre el botón de sync explícito, no sobre el push automático de cualquier cambio de estado) y se recomienda para la próxima sesión mockear `window.SUPABASE_CONFIG` antes de cualquier prueba en el navegador que agregue/borre datos, no solo al probar sync explícitamente.

Cambios pendientes de commitear al cierre de esta sesión: `index.html`, `app.js`, `styles.css`, `CLAUDE.md`, `docs/roadmap.md`, `docs/session-summary.md`.

## 2026-07-21 — Rediseño visual Modernist traído de Claude Design (en curso, pausado para retomar mañana)

El usuario armó una propuesta de rediseño completo en la app "Design" de Claude (herramienta separada de este chat), bajo un sistema de diseño llamado "Modernist": paleta clara, acento rojo único (#ec3013), tipografía Archivo, sin bordes redondeados, dividers de 2px marcados, mobile-first con barra de navegación inferior. Reemplaza la paleta oscura "grafito moderno" del 2026-07-10.

**Cómo se trajo al proyecto**: no hay integración directa entre Claude Design y el repo. El usuario exportó el proyecto como "Project archive" (zip con el mockup `.dc.html` de las 5 pantallas, el design system en `_ds/.../styles.css`, capturas) y lo descomprimió en `design-export/` dentro del proyecto — carpeta que queda solo como referencia visual, no se usa en runtime. Cada pantalla se reimplementó a mano leyendo el mockup (el HTML del export usa un web component propio de la herramienta que no funciona fuera de ella).

**Se avanzó por partes, todas commiteadas y pusheadas** (detalle técnico completo en `roadmap.md` y las decisiones de alcance en `decisions.md`):
1. **Capa de tokens** (`8ff3789`): remapeo de variables CSS existentes en `styles.css` (colores/tipografía/espaciado/radios) a la paleta Modernist, sin reescribir la estructura. Se migraron a variables varios colores que estaban hardcodeados (texto sobre fondo de acento, bordes de peligro) para que tomaran bien el contraste con la nueva paleta clara.
2. **Barra de navegación inferior** (`e809554`): las 4 secciones pasan a verse como barra fija con íconos en móvil (<=700px); en escritorio se mantienen las pestañas de arriba. El panel de Configuración se subió de z-index para quedar por encima.
3. **Pantalla Cargar** (`991f18e`): reestructurada con el monto como campo protagonista arriba, categoría y Fecha+Pagó en dos columnas, y forma de pago/descripción/cuotas colapsadas detrás de un `<details>` "+ Más detalles". Aplica a los dos formularios (común y personal).
4. **Pantalla Resumen** (`0279861`): "Total semanal" como número hero suelto, bloque rojo "Para emparejar" a todo el ancho con el botón "Marcar semana saldada" movido adentro (relocalizado desde Movimientos, mismo elemento), tarjetas Eze/Tami pagó lado a lado. Gráfico de categorías recoloreado a tonos rojo/gris.

**Regla seguida en todo el proceso**: nunca tocar los `id` que usa `app.js` al reestructurar HTML, así ningún paso requirió cambios de lógica — excepto mover el botón `#settleWeekButton` (relocalización, no copia) y actualizar la constante `chartColors`. Cada pantalla se probó en el navegador con Supabase mockeado (mismo mock temporal de sesiones anteriores, siempre revertido antes de commitear) en modo Comunes y Personales, móvil y escritorio, sin errores de consola.

**Decisiones de alcance tomadas por el agente y confirmadas por el usuario** ("lo que consideres mejor"): el switch Comunes/Personales se mantiene global (no vuelve a cada pantalla como en el mockup), Configuración se mantiene como panel único (sin drill-down), la categoría del formulario sigue siendo un `<select>` (no chips, para no requerir wiring nuevo con voz/OCR), y el gráfico de categorías sigue en `<canvas>` (no se reemplazó por barras HTML).

**Queda pendiente para la próxima sesión**: reestructurar Movimientos (lista agrupada por día con tag de persona, hoy es tabla/columnas) — es el próximo paso explícito —, revisar Historial, y reorganizar visualmente Configuración.

## 2026-07-20 — Documentación del proyecto

Se creó `CLAUDE.md` en la raíz y la carpeta `docs/` completa (`architecture.md`, `decisions.md`, `roadmap.md`, este archivo), a pedido explícito del usuario, para facilitar el trabajo en futuras sesiones. Todo extraído del código real, `git log` y `CODEX_CONTEXT.md` — nada inventado. Se estableció como regla permanente actualizar `session-summary.md` y `roadmap.md` después de cada funcionalidad importante.

## 2026-07-20 — Resumen e Historial adaptados al modo Comunes/Personales

Pedido del usuario: la pestaña Personales repetía información de Comunes que no aplica (reparto "Eze pagó"/"Tami pagó", detalle de cierre semanal diferenciado por persona en Resumen, e Historial de saldos). Antes de este cambio el switch global solo afectaba el formulario de carga y Movimientos; Resumen e Historial ignoraban el modo y siempre mostraban datos comunes.

Se agregó `currentEntryMode` (global en `app.js`) actualizado por `setRecordsMode()`. En modo personal: `renderSummary`/`renderMonthlySummary`/el gráfico usan `personalExpenses` en vez de `expenses`; las tarjetas de reparto por persona y el panel "Detalle del cierre" se ocultan (`#personATotalCard`/`#personBTotalCard`/`#settlementCard`/`#settlementDetailCard`); y el botón "Historial" se oculta, redirigiendo a "Cargar" si el usuario estaba ahí al cambiar de modo. No se tocó el panel "Por categoría"/presupuestos de la pestaña Cargar, que no fue mencionado.

Verificado en navegador con Supabase mockeado (mismo mock temporal, revertido después): al entrar en modo personal las tarjetas y el detalle de cierre quedan con `is-hidden`, el total semanal y la vista mensual pasan a reflejar montos personales reales, el layout de grilla se reacomoda a una columna sin huecos, y al volver a Comunes todo se restaura correctamente. Detalle técnico en `architecture.md`, decisión en `decisions.md`.

## 2026-07-20 — Compras en cuotas con tarjeta (gastos personales)

Pedido del usuario: se olvidaba de compras en cuotas hechas con cualquiera de sus 4 tarjetas de crédito, lo que le hacía sumar gastos sin contemplar el compromiso pendiente. Se evaluó una entidad separada con generación automática de gastos mensuales, pero el usuario pidió algo simple, acotado solo a gastos personales.

Solución implementada: `personalExpenses` ganó dos campos opcionales, `card` (Visa Banco Galicia, Mastercard Banco Galicia, Mastercard Mercado Pago o Mastercard Banco Nación) e `installments` (cantidad de cuotas). Al elegir "Tarjeta de crédito" como forma de pago en el formulario de carga personal aparecen esos dos campos. El monto cargado es el total de la compra, se registra una sola vez (no se duplican gastos mes a mes). Un panel nuevo en Movimientos → Personales ("Cuotas pendientes este mes") calcula al vuelo, a partir de la fecha real de la compra y la fecha actual, en qué cuota va cada compra activa, mostrando concepto, tarjeta, "cuota N/M", total de la compra y monto de la cuota de este mes, más el total a pagar sumando todas las compras activas.

Verificado en navegador local con Supabase mockeado (mismo mock temporal de la sesión anterior, revertido después): se cargó una compra de $120.000 en 6 cuotas con fecha 2 meses atrás y el panel mostró correctamente "cuota 3/6 — $20.000". Detalle técnico en `architecture.md` y decisión de diseño en `decisions.md`.

## 2026-07-20 — Sync merge-based (cerrado, commit `135956e`)

Se rediseñó la sincronización con Supabase para que mezcle por id en vez de reemplazar el estado completo, evitando que un dispositivo pise los gastos que el otro acaba de agregar. Se agregaron `updatedAt`/`deletedAt` a cada registro, tombstones para los borrados (en vez de eliminar físicamente), poda de tombstones viejos (90 días), y merge separado para `settlements` (con deduplicación por semana) y para `people`/`budgets` (last-write-wins de campo completo).

Verificado en tres niveles: 6 pruebas unitarias de la lógica de merge, un smoke test completo del flujo normal de la app (agregar, borrar, presupuesto, recurrentes, cierre semanal, renombrar personas), y una prueba end-to-end final con Supabase completamente mockeado en memoria (inyectado temporalmente en `index.html`, revertido antes de commitear) simulando un segundo dispositivo agregando un gasto: el dispositivo local pasó de 24 a 25 gastos al traer los datos, conservando los propios y sumando el del otro dispositivo sin pisar nada. Commiteado y pusheado a GitHub (`135956e`). **Falta**: verificar en los dos celulares reales tras el deploy (ver `roadmap.md`).

Durante el desarrollo (antes de la prueba mockeada) se escribió por error contra la base de Supabase de producción real usando el botón real de la app — se corrigió manualmente y se verificó que no se perdió ningún gasto real; quedó pendiente que el usuario revise sus presupuestos. Detalle completo en `roadmap.md`.

## 2026-07-13 — Seis mejoras de UX + fixes de estabilidad de la PWA

- Se sacó el botón "Interpretar" del dictado por texto (Enter alcanza).
- Categoría por defecto "Otros" en vez de "Farmacia".
- Se agregó "Transferencia" como forma de pago.
- Se reordenó el panel "Agregar gasto": campos primero, íconos de carga rápida justo antes del botón de guardar (botones de guardar sacados del `<form>` y conectados por fuera con `form=""`).
- "Historial de cuentas saldadas" pasó a ser una 4ª pestaña independiente.
- El switch "Comunes/Personales" se movió al principio de la app; se eliminó el sub-menú redundante que existía dentro de Movimientos.
- Se sacó por completo el formulario de respaldo de voz (redundante a criterio del usuario), lo que dejó un hueco vacío visual — corregido colapsando los párrafos de estado vacíos con `:empty { display: none }`.
- Fix de pestañas superpuestas en móvil (4 pestañas no entraban a 375px de ancho).
- **Fix importante de PWA**: se encontró que el service worker podía servir versiones viejas desde el caché HTTP del navegador aunque la lógica pareciera "network-first". Se agregó `{ cache: "reload" }` al fetch — ver `decisions.md`.

## 2026-07-11 — Lectura de tickets y resúmenes, sincronización, layout de Movimientos

- Se corrigió que la mayoría de los tickets comunes se confundían con resúmenes de tarjeta (falsos positivos de "fecha" en CUIT, número de comprobante, líneas de producto pesado). Fix: fecha anclada al inicio de línea + validación de fecha real.
- Segundo bug relacionado: la fecha extraída de un ticket a veces tomaba "Inicio de Actividades" en vez de la fecha real de la compra.
- Se corrigió el import de resúmenes de tarjeta con fechas en formato "30-May-26" (nombre de mes en letras), que antes no se reconocían.
- Categorías de uso diario (Supermercado, Farmacia, etc.) ahora se marcan como comunes por defecto al importar un resumen.
- Se corrigió que el dictado por voz interpretaba "13,000" (coma como separador de miles) como $13,00 en vez de $13.000.
- Se activó GitHub Pages para publicar la app (`https://eze183.github.io/App-finanzas-hogare-as/`).
- Se encontró y corrigió un bug real del service worker: interceptaba peticiones a Supabase y devolvía HTML disfrazado de respuesta cuando fallaban, enmascarando errores de sincronización.
- Se diagnosticó que Supabase se había pausado por inactividad (plan gratuito) — causa de que un celular no viera los gastos del otro.
- Vista "Movimientos > Gastos comunes" rediseñada en dos columnas (una por persona), reemplazando la tabla única, a pedido del usuario.

## 2026-07-10 — Rediseño visual completo

Paleta nueva "grafito moderno" (fondo casi negro, acento esmeralda, antes verde bosque/rosa vino), tipografía Manrope+Inter, radios de borde más grandes, unificación de los overrides de color del modo personal. Ajuste posterior tras feedback del usuario: acento menos saturado, botones de acción rápida en contorno en vez de sólido, encabezado más compacto, montos sin decimales en pantalla (la exportación CSV mantiene precisión completa). Se agregaron íconos SVG para Sacar foto/Elegir archivo/Dictar gasto (antes en bloques separados), y los nombres de persona por defecto pasaron de "Persona 1/2" a "Eze"/"Tami". De paso se corrigió un bug preexistente: el gráfico de categorías quedaba en blanco la primera vez que se abría la pestaña Resumen (canvas dibujado con ancho 0).

## 2026-06-25 y anteriores — Historial condensado

Ver el detalle completo, línea por línea, en `CODEX_CONTEXT.md` (secciones "2026-06-25", "2026-06-15", "2026-06-14"). Resumen de los hitos principales:

- **2026-06-25**: integración con Supabase (config, tabla, policies, botones de sync manual, sincronización automática cada 15s), refuerzo de colores del modo personal, ajustes al modo visual personal aplicado a `html`/`body`/contenedor principal.
- **2026-06-15**: pasada estética general, tema oscuro completo, tablas convertidas a tarjetas en móvil, dictado de gastos por voz (primera versión, con fallback de texto — luego removido el 2026-07-13), configuración de "este dispositivo es de", preparación como PWA (`manifest.json`, `service-worker.js`, `icon.svg`), pestaña de gastos personales, categorías actuales (Farmacia/Supermercado/Verdulería/etc.), navegación simplificada a 3 vistas (luego 4), botón "Sacar foto".
- **2026-06-14**: primera versión con backup/importación JSON, detalle de cierre, vista mensual, gastos recurrentes, presupuestos, filtros, responsive; carga inteligente de ticket/factura/resumen de tarjeta con detección automática y reglas de categorización (seguros, streaming); conversión manual de USD; pestaña de gastos personales con separación automática desde resúmenes de tarjeta.
- **Commit inicial**: `1414ce3`.
