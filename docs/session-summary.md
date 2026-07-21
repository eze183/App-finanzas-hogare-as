# Resumen de sesiones

Bitácora cronológica de trabajo en el proyecto. Se actualiza automáticamente al cerrar cada funcionalidad o fix importante (agregar una entrada nueva arriba de todo, con fecha).

**Relación con `CODEX_CONTEXT.md`**: ese archivo es la memoria detallada que usa específicamente Codex (con instrucciones de `AGENTS.md` para leerlo/actualizarlo). Este archivo (`docs/session-summary.md`) es el equivalente pensado para cualquier agente, incluido Claude Code, y es el que se mantiene al día de acá en adelante por instrucción del usuario. No se duplica contenido innecesariamente: las entradas de antes del 2026-07-20 están condensadas acá (el detalle completo, línea por línea, sigue en `CODEX_CONTEXT.md`); de acá en adelante este archivo tiene el registro completo.

---

## 2026-07-20 — Documentación del proyecto

Se creó `CLAUDE.md` en la raíz y la carpeta `docs/` completa (`architecture.md`, `decisions.md`, `roadmap.md`, este archivo), a pedido explícito del usuario, para facilitar el trabajo en futuras sesiones. Todo extraído del código real, `git log` y `CODEX_CONTEXT.md` — nada inventado. Se estableció como regla permanente actualizar `session-summary.md` y `roadmap.md` después de cada funcionalidad importante.

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
