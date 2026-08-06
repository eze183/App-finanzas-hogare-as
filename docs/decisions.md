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

**Actualización (2026-07-30)**: al agregar las categorías "Despensa", "Dietetica" y "Fiambreria" (pedido del usuario, sin más contexto que el nombre), se las sumó también acá y a `foodCategories` (que agrupa como "Comida" en el gráfico de Resumen) — es una inferencia del agente, no algo que el usuario haya pedido explícitamente, pero son gastos de uso diario del mismo tipo que Supermercado/Verdulería/Carnicería/Pollería, que ya estaban en ambos sets. Si alguna de las tres no debería agruparse como "Comida" en el gráfico (por ejemplo si "Dietetica" se usa para compras que no son de comida), avisar para sacarla de `foodCategories` sin tocar `householdCommonCategories`.

## Editar un gasto ya cargado (2026-08-03) — reemplaza la decisión implícita anterior de "solo alta y baja"

**Historial**: desde el origen del proyecto hasta acá, la app no tenía UI para editar un gasto — si te equivocabas, había que borrarlo y cargarlo de nuevo. Era una limitación heredada, nunca una decisión explícita, y estaba documentada acá porque afectaba el diseño del merge de sincronización con una advertencia explícita: "si en algún momento se agrega edición, hay que revisar el merge". Esta entrada actualiza esa nota ahora que la edición existe.

**Decisión**: pedido explícito del usuario ("poder editar el gasto o el propietario del gasto desde Movimientos, sin tener que eliminar el gasto y cargarlo nuevamente"). Se agregó un botón "✎" junto al de borrar en cada fila de Movimientos (común y personal) que reutiliza el formulario de Cargar existente en modo edición: lo prellena con los datos del gasto, cambia el título a "Editar gasto" y el botón a "Guardar cambios", y agrega un botón "Cancelar edición". Al guardar, actualiza el registro **por id** (mismo `id`, mismo `createdAt`, `updatedAt` nuevo) en vez de crear uno nuevo, y navega a Movimientos para ver el resultado. Cubre todos los campos, incluido el pagador/propietario (el pedido específico del usuario) y tarjeta/cuotas para gastos personales.

**Se revisó el merge antes de tocar nada, tal como pedía la nota anterior — y no hizo falta cambiarlo**: `mergeRecordLists` ya resuelve cada registro completo por `id` comparando `updatedAt` (last-write-wins de todo el objeto, no merge campo a campo — ver la entrada de sync más arriba). Una edición no es conceptualmente distinta de un alta para ese mecanismo: mismo `id`, `updatedAt` más nuevo, gana. Se verificó explícitamente simulando ambos sentidos (edición local más nueva que la remota, y viceversa) antes de dar la función por terminada.

**Interacción con el traslado de borrador entre pestañas** (agregado el 2026-07-29, ver la entrada de arriba): cambiar de pestaña Comunes/Personales en medio de una edición **cancela la edición** en vez de trasladarla — editar un registro existente tiene un tipo fijo (común o personal), a diferencia de un gasto nuevo en progreso que todavía no decidió su tipo. Mezclar ambos mecanismos hubiera dejado estados ambiguos (¿el id que se está editando corresponde a qué formulario visible?).

**Lo que no se tocó**: la sección "cargar rápido" (foto/archivo/voz) queda oculta como siempre durante una edición porque sigue siendo el mismo formulario — no se ocultó explícitamente ni se le dio un comportamiento especial en modo edición; si el usuario saca una foto mientras edita, pisaría los campos del gasto que está editando con los datos del ticket nuevo. No fue pedido y es un caso de uso poco probable, pero queda anotado por si genera confusión más adelante.

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

**Actualización (2026-07-29): el panel "Por categoría" sí pasó a respetar el modo.** El usuario lo señaló explícitamente ("hay una leyenda que dice resumen de los gastos comunes de esta semana, siendo que yo estoy en la pestaña personal"): mostraba totales de gastos comunes con una leyenda hardcodeada incluso en modo personal. Ahora `renderCategories(summaryExpenses, isPersonal)` recibe los gastos del modo activo y la leyenda se escribe desde JS (`#categoryPanelNote`). Los presupuestos se resolvieron por separado el mismo día — ver la decisión "Presupuestos separados por modo" más abajo.

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

## Ícono PWA recoloreado a Modernist, mismo concepto (recibo + check)

**Decisión** (2026-07-26): en vez de diseñar un ícono nuevo desde cero, se mantuvo el concepto del ícono anterior (una tarjeta/recibo con líneas de ítems y una insignia de confirmación en la esquina) y se recoloreó a la paleta Modernist (`#f3f2f2` de fondo, tarjeta blanca con borde de tinta `#201e1d`, insignia roja `#ec3013` con check blanco).

**Por qué**: el pedido del usuario fue puntual — "los colores no tienen nada que ver con el diseño de la app" — no pidió un concepto nuevo. Mantener la composición y solo cambiar la paleta es el cambio más chico que resuelve el problema real, y conserva algo de continuidad visual con versiones anteriores de la app.

**Restricción técnica a respetar en cualquier edición futura de `icon.svg`**: el `manifest.json` declara el ícono con `"purpose": "any maskable"`. Android (y otros launchers) recortan un ícono maskable con máscaras propias (círculo, squircle, etc.) que en el peor caso solo garantizan visible el 80% central del canvas — un círculo de radio `0.4 × ancho` centrado. Todas las formas del ícono actual (la tarjeta de 200×280, sus líneas internas, la insignia circular) se ubicaron a propósito dentro de ese círculo de seguridad (radio ~205px sobre un canvas de 512×512) para que no queden recortadas en ningún lanzador. Si se vuelve a tocar el ícono, mantener ese margen o volver a calcularlo.

**Limitación conocida, no resuelta**: Android suele cachear el ícono de una PWA instalada al momento de instalarla, independientemente del service worker. Es posible que el usuario necesite desinstalar y reinstalar la app (o esperar a que el sistema la actualice por su cuenta) para ver el ícono nuevo en la pantalla de inicio — no hay forma de forzarlo desde el código de la app.

## Confirmación visual de "gasto cargado" con un toast animado, no con una notificación push

**Decisión** (2026-07-26): pedido del usuario de "alguna animación muy simple" al cargar un gasto, para confirmar que quedó guardado. Se implementó como un toast (`#expenseToast`) con una animación CSS corta (~1.8s) que aparece arriba de la pantalla con un check y desaparece sola.

**Por qué esta forma y no otra**: no se evaluaron alternativas más pesadas (notificaciones del sistema, vibración, sonido) porque el pedido fue explícitamente "muy simple" y la app ya tenía un patrón de mensajes de estado con texto (`setReceiptStatus`) que no cumplía el pedido por sí solo (es un párrafo de texto fijo en la pantalla, no algo que capture la atención como una confirmación). El toast es puramente CSS (una sola clase `is-visible` con `@keyframes`), sin dependencias nuevas, y funciona igual en el formulario común y el personal. Respeta `prefers-reduced-motion` con un fundido simple en vez de la animación de escala/traslado.

## El autocompletado por foto/OCR escribe en el formulario del modo activo, no siempre en el común

**Decisión** (2026-07-29): `fillExpenseFromReceipt()` pasa a elegir los campos destino según `currentEntryMode` — si el usuario está en la pestaña Personales cuando saca la foto, el monto/fecha/descripción extraídos van al formulario personal; si está en Comunes, al común (comportamiento anterior).

**Por qué**: era un bug reportado por el usuario. `fillExpenseFromReceipt` escribía **siempre** en `#expenseAmount`/`#expenseDate`/`#expenseNote` (los campos del formulario común), sin mirar el modo. Estando en Personales, el OCR leía la factura correctamente pero llenaba el formulario oculto: el formulario personal quedaba vacío, así que al tocar "Agregar personal" el navegador rebotaba el submit por el `required` del monto y enfocaba ese campo. Desde afuera parecía que la app "pedía tipear el monto a mano", anulando el sentido de sacar la foto.

**Detalle relevante**: el flujo de dictado por voz (`fillExpenseFromVoice`) ya hacía esto bien, pero al revés — decide el modo a partir de lo que se dictó (`parsed.isPersonal`, por ejemplo si el usuario dice "personal"). Para el OCR no existe esa señal en el texto de un ticket, así que la única fuente de verdad razonable es el modo en el que el usuario ya está. **No confundir los dos flujos**: voz *cambia* el modo según el dictado, foto *respeta* el modo activo. Además, en modo personal se completa `#personalExpenseOwner` con el dueño del dispositivo si estaba vacío, porque ese campo también es `required` y hubiera producido el mismo rebote de submit.

**Nota sobre resúmenes de tarjeta**: esto no aplica al flujo de resúmenes (`detectDocumentType === "statement"`), que tiene su propia pantalla de revisión con tildes de común/personal por línea y no pasa por `fillExpenseFromReceipt`.

**Complemento imprescindible (2026-07-29, mismo día)**: respetar el modo activo **no alcanzaba**, porque el flujo natural del usuario es sacar la foto primero y decidir después si el gasto es común o personal. Ver la decisión siguiente.

## Al cambiar de pestaña Comunes/Personales, el gasto en progreso se traslada de formulario

**Decisión** (2026-07-29): cuando el usuario cambia de pestaña con un monto ya cargado en el formulario, los datos (monto, fecha, categoría, forma de pago, descripción y persona) se **mueven** al formulario del otro modo, y el de origen se limpia.

**Por qué**: el fix anterior (que el OCR escriba en el formulario del modo activo) no resolvió el problema real que reportó el usuario. La app arranca siempre en Comunes, así que la secuencia natural es: sacar la foto → el monto se carga en el formulario común → recién entonces darse cuenta de que es un gasto personal → cambiar de pestaña → **el formulario personal está vacío** y "Agregar personal" rebota pidiendo el monto a mano. Exactamente el mismo síntoma que el bug anterior, por una causa distinta. Se reprodujo con la factura real del usuario antes de tocar nada.

**Por qué mover y no copiar**: el gasto es uno solo; la pestaña define de qué *tipo* es, no crea un gasto nuevo. Si se copiara, quedarían los datos en los dos formularios y el usuario podría cargar el mismo gasto dos veces sin darse cuenta.

**Condición de disparo**: solo se traslada si el formulario de origen tiene un monto cargado (indicador de "hay un borrador en progreso"). Sin eso, cambiar de pestaña no toca nada — importante para no pisar los valores por defecto (por ejemplo la fecha) al navegar entre pestañas sin estar cargando nada.

**Detalles de implementación que no hay que romper**:
- El traslado corre **después** de `render()` dentro de `setEntryMode`. Es obligatorio en ese orden: `renderPeople()` resetea el pagador al dueño del dispositivo y `renderWeekLabel()` puede reescribir la fecha del formulario personal si cae fuera de la semana seleccionada. Si el traslado corriera antes (como en el primer intento), esos dos renders le pisarían la persona y potencialmente la fecha.
- Solo se traslada cuando el cambio de modo viene de un **click del usuario** en las pestañas (`setEntryMode(mode, { carryOverDraft: true })`). Los cambios de modo programáticos no trasladan: `fillExpenseFromVoice` llama `setEntryMode` sin el flag porque decide el modo según lo dictado y llena el formulario destino inmediatamente después; trasladar ahí arrastraría restos del otro formulario.
- `card`/`installments` no se trasladan porque solo existen en el formulario personal. Al pasar a personal se llama `updatePersonalCardFieldsVisibility()` por si la forma de pago trasladada es "Tarjeta de crédito".
- La persona se traslada entre un `<select>` (pagador común) y un `<input type="text">` (dueño personal); `setFieldValue` distingue el tipo y, para el select, solo asigna si el nombre existe como opción.

## Preprocesar la imagen en `<canvas>` antes de Tesseract, no delegar el OCR a una IA

**Decisión** (2026-07-29, mismo día): después del fix del traslado de formulario, el usuario probó de nuevo con la misma factura real y el monto extraído fue `$88.00` — sin relación con el ticket. Sugirió usar algún tipo de IA para leer mejor la imagen.

**Diagnóstico antes de decidir**: la imagen se le pasaba a Tesseract **sin ningún preprocesamiento** — el `File` crudo de `<input type="file" capture="environment">` (la cámara del celular) directo a `Tesseract.recognize()`. Eso es conocido por degradar mucho la precisión: fotos de cámara vienen en resoluciones muy altas (3000-4000px+), con orientación EXIF que no se aplica a los píxeles si nadie la lee, y contraste disparejo por luz ambiente — nada de eso pasa con una imagen ya recortada/limpia como con la que se había probado la sesión anterior, que por eso funcionó en la prueba de escritorio pero no en el celular real.

**Se evaluaron dos caminos**:
- *Delegar el OCR a un modelo de IA con visión* (lo que sugirió el usuario): más preciso en teoría, pero es un cambio de arquitectura real — la app no tiene backend, así que usar una API de IA implica exponer una API key en el código público del repo (mismo riesgo que ya existe con Supabase, pero acá con costo por uso en vez de gratis) o armar un servidor intermedio que hoy no existe. Se le explicó el trade-off al usuario antes de avanzar.
- *Preprocesar la imagen con `<canvas>` antes de Tesseract* (elegida): reorientar según EXIF (`createImageBitmap(file, { imageOrientation: "from-image" })`, soportado en Chrome/Android), redimensionar al lado largo a 2000px si es más grande, pasar a escala de grises y subir contraste (`prepareImageForOcr()` en `app.js`). Es la mejora estándar y documentada para precisión de Tesseract con fotos (no con escaneos), no agrega dependencias ni backend, y ataca directamente las tres causas identificadas.

**Se probó primero lo más simple porque es gratis y no compromete arquitectura**; si no alcanza, la conversación sobre usar IA con visión queda para retomar con los trade-offs ya explicados.

**Verificado**: con la factura real del usuario (ya en el proyecto, sin commitear) el monto se sigue extrayendo bien después del preprocesamiento (no hubo regresión). Con una versión de esa misma imagen escalada a 3000×4000 (resolución típica de cámara) para simular el caso real, el pipeline completo (redimensionar → escala de grises/contraste → Tesseract → extracción → formulario personal) funciona de punta a punta en ~300ms de preprocesamiento. **Lo que no se pudo verificar**: el caso exacto que falló en el celular del usuario, porque no hay forma de acceder a esa foto ni de reproducir con certeza qué la hizo fallar tan mal (`$88.00` sin relación con el ticket sugiere una imagen mucho más degradada que cualquiera de las probadas acá). Si el preprocesamiento no alcanza, el próximo paso es conseguir esa foto puntual para diagnosticar con datos reales en vez de suponer.

## Presupuestos separados por modo (`budgets` + `personalBudgets`), no un set compartido

**Decisión** (2026-07-29): los presupuestos por categoría pasan a ser **dos sets independientes** — `state.budgets` para gastos comunes y `state.personalBudgets` para personales — cada uno con su propio timestamp de sincronización (`budgetsUpdatedAt`/`personalBudgetsUpdatedAt`). La pestaña activa determina cuál se muestra y cuál se edita.

**Por qué esta forma y no la alternativa más chica**: el usuario pidió "hacé lo mismo con los presupuestos" después de que el panel "Por categoría" pasara a respetar el modo. Había dos caminos y **se le preguntó explícitamente** porque este toca datos persistidos y sincronizados:
- *Mismo límite, consumo por modo* (cambio de una línea, sin tocar el modelo): descartada por el usuario. El problema conceptual es que un solo límite de, por ejemplo, $50.000 en Farmacia se compararía contra dos consumos distintos según la pestaña, sin que quede claro si el límite es para comunes, para personales o para la suma.
- *Límites separados* (elegida): un presupuesto de Farmacia para gastos comunes del hogar y otro distinto para gastos personales son conceptos genuinamente distintos, y es la separación real que el usuario venía pidiendo.

**Migración**: ninguna necesaria. `budgets` sigue significando lo mismo que antes (comunes), así que los presupuestos que el usuario ya tenía cargados quedan como los comunes; `personalBudgets` arranca vacío.

**Compatibilidad con un dispositivo que todavía tenga la versión vieja** (importante, ya verificado): un celular con código previo a este cambio no incluye `personalBudgets` en el payload que sube a Supabase. Cuando el dispositivo actualizado hace pull de ese estado, `remote.personalBudgetsUpdatedAt` vale `0`, así que **gana el local** y los presupuestos personales no se pierden; en el siguiente push vuelven a subir. No hace falta coordinar que los dos celulares se actualicen al mismo tiempo. Es el mismo comportamiento auto-recuperable que ya tenía `budgets`.

**Dónde se lee el modo**: `getActiveBudgets(isPersonal)` centraliza la elección del set. `handleBudgetSubmit`/`handleBudgetListClick` deciden por `currentEntryMode` (no reciben el flag) porque son handlers de eventos, no parte del pipeline de render. Si se agrega otro lugar que toque presupuestos, usar `getActiveBudgets()` y no leer `state.budgets` directo.

**Detalle de UX a no perder**: el panel de Presupuestos vive en Configuración, que es un overlay que tapa el switch Comunes/Personales. Sin una indicación explícita, el usuario no sabría de qué modo son los límites que está editando. Por eso la leyenda `#budgetPanelNote` se escribe desde JS diciendo "para los gastos comunes" / "para tus gastos personales", y el estado vacío también distingue ("Sin presupuestos comunes cargados." / "Sin presupuestos personales cargados."). Si en algún momento se rediseña Configuración, mantener esa señal.
