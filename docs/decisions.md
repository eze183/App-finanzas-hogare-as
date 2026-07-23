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

**Efecto secundario descubierto en la práctica (2026-07-22)**: en `mergeRecordLists`, `deletedAt = record.deletedAt || existing.deletedAt || null` hace que un borrado sea irreversible por diseño — si cualquiera de las dos copias (local o remota) tiene `deletedAt`, el registro combinado queda borrado, sin importar cuál de las dos tiene el `updatedAt` más nuevo. No existe un camino para "des-borrar" un registro una vez que el tombstone se propagó; la única forma de recuperar un dato borrado por error es volver a cargarlo como un gasto nuevo (con otro `id`, sin el `createdAt` original). Tenerlo en cuenta antes de probar el flujo de borrado contra la base real de Supabase (ver advertencia de `CLAUDE.md` sobre `queueCloudSave`) y al considerar la idea pendiente de "editar un gasto ya cargado" — un borrado accidental durante esa función tendría el mismo problema.

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

## Resumen e Historial se ocultan/adaptan en modo personal

**Decisión** (2026-07-20): pedido explícito del usuario — "la pestaña de personales es casi idéntica a la de comunes, pero hay cosas de más". Antes de este cambio, el switch global Comunes/Personales solo afectaba el formulario de carga y la tabla de Movimientos; Resumen e Historial mostraban siempre datos comunes sin importar el modo, incluyendo "Eze pagó"/"Tami pagó" y el detalle de cierre semanal diferenciado por persona, que no tienen sentido para gastos personales (no se reparten 50/50).

**Solución**: en modo personal, Resumen recalcula el total semanal, la vista mensual y el gráfico por categoría con `personalExpenses` en vez de `expenses`, y oculta las tarjetas de reparto por persona y el detalle de cierre. La pestaña Historial (saldos entre personas) se oculta directamente, porque los gastos personales nunca se "saldan".

**Por qué no se tocó el panel "Por categoría"/presupuestos del tab Cargar**: el usuario no lo mencionó y sigue siendo información de contexto mientras se carga un gasto, no una duplicación confusa como sí lo eran los campos de reparto en Resumen.

## Historial de cuentas saldadas es una pestaña propia, no parte de Movimientos

**Decisión** (2026-07-13): pedido explícito del usuario, sin motivo adicional registrado más allá de preferencia de navegación.

## Rediseño visual Modernist traído de Claude Design

**Decisión** (2026-07-21, completo el 2026-07-22): el usuario armó una propuesta de rediseño completo en la app "Design" de Claude (herramienta separada, no este chat), bajo un sistema de diseño llamado "Modernist": paleta clara (#f3f2f2 de fondo), acento rojo único (#ec3013), tipografía Archivo, `radius: 0` en todos lados, dividers marcados de 2px, mobile-first con barra de navegación inferior. Reemplaza la paleta oscura "grafito moderno" (acento esmeralda) adoptada el 2026-07-10.

**Cómo se trajo el diseño al proyecto**: no hay integración directa entre Claude Design y este repo. El usuario exportó el proyecto de Design como "Project archive" (zip con todos los archivos: el `.dc.html` con el mockup de las 5 pantallas, el design system completo en `_ds/.../styles.css`, capturas). Ese export vive en `design-export/` **solo como referencia** — no se carga en runtime, no tiene build step ni se linkea desde `index.html`. Cada pantalla se reimplementa a mano leyendo el mockup, no se copia el HTML/CSS del export directamente (ese HTML usa un web component propio `<x-dc>`/`<x-import>` que no existe fuera de la herramienta Design).

**Por qué remapear variables en vez de reescribir `styles.css`**: la CSS actual (~1800 líneas) ya usa variables (`--bg`, `--ink`, `--accent`, etc.) consistentemente en todo el archivo. Cambiar solo los valores de esas variables en `:root` (más los pocos colores hardcodeados que quedaban sueltos, migrados a variables) logró el cambio de paleta completo sin tocar la estructura ni arriesgar reescribir 1800 líneas a mano. Es la misma técnica que ya se usa para el modo personal (override de variables bajo `.personal-mode`).

**Decisiones de alcance tomadas explícitamente por el agente, confirmadas con "lo que consideres mejor" del usuario**:
- El switch Comunes/Personales **queda global** (arriba de todo, fuera de las pestañas) en vez de volver a vivir dentro de cada pantalla como en el mockup — porque ya se había sacado de ahí a propósito el 2026-07-13 (ver decisión de esa fecha) y el mockup no tenía ese contexto.
- Configuración **queda como panel único** (no se agrega drill-down a sub-páginas como en el mockup) — un panel único es más simple y consistente con la filosofía "sin over-engineering" del proyecto para una app de 2 personas. Al implementarlo (2026-07-22) se resolvió con secciones `<details>` colapsadas por defecto (mismo mecanismo que "+ Más detalles" en Cargar): logra el efecto de "declutter" del mockup (todo colapsado, un tap para ver el detalle) sin agregar una vista nueva ni un router de ningún tipo.
- La categoría en el formulario de carga quedó como `<select>` estilizado, **no como chips** (el mockup los mostraba como chips horizontales scrolleables) — los chips hubieran requerido wiring nuevo en JS (estado de selección, sincronización con la carga por voz/OCR que hoy setea `expenseCategory.value` directamente). Se puede hacer más adelante si se pide explícitamente.
- El gráfico de categorías (barras/torta, dibujado en `<canvas>`) se mantuvo tal cual, solo recoloreado a la rampa roja/gris de Modernist — el mockup mostraba barras de progreso HTML simples en vez de canvas, pero reemplazar el canvas hubiera sido un cambio de `app.js` mucho más grande que un ajuste de paleta.

**Regla seguida en cada paso**: nunca tocar los `id` que usa `app.js` al reestructurar HTML — se reordenan/envuelven nodos pero los ids se preservan. La mayoría de los pasos (Cargar, Resumen, Historial, Configuración) no requirieron ningún cambio de lógica, solo HTML/CSS. Las excepciones: mover el botón `#settleWeekButton` de Movimientos a Resumen (relocalización del mismo elemento, no una copia) y actualizar el array `chartColors` en `app.js` (una constante de colores, no lógica); y Movimientos, donde sí hubo lógica nueva (`groupExpensesByDay`/`renderMovementGroups`) porque pasar de "dos columnas por persona" y "tabla" a "lista agrupada por día" no era solo un reacomodo visual — ver el paso 5 en `roadmap.md`.
