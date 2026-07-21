# Roadmap

Estado real al 2026-07-20, extraído del código, del historial de git y de la última sesión. Se actualiza automáticamente al cerrar cada funcionalidad importante.

## En curso ahora mismo

### Sync merge-based (evitar que se pisen gastos entre dispositivos)

**Estado**: implementado en `app.js` (working tree), **sin commitear**. Verificado con pruebas unitarias aisladas de la lógica de merge (6 escenarios: alta concurrente, borrado en ambos sentidos, renombrado, poda de tombstones, deduplicación de cierres) y con un smoke test manual completo en navegador local (agregar, borrar, presupuesto, recurrentes, cierre semanal, renombrar personas) — todo funcionó sin errores.

**Falta para cerrarlo**:
1. Repetir el smoke test end-to-end pero con Supabase completamente desconectado de la config real (para no volver a escribir accidentalmente en la base de datos de producción — ver incidente abajo).
2. Commitear (`app.js` con mensaje describiendo el cambio de modelo de sync).
3. Push a GitHub (probablemente requiera que el usuario lo corra manualmente por el bloqueo de seguridad conocido — ver `CLAUDE.md`).
4. Verificar en los dos celulares reales que la sincronización sigue funcionando después del deploy.

**Incidente durante el desarrollo (ya resuelto)**: al probar el botón real "Subir a Supabase" sin darse cuenta de que `supabase-config.js` apunta a la base de datos de producción real, se escribieron datos de prueba en la cuenta compartida real (rename a "Ezequiel"/"Tamara", un gasto recurrente falso "Internet", un cierre semanal falso). Se corrigió manualmente contra Supabase (people vuelto a "Eze"/"Tami", los falsos tombstoneados/eliminados) y se verificó que ningún gasto real se perdió. **Los presupuestos quedaron en "Supermercado: $50.000" y el usuario todavía tiene que revisarlos en Configuración** porque no había forma de reconstruir qué tenía cargado antes del incidente.

## Pendiente — decisiones que le tocan al usuario

- **Revisar los presupuestos en Configuración** tras el incidente de sync mencionado arriba (posible dato perdido, sin forma de recuperarlo automáticamente).
- **Seguridad de Supabase**: la tabla `app_state` permite lectura y escritura a cualquiera que tenga la URL y la publishable key (ambas visibles en el repo público de GitHub). Riesgo bajo para gastos domésticos, pero es real. Si en algún momento importa, se puede endurecer (por ejemplo con una función de base de datos que valide un secreto adicional, o restringiendo por IP/dominio si Supabase lo permite en el plan usado). No se tocó porque no fue pedido explícitamente.
- **Supabase se pausa por inactividad** (plan gratuito, ~7 días sin uso). Ya pasó una vez y la sincronización falló en silencio hasta que se reactivó manualmente desde el panel de Supabase. No hay alerta automática en la app que avise "la sincronización está caída" de forma clara — hoy el único síntoma es un mensaje genérico en Configuración. Mejora posible: detectar el patrón de error y mostrar un cartel más visible.

## Ideas mencionadas, no iniciadas

- **Editar un gasto ya cargado** (hoy solo se puede borrar y volver a cargar). Se conversó como mejora de calidad de vida, no se empezó. Si se hace, revisar el impacto en el merge de sincronización (ver `decisions.md`).

## Hecho (funcionalidades grandes, resumen — el detalle día a día está en `session-summary.md` y `CODEX_CONTEXT.md`)

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
