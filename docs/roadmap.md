# Roadmap

Estado real al 2026-07-22, extraído del código, del historial de git y de la última sesión. Se actualiza automáticamente al cerrar cada funcionalidad importante.

## En curso ahora mismo

Nada en curso.

## Rediseño visual Modernist (traído de Claude Design) — completo, 2026-07-22

El usuario rediseñó la interfaz en Claude Design (app "Design") bajo un sistema llamado "Modernist" (paleta clara, acento rojo #ec3013, tipografía Archivo, sin bordes redondeados, dividers marcados, mobile-first con barra inferior). El export vive en `design-export/` (no se usa en runtime, es referencia — ver `decisions.md` para cómo se trajo al proyecto). Se portó por partes al código real, manteniendo intacta la lógica de `app.js` en casi todos los pasos (se preservan todos los `id` al reestructurar HTML; las excepciones puntuales están anotadas abajo).

**Hecho** (commiteado y pusheado, ya visible en producción):
1. Capa visual: se remapearon los tokens de `styles.css` (colores/tipografía/espaciado/radios) al sistema Modernist, sin reescribir la CSS ni tocar la estructura. Commit `8ff3789`.
2. Barra de navegación inferior fija en móvil (<=700px) con íconos, item activo en rojo; en escritorio se mantienen las pestañas de arriba. Commit `e809554`.
3. Pantalla Cargar reestructurada: monto como campo protagonista arriba (input grande sin borde en caja propia), categoría, Fecha+Pagó en 2 columnas, y forma de pago/descripción/cuotas colapsadas en un `<details>` "+ Más detalles". Íconos de carga rápida en grilla de 3 también en móvil. Aplica a ambos formularios (común y personal). Commit `991f18e`.
4. Pantalla Resumen reestructurada: "Total semanal" como número hero suelto (sin tarjeta), bloque rojo "Para emparejar" a todo el ancho con el botón "Marcar semana saldada" **movido adentro** (antes vivía en Movimientos > acciones de tabla — se relocalizó el elemento real, mismo id), tarjetas Eze/Tami pagó lado a lado debajo. El gráfico de categorías se recoloreó con la rampa roja/gris de Modernist (antes multicolor). Se mantuvieron "Detalle del cierre" y "Vista mensual" como cards secundarias más abajo (el mockup no las tenía, pero sacarlas requería tocar `app.js`; se dejaron pero reordenadas). Commit `0279861`.
5. Pantalla Movimientos reestructurada: tanto gastos comunes (antes dos columnas por persona) como personales (antes tabla) pasan a una única lista agrupada por día, con encabezado de día ("Miércoles, 22 de julio") y cada fila con un tag de persona (pagador o dueño), descripción, categoría + forma de pago, monto y borrar. A diferencia de los pasos anteriores, acá sí se tocó lógica de `app.js` (no era solo CSS): se reescribieron `renderTable`/`renderPersonalExpenses` con una función de agrupado por día compartida (`renderMovementGroups`/`groupExpensesByDay`), reemplazando `commonColumnAList`/`commonColumnBList`/`commonColumnAName`/etc. (que dejaron de existir) por un único contenedor `#commonExpenseColumns`. Se conservaron los filtros (buscar/persona/categoría/forma de pago) y las acciones de cabecera (exportar/aplicar recurrentes/borrar semana) tal cual estaban. Se limpiaron las reglas CSS de tabla y de columnas por persona que quedaron sin uso (`.table-wrap`, `table/th/td`, `.person-columns`, `.person-column*`, y las reglas responsive de `<table>`), agregando `.movement-list`/`.movement-day-heading`/`.movement-tag`/`.person-expense-main`. Commit `ac076b8`.
6. Pantalla Historial: restyle liviano de las cards de semanas saldadas (el remapeo de tokens del paso 1 ya las dejaba razonables, no hizo falta reestructurar el layout). Se invirtió la jerarquía de información dentro de cada card: antes el rango de semana era el título en negrita y "quién le paga a quién" quedaba en el subtítulo gris; ahora el rango de semana pasa a ser un kicker chico en mayúsculas (`.history-kicker`, mismo patrón visual que `.movement-day-heading` de Movimientos) y el resultado del cierre ("Tami le pasó $9.300 a Eze" / "No hizo falta compensación") pasa a ser el título en negrita, que es el dato que más importa de un vistazo. El total de la semana se mantuvo como número a la derecha (no estaba en el mockup así, pero es consistente con el patrón "monto siempre visible y alineado a la derecha" ya usado en Movimientos). Solo se tocó la plantilla dentro de `renderSettlementHistory` en `app.js`, no el modelo de datos de `settlements`.
7. Pantalla Configuración reorganizada en secciones colapsables: las 4 tarjetas que antes se mostraban siempre expandidas en una grilla (Hogar y dispositivo, Presupuestos, Gastos recurrentes, Datos y respaldo) pasan a ser `<details>` colapsados por defecto, cada uno con su título y descripción visibles en el `<summary>` (con chevron que rota al abrir) y el formulario/lista real adentro, oculto hasta que se toca. Reutiliza el mismo patrón visual `<details>`/`<summary>` que ya existía para "+ Más detalles" en Cargar. Cambio puramente de HTML/CSS (clases nuevas `.settings-sections`/`.settings-section*`, sin tocar `app.js` — `openSettings()`/`populateSettingsForm()` siguen operando sobre los mismos ids de siempre). De paso se aprovechó para borrar el CSS huérfano que quedó de pasos anteriores del rediseño y que ya no se usaba en ningún HTML: `.settings-panel`, `.settings-grid`, `.wide-panel`, `.data-panel`, `.summary-card.highlight`, `.form-context` (y sus variantes `#personalExpenseSection .form-context`/`html.personal-mode .form-context`).

**Decisiones de alcance tomadas durante el rediseño** (quedan para consulta futura — detalle completo en `decisions.md`):
- Switch Comunes/Personales queda **global**, no vuelve a vivir dentro de cada pantalla.
- Configuración queda como **panel único**, sin drill-down a sub-páginas — se resolvió la "reorganización en secciones" con `<details>` colapsables en el mismo panel, no con navegación a sub-pantallas.
- Categoría en el form de carga queda como `<select>`, no como chips (evita wiring nuevo con voz/OCR).
- El gráfico de categorías sigue en `<canvas>` (barras/torta), no se reemplaza por barras HTML.

## Pendiente — decisiones que le tocan al usuario

- **Verificar en los dos celulares reales** que la sincronización sigue funcionando bien después de este deploy del merge-based sync (commit `135956e`, ya pusheado a GitHub Pages).
- **Revisar los presupuestos en Configuración** tras el incidente de sync durante el desarrollo del punto anterior (posible dato perdido, sin forma de recuperarlo automáticamente — ver detalle en `session-summary.md`, entrada 2026-07-20).
- **Seguridad de Supabase**: la tabla `app_state` permite lectura y escritura a cualquiera que tenga la URL y la publishable key (ambas visibles en el repo público de GitHub). Riesgo bajo para gastos domésticos, pero es real. Si en algún momento importa, se puede endurecer (por ejemplo con una función de base de datos que valide un secreto adicional, o restringiendo por IP/dominio si Supabase lo permite en el plan usado). No se tocó porque no fue pedido explícitamente.
- **Supabase se pausa por inactividad** (plan gratuito, ~7 días sin uso). Ya pasó una vez y la sincronización falló en silencio hasta que se reactivó manualmente desde el panel de Supabase. No hay alerta automática en la app que avise "la sincronización está caída" de forma clara — hoy el único síntoma es un mensaje genérico en Configuración. Mejora posible: detectar el patrón de error y mostrar un cartel más visible.

## Ideas mencionadas, no iniciadas

- **Editar un gasto ya cargado** (hoy solo se puede borrar y volver a cargar). Se conversó como mejora de calidad de vida, no se empezó. Si se hace, revisar el impacto en el merge de sincronización (ver `decisions.md`).

## Hecho (funcionalidades grandes, resumen — el detalle día a día está en `session-summary.md` y `CODEX_CONTEXT.md`)

- Resumen e Historial ahora respetan el switch Comunes/Personales: en modo personal se ocultan el reparto por persona, el detalle de cierre semanal y la pestaña Historial (conceptos que no aplican a gastos personales). 2026-07-20 (ver `decisions.md`/`architecture.md`).
- Compras en cuotas con tarjeta de crédito para gastos personales: al elegir "Tarjeta de crédito" como forma de pago se puede indicar la tarjeta (una de 4 fijas) y la cantidad de cuotas; un panel en Movimientos → Personales muestra qué compras siguen activas, en qué cuota van y cuánto toca pagar este mes. 2026-07-20 (ver `decisions.md`/`architecture.md`).
- Sincronización con Supabase rediseñada a merge por id con tombstones (evita que un dispositivo pise gastos agregados por el otro casi al mismo tiempo). Commit `135956e`, 2026-07-20.
- Carga de gastos comunes y personales con fecha, categoría, forma de pago, monto, descripción.
- Resumen semanal con reparto 50/50, detalle de cierre, vista mensual.
- Gráfico de gastos por categoría (barras/torta).
- Lectura de tickets/facturas por OCR (Tesseract.js) y de resúmenes de tarjeta en PDF/texto (pdf.js), con detección automática de tipo de documento y separación común/personal.
- Dictado de gastos por voz (Web Speech API), con interpretación de montos en palabras y miles.
- Gastos recurrentes semanales/mensuales, presupuestos por categoría, filtros, historial de semanas saldadas.
- Exportación CSV y backup/restore JSON.
- PWA instalable en Android, con service worker robusto ante actualizaciones.
- Sincronización opcional con Supabase entre dispositivos.
- Rediseño visual completo (paleta, tipografía, layout responsive).
- Navegación en 4 pestañas (Cargar/Resumen/Movimientos/Historial) + switch global Comunes/Personales.
- Vista de "Gastos comunes" en dos columnas (una por persona), reemplazando la tabla única.

## Convención de esta sección

- **En curso**: algo que se empezó en la sesión más reciente y no llegó a un estado terminado (sin commit, sin verificar del todo, o esperando una acción del usuario).
- **Pendiente — decisiones del usuario**: cosas que un agente no debería resolver unilateralmente.
- **Ideas mencionadas, no iniciadas**: quedaron en la conversación pero no se tocó código.
- **Hecho**: resumen de alto nivel; el detalle vive en `session-summary.md`/`CODEX_CONTEXT.md`, no se duplica acá.
