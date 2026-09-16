# Continuidad del proyecto

## Estado actual — 2026-09-15

- Repositorio: `eze183/App-finanzas-hogare-as`.
- Rama de trabajo: `codex/proteccion-datos`. El usuario confirmó que hizo un backup y autorizó publicar. Se avanzó `main` desde `a5bef47` hasta los commits verificados sin conflictos ni force push.
- App en uso, local/PWA, con `localStorage` y sincronización Supabase ya configurada. OneDrive comparte archivos, no los datos del navegador.
- **Publicado y comprobado en GitHub Pages**: https://eze183.github.io/App-finanzas-hogare-as/. El build 61 (`35027944441`) finalizó correctamente. Los archivos públicos `app.js`, `service-worker.js`, `index.html` y `styles.css` coinciden con los archivos probados (comparación completa normalizando CRLF).
- Versión publicada: `2026-09-15-proteccion-datos-v35`; service worker `gastos-hogar-v35`. No se accedió a datos de Supabase ni perfiles de navegador reales, y no se ejecutó ni modificó SQL.

## Qué se hizo

- Sync serializado, escrituras condicionales por `updated_at`, relectura ante conflictos, inserción sin upsert, timeout y reintentos. Reenvío tras reiniciar/reconectar. Desempate estable y conservación de tombstones.
- Validación previa de backups y estado remoto; importación por combinación, dueño local conservado y copia previa obligatoria. Un estado local ilegible bloquea el arranque sin sobrescribirlo.
- Cierres: cada ajuste tiene ID nuevo y referencia al anterior; transferencia solo por la diferencia. Historial conserva versiones y reaperturas. Bloqueo de superposiciones conocidas y aviso de conflictos simultáneos, sin descartar registros.
- Pagadores preservados al renderizar; elección Tami → Eze corregida; renombrado remoto conserva el lugar del dueño.
- Deuda incluye planes de cuotas futuros. Recurrentes semanales los lunes y mensuales el día 1, con ID por ocurrencia. Presupuesto semanal prorrateado por días del rango.
- Pruebas: 24 casos en VM (`tests/protection.test.cjs`) y 6 pruebas integradas de navegador (`tests/browser.integration.cjs`), todas aprobadas. Chrome 152 y Edge 153 + Playwright 1.62.1 + SDK Supabase real 2.116.0. Se ejecutan init, render y formularios reales con perfiles desechables; cada petición de la app se intercepta y la API vive en memoria. PostgreSQL/PostgREST real sigue pendiente.
- Se revisó la captura móvil del historial: conserva cierre original de $50 y ajuste de $20. Evidencia local en `.test-artifacts/history-mobile.png`, ignorada por Git. La validación integrada quedó en `97269a8`; la compatibilidad con datos antiguos sin IDs quedó en el commit local siguiente.

## Archivos

- Código: `app.js`, `service-worker.js`.
- Pruebas: `tests/protection.test.cjs`, `tests/browser.integration.cjs`, `tests/download-test-sdk.cjs`, `tests/README.md`. `.gitignore` excluye dependencias, SDK descargado y capturas.
- Documentación: `README.md`, `docs/proteccion-datos.md`, `docs/architecture.md`, `docs/session-summary.md`, este archivo.
- El contexto anterior completo, incluida la entrada local preexistente de renders, se conserva en `docs/codex-context-history.md`.
- La imagen local preexistente `WhatsApp Image 2021-12-28_enderezada.png` queda intacta, fuera del commit.

## Decisiones y pendientes

- La documentación de este despliegue está actualizada localmente, pendiente de subir. Auto-review rechazó dos veces el push documental a `main` por aplicar la prohibición inicial de publicar; la app v35 ya estaba publicada y verificada antes del bloqueo. Se necesita autorización explícita para subir estos cinco documentos. No reintentar ese push hasta recibirla.
- El despliegue solicitado está completado. Falta que Eze y Tami abran con Internet, esperen unos segundos, cierren completamente y vuelvan a abrir la PWA en ambos celulares antes de seguir cargando. No borrar datos ni reinstalar para actualizar. La versión cargada en cada teléfono no se puede verificar desde esta sesión.
- La integración con PostgreSQL/PostgREST real no se probó; las pruebas usan el SDK real con API simulada. El usuario autorizó la publicación tras realizar el backup. Mantener este límite registrado, no presentar los tests como verificación de datos o RLS reales.
- No hay cambios de arquitectura ni migraciones. Se usa la tabla `app_state` existente.
- La combinación del mismo registro usa última edición, con desempate estable; no conserva dos variantes de una edición simultánea del mismo ID. Los ajustes nuevos de cierre sí son registros separados.
- Cierres superpuestos creados offline se conservan y requieren conciliación explícita. Reabrir no revierte dinero transferido.
- Fechas históricas de recurrentes no se corrigen automáticamente. El esquema viejo no permite reconstruir siempre qué ocurrencia pretendía representar un gasto.
- Estados válidos de versiones antiguas sin IDs se actualizan con IDs y marcas de tiempo deterministas antes de sincronizar; registros inválidos continúan bloqueando el arranque para proteger el contenido original.
- Ver `docs/proteccion-datos.md` para límites, recuperación y procedimiento de pruebas. Ver `docs/session-summary.md` y `docs/codex-context-history.md` para sesiones anteriores.

## Problemas resueltos en el entorno de pruebas

- La descarga del SDK fallaba por la cadena de certificados de Node. Se resolvió con `node --use-system-ca`, sin desactivar TLS. El descargador fija versión y verifica SHA-256. Las pruebas luego funcionan sin acceso de la app a Internet.
- Pages siguió sirviendo v34 durante la publicación. Se crearon dos commits vacíos de disparo (`4955149`, `516b800`); después se confirmó build 61 y v35 pública. No se determinó la causa de la demora: no atribuirla al push atómico como hecho comprobado.
