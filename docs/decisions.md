# Decisiones de diseño

Extraídas del historial real del proyecto (`git log`, `CODEX_CONTEXT.md`, y la sesión que armó esta documentación). Cada entrada tiene fecha aproximada, la decisión, y el motivo. El objetivo es que una sesión futura no deshaga sin querer algo que ya se probó y se decidió a propósito.

## Sin build, sin framework, sin backend propio

**Decisión**: HTML/CSS/JS plano, un solo `app.js`, sin bundler ni dependencias de build. Backend opcional (Supabase) solo para sincronizar, no para lógica de negocio.

**Por qué**: `AGENTS.md` lo deja explícito como regla del proyecto — "priorizar soluciones simples, sin servidor, salvo que el usuario pida sincronización real" y "evitar cambios grandes de arquitectura si no son necesarios". Es una app doméstica para 2 personas, no un producto que necesite escalar.

**Cómo aplicarlo**: no proponer migrar a un framework, no agregar `package.json`/bundler salvo pedido explícito del usuario.

## Persistencia local + sincronización opcional (no backend obligatorio)

**Decisión** (2026-06-25 aprox.): agregar Supabase como sincronización *opcional* entre dispositivos, sin que la app deje de funcionar 100% local si no está configurado.

**Por qué**: la app nació como local-only (`localStorage`), y cuando se necesitó compartir datos entre el celular de Eze y el de Tami, se evaluó explícitamente no depender de un backend obligatorio — ver el pendiente histórico en `CODEX_CONTEXT.md`: "decidir si se quiere sincronizar... evaluar una opción simple de importar/exportar backup JSON". Se optó por Supabase con RLS abierta a `anon` para no tener que manejar autenticación de usuarios.

**Trade-off aceptado conscientemente**: la tabla `app_state` es de lectura/escritura pública para cualquiera que tenga la URL y la key (ambas están en el repo público de GitHub). Riesgo bajo para datos de gastos domésticos, pero es real — ver `roadmap.md`.

## Sync merge-based con tombstones, no reemplazo del estado completo

**Decisión** (2026-07-20, commit `135956e`): reemplazar el modelo de sync "el que sube último pisa todo" por un merge por id con tombstones para borrados.

**Por qué**: revisión de código encontró que el diseño anterior (`UPSERT` del estado local completo) podía perder gastos: si dos dispositivos agregaban algo distinto casi al mismo tiempo, el segundo `push` sobreescribía el array entero del primero, perdiendo su gasto nuevo silenciosamente. No fue un bug reportado por el usuario, sino encontrado proactivamente al auditar la app y confirmado que era el riesgo más importante a resolver primero.

**Alternativas consideradas y descartadas**:
- Merge aditivo puro (unión de arrays sin tombstones): descartado porque no respeta los borrados — un dispositivo que borra algo localmente vería "resucitar" el registro en el próximo sync si el otro dispositivo todavía tenía la versión vieja.
- Base de 3 vías persistida (como `git merge-base`): descartada por complejidad innecesaria — dado que la app solo tiene operaciones de alta y baja (no hay edición de gastos, excepto el caso especial de renombrar personas), un tombstone simple por registro alcanza sin necesitar guardar un snapshot base separado.

**Detalle técnico**: ver `architecture.md` → sección de sincronización.

## `people`/`budgets` usan last-write-wins de campo completo, no merge granular

**Decisión**: a diferencia de los gastos (merge por id), los nombres de las personas y los presupuestos se resuelven comparando un timestamp único (`peopleUpdatedAt`/`budgetsUpdatedAt`) y tomando el lado más reciente completo.

**Por qué**: son estructuras sin id por entrada (un array de 2 strings, un objeto plano categoría→monto) y cambian con muy poca frecuencia comparado con los gastos. Un merge más fino no se justificaba por la complejidad que agregaría. Es una simplificación consciente, documentada acá para que quede claro que **no** es un descuido — si en el futuro se vuelve un problema real (dos personas cambiando presupuestos distintos casi al mismo tiempo), ahí sí conviene revisar.

## Service worker: `{ cache: "reload" }` en el fetch

**Decisión** (2026-07-13): forzar que el service worker baje siempre bytes frescos del servidor, ignorando el caché HTTP normal del navegador.

**Por qué**: se encontró que un usuario con la PWA instalada no veía cambios ya publicados incluso después de cerrar y reabrir la app. Diagnóstico: el fetch "network-first" del service worker (`fetch(event.request)`) sin opciones respeta el caché HTTP normal del navegador — la lógica *parecía* pedir la versión más nueva, pero el propio `fetch()` podía devolver una respuesta cacheada sin llegar siquiera a la red. Cerrar/reabrir no alcanzaba porque el problema no estaba en el Cache Storage del service worker (que sí se limpia bien en `activate`), sino un nivel más abajo.

**No revertir esto** sin entender por qué se agregó — es fácil pensar que "network-first ya alcanza" y sacarlo, pero ya se demostró que no alcanza.

## Service worker: solo intercepta same-origin

**Decisión** (2026-07-11): el fetch handler del service worker ignora cualquier request a otro origen (`if (new URL(event.request.url).origin !== self.location.origin) return;`).

**Por qué**: originalmente interceptaba *todas* las peticiones GET, incluidas las llamadas a la API de Supabase. Cuando una de esas llamadas fallaba, el `catch` devolvía el `index.html` cacheado como si fuera la respuesta de Supabase (200 OK con HTML en vez de JSON) — enmascarando fallos reales de sincronización de forma silenciosa.

## Lectura de resúmenes de tarjeta: fecha anclada al inicio de línea, no "en cualquier parte"

**Decisión** (2026-07-11): tanto para detectar si un documento es un ticket o un resumen de tarjeta (`detectDocumentType`) como para extraer cada línea de un resumen (`extractStatementLine`), la fecha se busca *solo* al principio de la línea, con `^` anclado, y se valida que sea una fecha real (día/mes/año que efectivamente exista).

**Por qué**: la versión anterior buscaba el patrón "número-separador-número" en cualquier parte del texto. Un ticket común está lleno de falsos positivos con ese patrón que no son fechas: el CUIT (`27-20195663-9`), el número de comprobante, montos con decimales, y sobre todo líneas de productos pesados como `2.000 x $7850.00`. Con 3+ "fechas" falsas, la app confundía un ticket normal con un resumen de tarjeta. Ver también: reconocimiento de fecha con nombre de mes abreviado en español (`spanishMonthAbbreviations`), agregado el mismo día porque Banco Nación escribe "30-May-26" en vez de "30/05/26".

## Categorías de uso diario se marcan "Comunes" por defecto al importar un resumen

**Decisión** (2026-07-11): Farmacia, Supermercado, Verdulería, Carnicería, Pollería/Pescadería y Combustible detectados en un resumen de tarjeta se tildan como gasto común por defecto (antes quedaban personales salvo cambio manual).

**Por qué**: pedido explícito del usuario después de ver que el comportamiento por defecto (solo seguros/streaming/servicios como comunes) no coincidía con cómo reparten los gastos reales del hogar.

## Sin edición de gastos, solo alta y baja

**Decisión implícita** (desde el origen del proyecto, nunca cambiada): la app no tiene UI para editar un gasto ya cargado. Si te equivocaste, hay que borrarlo y cargarlo de nuevo.

**Por qué**: no hay una decisión explícita registrada — es una limitación heredada del diseño original que nunca se revisó. Se documenta acá porque **afecta directamente el diseño del merge de sincronización** (ver arriba): al no haber edición real de gastos, el merge no necesita resolver conflictos de contenido en la mayoría de los casos, solo altas y bajas. Si en algún momento se agrega edición, hay que revisar el merge.

## Rediseño visual (paleta, tipografía, radios)

**Decisión** (2026-07-10): paleta "grafito moderno" (fondo casi negro, acento esmeralda) reemplazando el verde bosque/rosa vino original; tipografía Manrope+Inter; radios de borde más grandes.

**Por qué**: pedido explícito del usuario ("no me gustan los colores, la tipografía... quiero algo moderno"). Se le mostraron 2 propuestas visuales antes de implementar, eligió la oscura. Ajuste posterior: acento menos saturado y botones de acción rápida en contorno en vez de sólido, tras feedback de que "se ve bien pero no me convence 100%".

## Íconos de carga rápida + switch de modo se reubicaron dos veces

**Decisión** (2026-07-13): "Sacar foto/Elegir archivo/Dictar gasto" quedan justo arriba del botón "Agregar gasto" (no al principio del panel). El switch "Comunes/Personales" se movió al principio de toda la app, fuera del panel de carga.

**Por qué**: pedido explícito del usuario. El switch se movió porque *ya* cambiaba el tema visual completo de la app (no solo el formulario de carga), así que tenía sentido que viviera en un lugar global, no escondido dentro de un panel específico. Al moverlo, se eliminó el sub-menú redundante "Gastos comunes/Gastos personales" que existía separado dentro de Movimientos, para no tener dos controles que se pudieran desincronizar.

## Compras en cuotas: campos en `personalExpenses`, no una entidad nueva

**Decisión** (2026-07-20): para el problema de "compro algo en cuotas con una de las 4 tarjetas y me olvido de que la sigo pagando", se evaluó crear una entidad `installmentPurchases` separada (con generación automática de un gasto por mes) pero se descartó a pedido explícito del usuario ("me gustaría que sea simple"). En cambio: `personalExpenses` ganó dos campos opcionales, `card` (una de 4 tarjetas fijas: Visa Banco Galicia, Mastercard Banco Galicia, Mastercard Mercado Pago, Mastercard Banco Nación) y `installments` (cantidad de cuotas, 1 por defecto). El monto cargado sigue siendo el total de la compra, una sola vez.

**Por qué esta forma y no la entidad separada**: pedido explícito de simplicidad del usuario, y alcance reducido a gastos personales únicamente (no gastos comunes) — también pedido explícito. Al ser campos de un registro existente, no hace falta tocar el modelo de sync (ya mergea `personalExpenses` por id) ni generar gastos nuevos cada mes (que hubiera requerido lógica de "aplicar cuotas" como los recurrentes, con su propio riesgo de duplicados). El "en qué cuota estoy" se calcula al vuelo comparando la fecha de compra con la fecha actual (`getPendingInstallments()` en `app.js`), no se guarda como número en el estado.

**Trade-off aceptado**: si el usuario carga la compra con la fecha real de la compra (no la del primer débito), el cálculo de "cuota N/M" puede correrse un mes respecto al resumen real de la tarjeta. No se resolvió porque no se pidió, y es un caso borde poco frecuente.

## Historial de cuentas saldadas es una pestaña propia, no parte de Movimientos

**Decisión** (2026-07-13): pedido explícito del usuario, sin motivo adicional registrado más allá de preferencia de navegación.
