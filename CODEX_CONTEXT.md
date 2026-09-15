# Continuidad del proyecto

## Estado actual — 2026-09-15

- Repositorio: `eze183/App-finanzas-hogare-as`.
- Rama de trabajo: `codex/proteccion-datos`, basada en `a5bef47`. Se consultó GitHub después de revisar los cambios locales. La rama remota estaba en el mismo commit; no hizo falta fusionar.
- App en uso, local/PWA, con `localStorage` y sincronización Supabase ya configurada. OneDrive comparte archivos, no los datos del navegador.
- Correcciones guardadas en esta rama, **sin push, publicación ni merge con main**. No se accedió a Supabase, perfiles de navegador ni gastos reales. No se ejecutó ni modificó SQL.
- Versión de código preparada: `2026-09-15-proteccion-datos-v35`; service worker v35.

## Qué se hizo

- Sync serializado, escrituras condicionales por `updated_at`, relectura ante conflictos, inserción sin upsert, timeout y reintentos. Reenvío tras reiniciar/reconectar. Desempate estable y conservación de tombstones.
- Validación previa de backups y estado remoto; importación por combinación, dueño local conservado y copia previa obligatoria. Un estado local ilegible bloquea el arranque sin sobrescribirlo.
- Cierres: cada ajuste tiene ID nuevo y referencia al anterior; transferencia solo por la diferencia. Historial conserva versiones y reaperturas. Bloqueo de superposiciones conocidas y aviso de conflictos simultáneos, sin descartar registros.
- Pagadores preservados al renderizar; elección Tami → Eze corregida; renombrado remoto conserva el lugar del dueño.
- Deuda incluye planes de cuotas futuros. Recurrentes semanales los lunes y mensuales el día 1, con ID por ocurrencia. Presupuesto semanal prorrateado por días del rango.
- Pruebas: 22 casos en VM (`tests/protection.test.cjs`) y 5 pruebas integradas de navegador (`tests/browser.integration.cjs`), todas aprobadas. Chrome 152 + Playwright 1.62.1 + SDK Supabase real 2.116.0. Se ejecutan init, render y formularios reales con perfiles desechables; cada petición de la app se intercepta y la API vive en memoria. PostgreSQL/PostgREST real sigue pendiente.
- Se revisó la captura móvil del historial: conserva cierre original de $50 y ajuste de $20. Evidencia local en `.test-artifacts/history-mobile.png`, ignorada por Git. Código de la app sin cambios en esta continuación; base de correcciones: commit `7b4d301`.

## Archivos

- Código: `app.js`, `service-worker.js`.
- Pruebas: `tests/protection.test.cjs`, `tests/browser.integration.cjs`, `tests/download-test-sdk.cjs`, `tests/README.md`. `.gitignore` excluye dependencias, SDK descargado y capturas.
- Documentación: `README.md`, `docs/proteccion-datos.md`, `docs/architecture.md`, `docs/session-summary.md`, este archivo.
- El contexto anterior completo, incluida la entrada local preexistente de renders, se conserva en `docs/codex-context-history.md`.
- La imagen local preexistente `WhatsApp Image 2021-12-28_enderezada.png` queda intacta, fuera del commit.

## Decisiones y pendientes

- No desplegar sin nueva instrucción. Falta un proyecto Supabase de ensayo separado, con tabla preparada, para validar PostgreSQL/PostgREST real. Se consultó al usuario; aún no se recibió información del entorno. No ejecutar migraciones. Antes de publicar, coordinar actualización de todos los clientes: versiones viejas siguen usando upsert y pueden perder revisiones.
- No hay cambios de arquitectura ni migraciones. Se usa la tabla `app_state` existente.
- La combinación del mismo registro usa última edición, con desempate estable; no conserva dos variantes de una edición simultánea del mismo ID. Los ajustes nuevos de cierre sí son registros separados.
- Cierres superpuestos creados offline se conservan y requieren conciliación explícita. Reabrir no revierte dinero transferido.
- Fechas históricas de recurrentes no se corrigen automáticamente. El esquema viejo no permite reconstruir siempre qué ocurrencia pretendía representar un gasto.
- Ver `docs/proteccion-datos.md` para límites, recuperación y procedimiento de pruebas. Ver `docs/session-summary.md` y `docs/codex-context-history.md` para sesiones anteriores.

## Problemas resueltos en el entorno de pruebas

- La descarga del SDK fallaba por la cadena de certificados de Node. Se resolvió con `node --use-system-ca`, sin desactivar TLS. El descargador fija versión y verifica SHA-256. Las pruebas luego funcionan sin acceso de la app a Internet.
