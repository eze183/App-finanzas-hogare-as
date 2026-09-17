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

- El usuario autorizó explícitamente subir la documentación a `main` con «subila», resolviendo el bloqueo previo de auto-review. Se publica también en `codex/proteccion-datos` para mantener la continuidad en ambos equipos. Esta actualización solo modifica documentación.
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

## Revisión de gastos — agosto 2026

- Se analizó el backup `backup-gastos-hogar-2026-09-15.json`, sin modificar datos ni código.
- Gastos compartidos activos de agosto: $1.829.592,62 (61 movimientos), equivalentes a $914.796,31 por persona si se dividen 50/50. Pagó Tami $1.218.505 y Eze $611.087,62.
- Gastos personales activos: Eze $460.850 y Tami $60.000. Para Eze, $358.000 corresponden a contadora y caja de previsión; el backup no incluye ingresos, por lo que no permite calcular el resto real del sueldo.
- No se encontraron duplicados exactos activos en agosto. Conviene verificar manualmente el supermercado de $190.000, Spotify + Spotify 2 ($4.788 + $4.560), y si pagos/categorías como `Tarjeta de credito` representan cuotas reales o resúmenes ya desglosados, para evitar doble conteo.
- El total mensual de la app suma correctamente los importes activos por fecha. Algunos cierres quedaron desactualizados por movimientos cargados luego del cierre; el caso más grande es 17/08–26/08: cierre guardado $140.954 frente a $343.168 actuales (diferencia $202.214). La app está diseñada para marcarlo y pedir un ajuste, no para reescribir el cierre original.

## Ideas priorizadas a partir del análisis financiero

- Prioridad alta propuesta: registrar ingresos netos mensuales y mostrar `ingresos - gastos pagados = resto`, separado por persona y hogar.
- Diferenciar tres vistas: consumo del mes, flujo de caja realmente pagado y compromisos futuros. Las compras en cuotas no deberían distorsionar el resto del sueldo contando todo el plan en el mes de compra.
- Agregar naturaleza del gasto (`Esencial`, `Opcional`, `Profesional/impuestos`) y categorías específicas para impuestos/aportes, suscripciones y cuotas; evitar que `Servicios` y `Otros` oculten el diagnóstico.
- Mejorar presupuestos: monto mensual por categoría, meta de ahorro, semáforo/proyección de fin de mes y alertas no bloqueantes ante importes atípicos o posible duplicado.
- Hacer más visible la conciliación de cierres desactualizados, mostrando movimientos agregados después del cierre y el ajuste neto pendiente.
- Estas son recomendaciones, no cambios autorizados. Implementarlas en etapas simples y sin una reescritura de arquitectura.

## Prototipo independiente de análisis — 2026-09-16

- Se creó `prototipo-analisis/` sin modificar `index.html`, `app.js`, `styles.css`, el service worker ni el almacenamiento de la app principal.
- El prototipo tiene datos agregados de demostración e importa backups JSON. Usa la clave aislada `gastos-hogar-prototipo-analisis-v1`.
- Separa visual y matemáticamente los gastos comunes de los personales. Los comunes se desglosan por categoría y muestran monto asignado y porcentaje del ingreso de cada persona.
- Los gastos personales pertenecen sólo a su dueño. Una compra en cuotas se computa por la cuota del mes desde `firstInstallmentMonth`, incluso si fue comprada en un mes anterior.
- Con el backup real, agosto muestra $1.829.592,62 comunes; el flujo personal de Eze es $527.432 porque suma $460.850 de compras de agosto y aproximadamente $66.582 de cuotas iniciadas antes. Su impacto total del mes es $1.442.229 al agregar la mitad de los comunes.
- Se agregó `tests/prototype.test.cjs`: verifica aislamiento de una cuota personal frente a los comunes y los totales del backup real. Dos pruebas aprobadas en Chrome headless.
- Pendiente de decisión del usuario: validar el enfoque visual/cálculo antes de integrar alguna parte en la app principal.
- Ajuste posterior pedido por el usuario: ingresos, porcentajes sobre el ingreso y resto disponible quedaron exclusivamente en `Personal`, mostrando sólo a `deviceOwner`. La vista `Comunes` conserva totales, categorías y parte monetaria por persona, pero no revela ingresos individuales. Las dos pruebas siguen aprobando.
- Si se integra el enfoque, debe hacerse sobre la app actual preservando dictado por voz, lectura de tickets/resúmenes, USD, sincronización, cierres, recurrentes, cuotas y backups. El prototipo no intenta replicar todavía esas funciones.
- El prototipo se amplió a una maqueta integral con navegación `Cargar`, `Análisis`, `Movimientos`, `Cuotas`, `Cierres` y `Ajustes`. La carga común y personal cambia campos/categorías y permite guardar movimientos sólo en el estado aislado. Voz, ticket y resumen tienen su interfaz y explican que usarían la implementación actual al integrar.
- Se agregó una tercera prueba para navegación, privacidad, formulario de cuotas y ausencia de desborde en 390 px. Total: 3 pruebas del prototipo aprobadas.
- `Movimientos` ahora tiene filtros combinables de categoría/persona y orden real por fecha reciente/antigua o importe mayor/menor, con total y cantidad visibles recalculados. El filtro de persona se oculta en Personal. Se agregó una prueba específica; total actual: 4 pruebas aprobadas.

## Integración en la app principal — v41 publicada

- Antes de modificar la app se creó la rama local de recuperación `codex/backup-app-antes-analisis-2026-09-16`, apuntando al commit `f0111b00398c9ba523f3b0e70a19f78b68d2b907` (v35 publicada).
- Se integró en `index.html`, `app.js` y `styles.css` sin reemplazar los formularios ni las funciones existentes. La interfaz principal ahora reproduce la composición visual de la maqueta aprobada: encabezado “Finanzas con contexto”, navegación visible `Cargar / Análisis / Movimientos / Cierres|Cuotas / Ajustes`, paneles rectos, jerarquías fuertes y colores diferenciados para comunes/personales. `service-worker.js` pasó a caché v39 y `APP_VERSION` a `2026-09-16-maqueta-completa-v39`.
- En Comunes, Vista mensual muestra categoría, total, porcentaje y parte 50/50. No muestra ingresos.
- En Personales, Resumen muestra ingreso neto, parte de comunes, flujo personal del mes (incluye cuotas de compras anteriores), resto e impacto de cada categoría común.
- Los ingresos usan `home-expenses-private-finance-v1`: quedan sólo en ese navegador, no se sincronizan ni forman parte del backup compartido.
- Se agregaron categorías personales profesionales/impositivas, filtro personal por categoría y orden de movimientos por fecha reciente/antigua además de monto/agrupaciones existentes.
- Verificación: 24 pruebas de protección y 7 integradas de navegador aprobadas. La nueva integrada confirma que el ingreso privado no llega al estado remoto y que ambos órdenes por fecha funcionan. Prueba visual local en Comunes/Personales, Resumen y Movimientos correcta.
- El esquema compartido no cambió: `expenses`, `personalExpenses` y `settlements` se leen sin migración, por lo que el historial existente se conserva. La prueba móvil de cierre/ajuste confirma que dos versiones del cierre sobreviven y siguen visibles.
- Respaldo visible de la app anterior: `backups/app-v35-antes-nueva-interfaz-2026-09-16.zip`, SHA-256 `EA4E790B661FC57EE64A25C2C6C8BC6EB95947CD89EF34237C3E91F444AB3613`. El ZIP está ignorado por Git pero queda en OneDrive; `backups/README.md` registra la recuperación.
- Se reforzó la actualización de la PWA: el registro del service worker evita la caché HTTP, busca actualizaciones al cargar y recarga una sola vez cuando toma control la versión nueva. Para destrabar clientes que ya conservaban versiones anteriores se usa inicialmente `/?version=39`.
- Se detectó que el servidor local del puerto 8765 se había detenido: Android y Windows estaban mostrando la copia offline anterior. Se reinició desde la carpeta correcta, enlazado a `0.0.0.0`, y se verificó `http://192.168.1.105:8765/?version=39` con el HTML v39 (Ajustes dentro de la navegación y kicker “NUEVO MOVIMIENTO”).
- Ajuste v40 pedido tras revisar la app real: el gráfico grande de canvas queda fuera de la interfaz y se reemplaza por barras compactas + tabla de categoría, total, porcentaje y parte por persona. `Detalle del cierre` se movió inmediatamente debajo del bloque de cierre y antes de las tarjetas por persona. La vista mensual ya no muestra “Gastos cargados” ni “Semanas con gastos”; conserva sólo total mensual, categoría principal y desglose útil. También se redujo la altura del total principal.
- Ajuste v41: el resultado `persona le pasa $X a persona` pasa a ser el primer bloque de Análisis, antes incluso del total. La etiqueta siempre dice `Detalle del cierre`. Si hay cierres superpuestos, la transferencia actual sigue visible y la advertencia queda debajo; antes el aviso reemplazaba el monto y ocultaba justo la información principal.
- Publicación autorizada por el usuario: `main` y `codex/proteccion-datos` avanzaron a `3421e92`. GitHub Pages build `35169744083` terminó en `success` y se verificó la URL pública: entrega `2026-09-16-transferencia-prioritaria-v41`, Ajustes dentro de la navegación y el bloque de transferencia antes del total.
