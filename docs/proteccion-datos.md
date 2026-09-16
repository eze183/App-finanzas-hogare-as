# Protección de datos — versión publicada

Estado: 2026-09-15. Implementado en `codex/proteccion-datos` y publicado en `main`/GitHub Pages después de que el usuario confirmó su backup y autorizó el despliegue. Build 61 (`35027944441`) exitoso; archivos públicos de la app comparados íntegramente con los probados. Versión `2026-09-15-proteccion-datos-v35` y caché `gastos-hogar-v35`.

## Cambios y criterios

| Problema | Comportamiento preparado |
| --- | --- |
| Escrituras remotas simultáneas | Lectura + combinación + UPDATE condicionado a `updated_at`. Cero filas o INSERT duplicado significa conflicto: releer antes de escribir. |
| Fallos de red y cambios durante una subida | Una cola por instancia; timeout de 20 s por petición; reintento de 1 a 60 s. El estado local se vuelve a enviar tras reiniciar, reconectar o recuperar foco. |
| Empates y borrados antiguos | Desempate estable por contenido. No se eliminan tombstones por antigüedad para evitar resurrecciones desde equipos offline. |
| Backup inválido | Rechazo completo antes de modificar datos: estructura, versión/app, IDs, duplicados, fechas reales, tipos, importes, cuotas, presupuestos y cadenas de ajustes. Límite de 20 MB. |
| Importación destructiva | Se combina por ID/última edición, incluidos tombstones, sin eliminar registros exclusivos del navegador. Nombres de hogar distintos se rechazan para evitar reasignaciones. El dueño del dispositivo no se importa. |
| Recuperación | Antes de importar se guarda el estado anterior bajo `home-expenses-v1-before-import-<timestamp>`. Si falla esa copia o el guardado del resultado, se aborta sin sustituir el estado activo. |
| Estado local ilegible | Se detiene el arranque; se conserva el valor original de `home-expenses-v1` y no se conecta ni se guarda una copia vacía. |
| Actualización de cierres | Nuevo ID, referencia `supersedes` y transferencia `adjustment` por la diferencia. El registro original permanece intacto. |
| Períodos superpuestos | Se impiden nuevos cierres sobre otros activos conocidos. Conflictos creados simultáneamente/offline se conservan y se señalan en resumen e historial. |
| Pagador y dueño | Render conserva selección común/recurrente y borradores de edición. Selección explícita del dueño permite Tami → Eze. Renombrado remoto conserva la posición del dueño. |
| Cuotas futuras | La deuda y fecha final incluyen planes que aún no vencen. El total mensual incluye solo cuotas que vencen ese mes. |
| Recurrentes | Una ocurrencia por lunes o día 1 dentro del rango; ID estable por plantilla/ocurrencia. Repetir rangos solapados o sincronizar dos altas de la misma ocurrencia no crea dos IDs. Un borrado no se regenera automáticamente. |
| Presupuestos | La cifra guardada continúa siendo semanal. Límite mostrado = semanal × días inclusivos / 7. Un mes de 30 días usa 30/7; no se reescriben presupuestos existentes. |

## Cierres y dinero ya transferido

Ejemplo: Eze pagó 100; Tami transfirió 50 al cerrar. El gasto pasa a 140: el nuevo ajuste pide otros 20, no 70. El historial conserva el pago original de 50 y el ajuste de 20. Si cambian de lado, el cálculo resta el saldo anterior con signo. También puede ajustarse a cero después de borrar todos los gastos.

Reabrir conserva el registro con marca de reapertura. **No revierte una transferencia real.** Antes de cerrar nuevamente o resolver cierres offline superpuestos, conciliar lo efectivamente pagado. No se intenta decidir automáticamente cuál de dos transferencias fue real.

## Pruebas reproducibles sin producción

Requiere Node.js; no requiere npm ni dependencias descargadas.

```sh
node --test tests/protection.test.cjs
node --check app.js
node --check service-worker.js
git diff --check
```

24 pruebas sobre las funciones reales de `app.js`, ejecutadas en contextos VM independientes. Solo se omite la llamada automática a `init()` y se reemplazan render/navegación para las pruebas de lógica. Los formularios tienen un DOM mínimo simulado; las funciones de render específicas se prueban directamente. `fetch` falla por diseño. Supabase se sustituye por una tabla en memoria con compare-and-swap e INSERT exclusivo. No se carga `supabase-config.js`, HTML, SDK remoto, service worker ni almacenamiento del navegador.

Cubren carreras de escritura y primera inserción, cambios durante await, fallos/reinicio/timeout, estado remoto inválido, tombstones antiguos, backups inválidos/duplicados y falta de espacio, pagadores/renombres, deuda futura, recurrentes, presupuestos, ajustes y superposiciones, empates, arranque con estado corrupto, cadenas de cierre inválidas y actualización determinista de registros antiguos sin IDs.

### Verificación integrada de navegador completada

Se agregaron 6 pruebas en `tests/browser.integration.cjs`, ejecutadas con Chrome 152 y Edge 153, Playwright 1.62.1 y **SDK Supabase real 2.116.0**, además de las 24 de lógica. Todas aprobadas. Instrucciones reproducibles en [tests/README.md](../tests/README.md).

Se ejecuta `init()` completo y render real. Cada dispositivo tiene su propio contexto desechable de navegador. El HTML se copia en memoria sin los scripts de producción; se usa un SDK local con versión y SHA-256 fijados. Todas las solicitudes se interceptan: archivos desde una lista permitida y API PostgREST simulada compartida entre dispositivos. No hay `route.continue()`, service worker ni lectura del perfil habitual del usuario.

Cobertura: carga y edición desde formularios, persistencia del dueño al recargar, pagador durante resize/sync, conflictos de escritura con el SDK real, fallo 503 y recuperación, importación mediante input de archivo, conservación de cierre/ajuste, bloqueo de superposiciones, deuda futura, recurrentes, presupuesto mensual y actualización determinista de datos anteriores sin IDs. La captura móvil del historial fue revisada: se ven ambos registros y sus transferencias correctas, sin desborde horizontal.

**Pendiente:** la API simulada no verifica PostgreSQL/PostgREST real, políticas RLS ni permisos del proyecto. Falta un proyecto Supabase de ensayo separado con tabla preparada; se pidió al usuario la disponibilidad del entorno. No se ejecutaron migraciones. Tampoco se probaron OCR, dólar MEP ni actualización de PWA en este entorno aislado. No usar los botones de sync de producción para completar estas pruebas.

## Límites y continuidad

- No se modificaron `supabase-config.js` ni `supabase-setup.sql`. No se ejecutó ninguna migración ni operación contra datos reales.
- Clientes v34 o anteriores siguen usando upsert y deduplicación de cierres. Después de esta publicación hay que actualizar ambos celulares; no hay una barrera de servidor contra clientes viejos en esta tarea.
- Campos editados simultáneamente sobre el mismo ID siguen usando última edición (desempate estable). La cola evita perder altas de IDs distintos, pero no convierte el almacenamiento en un historial de todas las ediciones de gastos.
- Los tombstones crecen sin poda automática. Vigilar el tamaño antes de diseñar un protocolo de confirmación por dispositivo.
- Las fechas de recurrentes históricos no se cambian. Antes se fechaban al principio del rango y no guardaban identidad de ocurrencia; no siempre se puede deducir el mes originalmente pretendido. Revisar esos casos manualmente, sin migraciones automáticas.
- Una importación con nombres diferentes o datos incompatibles se rechaza para revisión. No renombrar ni reparar gastos reales automáticamente para hacerla pasar.
- La copia previa de importación vive en el mismo navegador, no sustituye un backup exportado. Para recuperar: preservar primero el valor original y las claves `home-expenses-v1-before-import-*`; exportar la copia elegida a un archivo antes de cualquier reemplazo. No borrar almacenamiento ni reinstalar la app como primer intento de reparación.
- `main` y GitHub Pages se actualizaron con autorización posterior del usuario. La imagen preexistente sigue intacta y fuera de los commits. El contexto histórico completo se conservó en `docs/codex-context-history.md`.
