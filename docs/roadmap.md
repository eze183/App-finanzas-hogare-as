# Roadmap

Estado real al 2026-07-20, extraído del código, del historial de git y de la última sesión. Se actualiza automáticamente al cerrar cada funcionalidad importante.

## En curso ahora mismo

### Rediseño visual Modernist (traído de Claude Design)

El usuario rediseñó la interfaz en Claude Design (app "Design") bajo un sistema llamado "Modernist" (paleta clara, acento rojo #ec3013, tipografía Archivo, sin bordes redondeados, dividers marcados, mobile-first con barra inferior). El export vive en `design-export/` (no se usa en runtime, es referencia). Se está portando por partes al código real, manteniendo intacta la lógica de `app.js`.

**Hecho hasta ahora** (commiteado y pusheado):
1. Capa visual: se remapearon los tokens de `styles.css` (colores/tipografía/espaciado/radios) al sistema Modernist, sin reescribir la CSS ni tocar la estructura. Commit `8ff3789`.
2. Barra de navegación inferior fija en móvil (<=700px) con íconos, item activo en rojo; en escritorio se mantienen las pestañas de arriba. Commit `e809554`.
3. Pantalla Cargar reestructurada: monto como campo protagonista arriba (input grande sin borde en caja propia), categoría, Fecha+Pagó en 2 columnas, y forma de pago/descripción/cuotas colapsadas en un `<details>` "+ Más detalles". Íconos de carga rápida en grilla de 3 también en móvil. Aplica a ambos formularios (común y personal). Sin tocar `app.js` (todos los IDs se mantuvieron). La categoría quedó como `<select>` estilizado, no chips (los chips requerían wiring en JS con la carga por voz/OCR; se dejó para más adelante si el usuario lo pide).

**Falta** (reestructuración mobile-first pantalla por pantalla, decisiones de diseño ya tomadas — switch Comunes/Personales queda global, Configuración queda como panel único):
- Resumen: total semanal como número hero, bloque rojo "Para emparejar", barras por categoría.
- Movimientos: lista agrupada por día con tag de persona (hoy es tabla/columnas).
- Configuración: reorganización visual en secciones (sin drill-down).

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
