# Pruebas aisladas

## Lógica: Node sin dependencias

Desde la raíz:

```powershell
node --test tests/protection.test.cjs
```

24 casos, almacenamiento en memoria y red bloqueada. No leen `supabase-config.js` ni datos del navegador.

## Navegador: Chrome + Playwright + SDK real

Preparación única con conexión a los registros públicos (ninguna conexión a una base de datos):

```powershell
npm install --prefix .test-artifacts --no-package-lock playwright@1.62.1
node --use-system-ca tests/download-test-sdk.cjs
```

Usar Node 24 o superior para `--use-system-ca`. Si la instalación de Node ya confía en el certificado del CDN, se puede omitir esa opción. Nunca desactivar la validación TLS. El descargador guarda Supabase SDK 2.116.0 solo después de verificar su SHA-256.

Ejecutar desde la raíz con Chrome instalado:

```powershell
$env:NODE_PATH = (Resolve-Path .test-artifacts/node_modules).Path
node --test tests/browser.integration.cjs
```

También funciona con el Playwright ya disponible en el entorno: `NODE_PATH` debe apuntar al directorio que contiene ese paquete. En esta sesión se usó el runtime incluido con Codex, sin instalar dependencias en el proyecto.

Para Edge, establecer `$env:TEST_BROWSER_CHANNEL = 'msedge'`. No se descarga un navegador automáticamente. El proceso es headless y usa perfiles desechables, sin abrir ni modificar el Chrome/Edge habitual.

## Qué se prueba

Siete escenarios con `app.js`, formularios, eventos, canvas e `init()` completos:

1. Pagador elegido durante sync/resize, alta desde formulario y dueño Tami → Eze persistente tras recarga.
2. Dos contextos de navegador con fallos de red y escrituras concurrentes usando el SDK real; filtro por revisión y conservación de ambas altas.
3. Importación por input de archivo: rechazo de backup inválido, combinación válida y copia de recuperación.
4. Cierre, edición de gasto, ajuste de transferencia, conservación del historial y bloqueo de períodos superpuestos.
5. Cuotas que empiezan en el futuro, recurrentes semanales y presupuesto prorrateado en un mes completo.
6. Actualización de un estado válido de una versión antigua sin IDs, conservando y sincronizando todos sus gastos.
7. Privacidad del ingreso individual y orden de movimientos por fecha reciente/antigua.

## Aislamiento

- El HTML original se lee como texto y se transforma en memoria: se quitan todos los scripts y enlaces de Internet antes de servirlo al navegador. El archivo del proyecto no cambia.
- La prueba entrega el SDK verificado, una configuración ficticia y `app.js` mediante interceptores de Playwright.
- Orígenes ficticios terminados en `.invalid`. Todas las solicitudes son resueltas por los interceptores o abortadas. Ninguna continúa a Internet.
- La API es un simulador de PostgREST en memoria, con creación exclusiva, filtro `updated_at` y barrera para carreras de lectura. No es PostgreSQL.
- Cada contexto tiene `localStorage` propio sembrado con datos ficticios. Se bloquean service workers y se cierran los contextos al terminar.
- Se verifica que no haya errores JavaScript sin capturar ni solicitudes inesperadas.
- SDK descargado, dependencias y captura `.test-artifacts/history-mobile.png` quedan fuera de Git.

## Resultado y límites

Verificado: 24 pruebas de lógica y 7 de navegador aprobadas con Chrome 152.0.7977.84, Playwright 1.62.1 y SDK 2.116.0. Las seis pruebas anteriores también fueron aprobadas con Edge 153.0.4234.32. Se revisó visualmente el historial móvil con transferencia original y ajuste.

No valida permisos/RLS ni concurrencia del PostgreSQL real. Para ese paso falta un proyecto Supabase de ensayo separado, ya preparado; no se deben usar credenciales de producción ni ejecutar migraciones como parte de estos comandos. OCR, cotización externa y ciclo de actualización de la PWA quedan fuera de estos escenarios.
