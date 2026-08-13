# Resumen de sesiones

Bitácora cronológica de trabajo en el proyecto. Se actualiza automáticamente al cerrar cada funcionalidad o fix importante (agregar una entrada nueva arriba de todo, con fecha).

**Relación con `CODEX_CONTEXT.md`**: ese archivo es la memoria detallada que usa específicamente Codex (con instrucciones de `AGENTS.md` para leerlo/actualizarlo). Este archivo (`docs/session-summary.md`) es el equivalente pensado para cualquier agente, incluido Claude Code, y es el que se mantiene al día de acá en adelante por instrucción del usuario. No se duplica contenido innecesariamente: las entradas de antes del 2026-07-20 están condensadas acá (el detalle completo, línea por línea, sigue en `CODEX_CONTEXT.md`); de acá en adelante este archivo tiene el registro completo.

---

## 2026-08-09 (2) — Gráfico mensual en Resumen + totales y agrupación por persona en Movimientos

Dos pedidos del usuario en la misma sesión:

**1) El gráfico de Resumen (barras/torta) solo mostraba la semana, y una semana sola no aporta mucho dato.** Se agregó un segundo toggle "Semana / Mes" junto al de Barras/Torta en el panel de gráfico, con la misma apariencia (reutiliza `.chart-toggle`). Nueva variable `chartPeriod` ("week" | "month"); en `render()`, si está en "month" se recalcula con `getMonthExpensesFrom()` (que ya existía, la usaba el panel "Vista mensual") sobre la lista completa del modo activo, en vez de la semana filtrada. La leyenda de texto arriba del gráfico ("Visualizá cómo se reparte...") cambia de "de la semana" a "del mes", y el mensaje de gráfico vacío también ("Sin datos para graficar esta semana/este mes"). No se tocó el panel "Por categoría" de la pestaña Cargar (semanal, sin pedido de cambiarlo) para no meter alcance de más.

**2) En Movimientos, filtrar no daba ninguna sumatoria, y los gastos aparecían intercalados por fecha sin poder agruparlos por persona.** Se agregó una barra de herramientas (`.movement-toolbar`) arriba de la lista, en **ambas** secciones (Comunes y Personales, ya que comparten la misma función de render `renderMovementGroups`), con:

- Toggle "Agrupar por: Día / Persona". Agrupando por persona, cada grupo muestra el subtotal en el encabezado (`groupExpensesByTag()`, nueva, análoga a la `groupExpensesByDay()` que ya existía) y las filas dejan de repetir el tag de persona (ya está en el encabezado) pero muestran la fecha, que agrupando por día no hacía falta.
- Resumen de totales (`renderMovementSummary()`, nueva): total y cantidad de gastos, más un desglose en chips por persona y por categoría — se recalcula siempre a partir de la lista ya filtrada (`filteredExpenses` en Comunes, que ya pasaba por los filtros existentes de búsqueda/persona/categoría/forma de pago), así que responde exactamente al pedido de "sumatoria cuando filtro por categoría o usuario". Se oculta si el filtro no deja ningún gasto.

Ambos controles son independientes del gráfico: `movementGroupBy` es una variable de módulo separada de `chartPeriod`, y ninguno persiste entre sesiones (se resetea a los valores por defecto al recargar, igual que `chartType` ya hacía).

**Probado en el navegador** con `supabase-config.js` stubeado y `localStorage` limpiado después: el toggle semana/mes cambia correctamente el desglose cuando hay gastos en otras semanas del mismo mes (verificado con 3 categorías en agosto repartidas en dos semanas distintas); agrupar por persona en Comunes muestra "EZE $28.000 / TAMI $5.000" con las filas sin tag duplicado y con fecha visible; el resumen de totales coincide con lo filtrado y se recalcula al aplicar/limpiar filtros; se oculta cuando el filtro no matchea nada; funciona igual en Personales. A 375px los dos toggles del gráfico se apilan en columna sin overflow horizontal.

Service worker v26→v27.

---

## 2026-08-09 — Cerrar la semana: confirmación, estado visible, deshacer y aviso de cierre desactualizado

Pedido del usuario: "cuando indico una semana como saldada, no hay nada que me confirme que el comando fue aceptado. Además me sigue apareciendo el resumen, lo cual es confuso, porque parece que no hubiese saldado la semana".

**Diagnóstico**: el problema de fondo era peor que la falta de feedback — **el estado "saldada" no existía en la pantalla Resumen**. `handleSettleWeek()` guardaba el registro y llamaba a `render()`, pero ni `renderSummary()` ni `renderSettlementDetail()` consultaban `state.settlements`, así que el bloque "Para emparejar" seguía diciendo "Eze le pasa $X a Tami" como si nada. No era un problema de refresco: la pantalla literalmente no sabía que la semana estaba cerrada. El único rastro estaba en la pestaña Historial. Tampoco había forma de deshacer un cierre, ni aviso si el cierre quedaba desactualizado.

Se le ofrecieron tres alcances y eligió el más completo, más mantener el desglose visible después de saldar.

**Lo que se hizo:**

1. **Diálogo de confirmación previo** con el detalle real del cierre ("Cerrar la semana del 03/08 al 09/08. Total: $25.000. Tami le pasa $12.500 a Eze. ¿Confirmás?").
2. **Toast** al cerrar ("Semana saldada" / "Cierre actualizado" / "Semana reabierta"), igual que al cargar un gasto.
3. **Estado visible**: el bloque pasa a "Semana saldada ✓ · Tami le pasó $X a Eze · Cerrada el 09/08 · total $Y", con fondo oscuro en vez del rojo de llamada a la acción, y el botón principal cambia a "Ver en Historial".
4. **Deshacer**: botón nuevo que reabre la semana.
5. **Aviso de cierre desactualizado**: si después de saldar cambian los gastos de esa semana, el bloque se pone ámbar, avisa "Cerraste esta semana el 09/08 por $20.000, pero desde entonces cambió a $25.000" y el botón pasa a "Actualizar cierre". `getSettlementStatus()` compara total, monto y deudor guardados contra los actuales.
6. **Detalle del cierre**: se sigue viendo el desglose (pedido explícito) pero con un sello "Saldada" / "Cierre desactualizado" y una bajada que aclara que ya no es una cuenta pendiente.

**Decisión de sincronización importante** (la parte delicada): "Deshacer" **tombstonea** el cierre (`deletedAt`) en vez de sacarlo del array, para que la reapertura viaje a los otros dispositivos igual que el borrado de un gasto. Como `mergeRecordLists` nunca "des-borra" (una vez con `deletedAt`, queda borrado para siempre), volver a saldar esa semana **crea un `id` nuevo** en vez de reusar el viejo, y el registro tombstoneado se conserva en el array. `dedupeSettlementsByWeek()` (que ya existía en `mergeCloudState`) se queda con el de `updatedAt` más nuevo, así que gana el cierre vivo. Verificado explícitamente en la prueba.

**Probado en el navegador** con `supabase-config.js` stubeado y `localStorage` limpiado después: cancelar el diálogo no guarda nada; confirmar muestra el toast, cambia el bloque, pone el sello y navega al Historial donde figura el registro; volver a Resumen mantiene el estado; cargar un gasto después deja el cierre desactualizado con los dos montos; "Actualizar cierre" reusa el mismo `id`; "Deshacer" tombstonea y vacía el Historial; volver a saldar genera `id` nuevo conviviendo con el tombstone. A 375px los dos botones entran en la misma fila sin superponerse y sin overflow (hubo que agregarle `width: fit-content` al sello, porque `.panel-heading` pasa a columna en móvil y lo estiraba a los 318px del ancho completo).

Service worker v25→v26.

---

## 2026-08-07 (2) — Fix: la tira recordatoria de cuotas aparecía en modo Comunes

El usuario reportó: "el gasto de tarjetas cargado en personal, se ve también en la pestaña de comunes". No era el gasto en sí — `expenses` y `personalExpenses` siempre estuvieron bien separados (verificado en `getCurrentWeekExpenses`/`getCurrentWeekPersonalExpenses`, cada una filtra su propia lista) — era la **tira recordatoria** de la vista Cuotas (agregada el 2026-08-06), que se mostraba en Cargar y Resumen mirando solo `currentAppView`, sin importar si el switch Comunes/Personales estaba en un modo o el otro.

Esto había sido una decisión deliberada del día anterior ("que te encuentre a vos"), pero en la práctica confunde: mezcla info de gastos personales en el contexto de comunes. Se corrigió agregando `currentEntryMode === "personal"` a la condición en `renderInstallmentsReminder()`. Verificado en el navegador: la tira aparece en Cargar/Resumen en modo Personales, desaparece al cambiar a Comunes (en las dos vistas) y vuelve a aparecer al volver a Personales. Detalle actualizado en `decisions.md`. Service worker v24→v25.

---

## 2026-08-07 — Fix: la barra de navegación de abajo tapaba el contenido en el celular

El usuario mandó una captura del celular: la barra fija de abajo se había partido en dos filas (con "Cuotas" solo en la segunda) y tapaba el detalle de la lista de movimientos.

**Dos causas, las dos del cambio del día anterior:**

1. **`.is-hidden` no ocultaba los botones de la nav.** `.app-tabs button` (línea ~420 de `styles.css`) define `display: inline-flex`, y con especificidad (0,1,1) le gana a `.is-hidden` (0,1,0) sin importar el orden en el archivo. O sea que "Historial" nunca se ocultó realmente en modo personal — era un bug latente desde el 2026-07-20 que no se notaba porque con 4 botones en una grilla de 4 columnas nada se rompía visualmente. Al agregar el 5to botón (Cuotas), la grilla pasó a 2 filas. Se agregó `.app-tabs button.is-hidden { display: none; }`.
2. **El badge de la pestaña Cuotas sumaba una fila más.** En móvil los botones de la barra son `flex-direction: column` (ícono arriba, texto abajo), así que el badge se apilaba como tercer hijo y agrandaba la barra. Ahora va `position: absolute` arriba a la derecha del ícono, como un badge de verdad.

**Lección que conviene no repetir**: en la verificación del 2026-08-06 se chequeó que la clase `is-hidden` estuviera aplicada (`classList.contains`) y se filtraron los botones ocultos con JS antes de medir — o sea que se verificó el estado del DOM, no lo que se veía. Para cualquier cosa de layout hay que medir con `getComputedStyle(el).display` y `getBoundingClientRect()` de **todos** los elementos, no solo de los que se esperan visibles. Con eso ahora se confirmó: 4 botones en una sola fila (todos con `top: 755`), barra de 65px contra los 88px de `padding-bottom` del shell (no tapa nada), el oculto realmente en `display: none`, y el badge de 17×17 sobre el ícono. Verificado en los dos modos, a 375px, con `supabase-config.js` stubeado y el `localStorage` limpiado después.

Service worker v23→v24.

---

## 2026-08-06 — Vista "Cuotas": rediseño completo del seguimiento de compras en cuotas

Pedido del usuario: "cada consumo de tarjeta en cuotas, pasadas unas semanas me olvido que lo hice, o pasados unos meses me olvido que todavía tengo cuotas pendientes de ese gasto. El método que existe hoy no me funciona."

**Diagnóstico de por qué fallaba el panel del 2026-07-20** (era correcto pero insuficiente): (1) vivía dentro de Movimientos → Personales, o sea había que ir a buscarlo; (2) solo mostraba el mes actual — nunca decía cuánto faltaba pagar en total ni hasta cuándo, que es justo el olvido que describía el usuario; (3) no proyectaba a futuro; (4) el campo de cuotas estaba escondido detrás del `<details>` "+ Más detalles", así que era fácil cargar la compra sin marcarla y perder el rastro desde el minuto cero.

**Decisiones tomadas con el usuario antes de codear**: cuotas fijas (total ÷ cantidad, como ya era); vista completa nueva en vez de parchear el panel; no hay compras viejas que migrar (arranca de cero). Se descartó el badge en el ícono de la PWA (`setAppBadge`) — se le ofreció y eligió la opción sin eso.

**Lo que se hizo:**

1. **Pestaña "Cuotas" nueva** que ocupa la misma ranura que "Historial" (Historial es solo de gastos comunes, Cuotas solo de personales, así que se turnan y la nav sigue teniendo 4 botones). Contiene: cuánto se paga este mes, **cuánto falta pagar en total y en qué mes termina** (el número que antes no existía), desglose por tarjeta, **proyección de los próximos 12 meses** con barras, lista de compras activas con barra de progreso "cuota N/M" + pagado/restante + mes de fin, y un panel de "recién terminadas" (últimos 3 meses) para ver qué plata se liberó.
2. **Tira recordatoria** arriba de todo en Cargar y Resumen ("Cuotas de este mes: $X · N compras activas · te falta pagar $Y"), que lleva a la vista. Es lo que hace que la info te encuentre a vos en vez de al revés. Se muestra también en modo Comunes a propósito: el objetivo es que no se olvide, no que sea coherente con la pestaña activa.
3. **Badge numérico** con la cantidad de compras activas en la pestaña Cuotas.
4. **Carga imposible de pasar por alto**: las cuotas salieron del `<details>` y ahora hay un toggle grande "Compra en cuotas con tarjeta" en el formulario personal, que al activarse setea la forma de pago sola, arranca en 3 cuotas y despliega tarjeta + chips (1/3/6/9/12/18) + "otra cantidad". Preview en vivo mientras se carga ("6 cuotas de $20.000 · de May 2026 a Oct 2026") y el toast de confirmación repite ese dato.
5. **`firstInstallmentMonth` nuevo** (mes del primer vencimiento, "YYYY-MM"): arregla el desfase que quedó anotado como trade-off el 2026-07-20 entre la fecha de compra y el resumen real de la tarjeta. Se autocompleta con el mes de la compra y queda editable; si el usuario lo toca a mano, cambiar la fecha ya no se lo pisa.

Se sacó el panel viejo `#pendingInstallmentsPanel` de Movimientos (lo reemplaza la vista nueva, no tenía sentido duplicarlo). Service worker v22→v23.

**Probado en el navegador con `supabase-config.js` stubeado** (backup + restaurado exacto al final, verificado con `git status`), y con el `localStorage` del pane limpiado antes de restaurar las credenciales para que no quedaran datos de prueba que después se sincronizaran solos. Casos verificados: carga de una compra con fecha 3 meses atrás → "cuota 4/6", $20.000/mes, faltan $60.000; una segunda compra de 12 cuotas arrancando este mes → totales agregados correctos ($50.000 este mes, $420.000 de deuda, termina julio 2027) y la proyección baja de $50.000 a $30.000 justo cuando termina la primera; una compra ya terminada aparece en "recién terminadas" con los $10.000/mes liberados; editar desde la vista Cuotas prellena bien todo; cambiar a Comunes oculta la pestaña y cierra la vista; estado vacío correcto; a 375px no hay overflow horizontal y los chips quedan de 91×44px (en mobile pasan a 3 columnas, con 6 quedaban de 43px, muy chicos para el dedo).

**Nota de entorno**: el Browser pane corta las respuestas grandes sin comprimir — `app.js` (129 KB) fallaba sistemáticamente con `ERR_CONNECTION_RESET` mientras `styles.css` (42 KB) e `index.html` (36 KB) cargaban bien, y `curl` bajaba el archivo entero sin problema. Es el mismo síntoma que se anotó el 2026-08-03 y se atacó comentando los scripts externos; **la solución real es servir todo gzippeado**. Queda un `scratchpad/gzserver.py` de referencia (server estático mínimo con `gzip.compress` + `Content-Encoding: gzip`); con eso la app cargó a la primera. También conviene desregistrar el service worker en el pane, que compite por el server single-threaded.

---

## 2026-08-03 — Editar gastos desde Movimientos + fix de configuración de dispositivo

Dos pedidos del usuario en la misma sesión.

**1) Editar un gasto o su propietario desde Movimientos, sin borrar y recargar.** Antes de tocar código se revisó el impacto en el merge de sincronización, porque `decisions.md` tenía anotado explícitamente "si se agrega edición, hay que revisar el merge" desde que se documentó esa limitación. Buena noticia: `mergeRecordLists` ya resuelve cada gasto por `id` comparando `updatedAt` de todo el registro (el mismo mecanismo que ya usa para altas/bajas), así que una edición no requiere ningún cambio ahí — se verificó explícitamente simulando una edición local más nueva que la remota, y viceversa, antes de dar el análisis por cerrado.

Implementación: botón "✎" nuevo junto al de borrar en cada fila de Movimientos (común y personal), que reutiliza el formulario de Cargar en modo edición en vez de duplicar UI. `editingExpense` (variable global, `{ id, type }`) trackea si hay una edición en curso. `startEditingExpense()` cambia a la pestaña Cargar, prellena todos los campos (incluida tarjeta/cuotas para personales) y cambia el título/botón del panel ("Editar gasto" / "Guardar cambios") más un botón "Cancelar edición" nuevo. Al guardar, el submit actualiza el registro por `id` (mismo `createdAt`, `updatedAt` nuevo) en vez de crear uno nuevo, y navega a Movimientos para ver el resultado. Al cancelar, se descarta todo sin guardar nada.

Un detalle que se pensó a propósito: cambiar de pestaña Comunes/Personales en medio de una edición **cancela la edición** en vez de dispararle el traslado de borrador que ya existía (agregado el 2026-07-29 para el flujo de "cargar" normal). Un registro que se está editando tiene un tipo fijo; mezclarlo con el mecanismo de traslado (pensado para un gasto nuevo que todavía no decidió su tipo) hubiera dejado estados ambiguos. Se verificó explícitamente que cambiar de pestaña a mitad de una edición cancela limpio, sin arrastrar valores.

Probado en el navegador con Supabase mockeado: editar un gasto común (monto, categoría, nota y **pagador**, que era el pedido específico) actualiza el mismo registro sin duplicarlo; editar un gasto personal con tarjeta/cuotas prellena y guarda bien esos campos también; cancelar deja el original intacto; cambiar de pestaña a mitad de edición cancela sin efectos raros; el traslado de borrador y el borrado normal siguen funcionando sin interferencia. Sin errores de consola.

**Nota sobre el entorno de prueba**: hoy la carga de `app.js` en el Browser pane falló de forma mucho más persistente que otras veces (varios reintentos con `ERR_ABORTED`/`ERR_CONNECTION_RESET`, incluso en un servidor nuevo en otro puerto) — confirmado con `curl` desde Bash que los CDN externos sí eran alcanzables, así que no era una caída real de internet, sino algo puntual del sandbox del navegador. Se resolvió comentando temporalmente los 3 `<script>` externos (pdfjs, tesseract.js, supabase-js) en `index.html` — la función de editar gastos no depende de ellos — y restaurándolos exactamente antes de commitear (verificado con `git diff` que quedaron idénticos al original). Dejar esta técnica anotada para la próxima vez que la carga esté especialmente terca: es más confiable que solo reintentar navegar.

**2) "Tami tiene que reseleccionar su nombre cada vez que carga un gasto."** Antes de tocar código se le preguntó al usuario si en el celular de Tami el campo "Este dispositivo es de" (Configuración → Hogar y dispositivo) estaba puesto en "Tami" — confirmó que estaba mal puesto, en "Eze". No era un bug: `getDeviceOwner()`/`mergeCloudState` (que nunca sincroniza `deviceOwner`, a propósito) funcionan como corresponde; simplemente faltaba esa configuración de una vez por dispositivo. Sin cambios de código, solo se le indicó corregirlo ahí.

Se subió la versión del service worker (v21→v22) por el cambio de edición.

## 2026-07-29 — Cierre de sesión: modo Personales de punta a punta (foto, categorías, presupuestos)

Sesión larga con varias vueltas de ida y vuelta con el usuario, todas alrededor del mismo eje: **el modo Personales tenía huecos donde se colaban datos o comportamiento de Comunes**. Resumen de las 5 entradas de hoy (detalle completo abajo, en orden cronológico inverso):

1. **Fix inicial**: la foto/OCR completaba siempre el formulario común, y el panel "Por categoría" mostraba datos comunes con leyenda fija incluso en modo personal. Commit `efbee55`.
2. **Presupuestos separados por modo**: a pedido explícito del usuario, `state.budgets` (comunes) y `state.personalBudgets` (personales) pasan a ser dos sets independientes con su propio timestamp de sync — el único cambio de la sesión que tocó el modelo de datos sincronizado, y se le preguntó al usuario entre dos alternativas antes de implementarlo. Commit `ebeb92c`.
3. **El fix de la foto no alcanzaba**: el usuario probó con una factura real y seguía sin funcionar. Se diagnosticó con la imagen real (no adivinando) y la causa era otra: la app arranca en Comunes, así que sacar la foto y *después* cambiar a Personales dejaba el formulario destino vacío. Se agregó que el borrador se traslade de formulario al cambiar de pestaña. Commit `085d75a`.
4. **Tampoco alcanzaba**: con el traslado ya funcionando, el celular real seguía sin poder leer el monto (`$88.00` sin relación con el ticket). Causa: la imagen de la cámara se le pasaba a Tesseract sin ningún preprocesamiento (resolución altísima, orientación EXIF sin aplicar, contraste disparejo). Se agregó `prepareImageForOcr()` — reorienta, redimensiona y sube contraste con `<canvas>` antes del OCR. El usuario sugirió resolverlo con una API de IA con visión; se le explicó el trade-off (expondría una key en el repo público, o requeriría un backend que hoy no existe) y se acordó probar primero la mejora gratuita. Commit `ae2cfd7`.
5. **Confirmado por el usuario en su celular real** que el preprocesamiento resolvió el problema. Commit `811932b`.

**Patrón que vale la pena recordar para la próxima vez que se reporte "esto no anda"**: acá hicieron falta *tres* fixes encadenados para un solo síntoma reportado ("la foto no completa el gasto personal"), cada uno descubierto porque el anterior no alcanzaba. Ninguno de los tres se adivinó — los dos últimos se diagnosticaron corriendo el código real (`extractExpenseFromReceiptText`, `Tesseract.recognize`) contra la foto real que el usuario dejó en el proyecto para ese fin, no contra suposiciones. Cuando el síntoma es "no funciona" sin mensaje de error claro, conseguir el archivo/dato real antes de tocar código ahorró varias vueltas en falso.

La factura de prueba (documento fiscal real, con CUIT y CAE) nunca se commiteó y se borró al cierre de la sesión.

## 2026-07-29 (continuación) — Preprocesar la foto antes de Tesseract (el fix del traslado no alcanzaba)

Después del fix anterior (traslado de formulario al cambiar de pestaña), el usuario probó de nuevo **con la misma factura real** en su celular: esta vez sí lo llevó al formulario personal correcto, pero el monto que completó fue **`$88.00`**, sin ninguna relación con el ticket ($70.719,29 real). El status decía "Completé descripción" — el monto y la fecha no se habían podido extraer en absoluto, y lo que apareció como "$88.00" probablemente era ruido de OCR mal interpretado como número.

Se pidió al usuario que guardara la foto que había fallado para diagnosticar con datos reales (había fallado dos veces ya asumiendo cosas sin la imagen real). Guardó sin querer la misma factura de antes (mismo tamaño de archivo, misma fecha de modificación) — quedó pendiente conseguir la foto puntual que produjo el `$88.00`, pero mientras tanto se identificó una causa raíz real y comprobable revisando el código: **la imagen se le pasaba a Tesseract completamente cruda**, tal cual sale de `<input capture="environment">` (la cámara del celular), sin ningún preprocesamiento. Eso es una causa conocida de mala precisión de OCR: fotos de cámara vienen en resoluciones muy altas (3000-4000px+), con orientación EXIF sin aplicar a los píxeles, y contraste disparejo por luz ambiente. Nada de eso pasaba con el archivo ya recortado/limpio con el que se había probado la sesión anterior en escritorio — por eso esa prueba funcionó pero el celular real no.

El usuario sugirió usar algún tipo de IA para leer la imagen. Se le explicó el trade-off antes de avanzar por ahí: la app no tiene backend, así que una API de visión implicaría exponer una key en el repo público (como ya pasa con Supabase, pero con costo por uso) o construir un servidor que hoy no existe — un cambio de arquitectura real, no algo para decidir a la ligera. Se acordó probar primero la mejora estándar y gratuita (mejor preprocesamiento de imagen) antes de considerar ese camino.

**Fix**: `prepareImageForOcr()` en `app.js` — antes de pasarle la imagen a Tesseract, se la dibuja en un `<canvas>` respetando la orientación EXIF (`createImageBitmap(file, { imageOrientation: "from-image" })`, bien soportado en Chrome/Android), se la redimensiona si el lado largo supera 2000px, y se la pasa a escala de grises con contraste aumentado (factor 1.4). `extractTextFromDocument` ahora llama a esto antes de `Tesseract.recognize`.

**Verificado en el navegador con Supabase mockeado** (revertido antes de commitear):
- Con la factura real del usuario: el monto sigue extrayéndose bien después del preprocesamiento (`70719.29`), sin regresión.
- Simulando el caso real: se escaló esa misma imagen a 3000×4000 (resolución típica de cámara) y se corrió el pipeline completo (`processDocumentFile`) de punta a punta — preprocesar tardó ~300ms, y terminó completando monto y fecha correctos en el formulario personal.
- Sin errores de consola.

**Lo que no se pudo verificar en el momento**: el caso exacto que había fallado en el celular, porque no se consiguió la foto real que produjo `$88.00` (se guardó por error la misma de antes). **Confirmado por el usuario después**: probó de nuevo en el celular real y esta vez funcionó — el preprocesamiento resolvió el problema real, no solo el simulado.

## 2026-07-29 (continuación) — El gasto en progreso ahora se traslada al cambiar de pestaña (cierra el bug del OCR personal)

El usuario reportó que el fix del OCR **seguía sin funcionar**: sacó foto a una factura real (Colorshop, $70.719,29) y el monto no se autocompletaba. Se diagnosticó en capas antes de tocar código, y la causa real era distinta a la que se había arreglado.

**Diagnóstico** (el usuario dejó la foto en el proyecto para poder probar con el caso real):
1. Se descartó el parser de montos: la factura usa coma para miles y punto para decimales (`70,719.29`, formato inglés en vez del argentino), pero `parseReceiptAmount` ya lo manejaba bien.
2. Se corrió el **OCR real de Tesseract sobre la foto del usuario** y se inspeccionó el texto crudo. Salió bastante sucio (`"me"`, `"<> ho,"`, `"Efvo $ 7071929"` sin separadores), pero la línea del total se leyó perfecta: `"ora Venc. CAE: 7/08/2026 TOTAL 70,719.29"`. Con ese texto, `extractExpenseFromReceiptText` devolvía correctamente monto `70719.29` y fecha `2026-07-28`.
3. Se verificó que producción (GitHub Pages) ya tenía la v18 con el fix del modo — no era cache viejo.
4. **Se reprodujo el bug**: la app arranca siempre en Comunes, así que la secuencia real del usuario es sacar la foto (el monto se carga en el formulario **común**) y *después* darse cuenta de que es personal y cambiar de pestaña, donde el formulario está vacío. El fix anterior solo cubría "ya estoy en Personales antes de sacar la foto".

**Solución**: al cambiar de pestaña con un monto ya cargado, el borrador se **mueve** al formulario del otro modo (monto, fecha, categoría, forma de pago, descripción y persona) y el de origen se limpia. Se mueve en vez de copiarse para que el usuario no pueda cargar el mismo gasto dos veces. Solo se dispara si hay un monto cargado, así navegar entre pestañas sin estar cargando nada no toca los valores por defecto. Y solo con clicks del usuario en las pestañas: el dictado por voz sigue llamando `setEntryMode` sin el flag, porque él decide el modo según lo dictado.

**Detalle no obvio que costó un intento**: el traslado tiene que correr **después** de `render()` dentro de `setEntryMode`. En el primer intento corría antes y `renderPeople()` le pisaba la persona trasladada (resetea el pagador al dueño del dispositivo) — se detectó en la prueba porque al pasar un gasto de Tami de personal a común el pagador volvía a Eze.

**Verificado en el navegador con Supabase mockeado** (revertido antes de commitear), con el texto OCR real de la factura del usuario: el escenario completo (foto en Comunes → cambiar a Personales → guardar) deja el monto correcto, cero campos inválidos en el submit y el formulario común limpio; el caso inverso también traslada bien incluida la persona; cambiar de pestaña sin datos no altera nada; y los dos flujos de dictado por voz (común y personal) siguen intactos. Sin errores de consola.

**Nota**: la factura de prueba quedó en la carpeta del proyecto pero **no se commiteó** — es un documento fiscal real (CUIT, CAE, número de comprobante) y el repo de GitHub es público. Se usó para diagnosticar el fix siguiente y se borró al cierre de la sesión, a pedido del usuario.

## 2026-07-29 (continuación) — Presupuestos separados por modo (comunes vs. personales)

Siguiendo el fix anterior, el usuario pidió "hacé lo mismo con los presupuestos". A diferencia del panel "Por categoría" (que era solo lectura y se resolvió con un cambio de una línea), los presupuestos son **datos persistidos y sincronizados**, así que había dos caminos con consecuencias distintas y **se le preguntó al usuario** antes de tocar el modelo: (a) un solo set de límites con el consumo calculado según el modo, o (b) dos sets separados. Eligió (b), límites separados.

**Cambio de modelo de datos**: se agregó `state.personalBudgets` (objeto `{ categoría: monto }`) y `state.personalBudgetsUpdatedAt`, en paralelo a los `budgets`/`budgetsUpdatedAt` que ya existían y que ahora significan explícitamente "presupuestos comunes". Tocó `defaultState`, `loadState`, `normalizeState` (con `sanitizeBudgets` reutilizado) y `mergeCloudState` (un `personalBudgetsWinner` propio con last-write-wins independiente, así editar los comunes no pisa los personales ni al revés). No hizo falta migración: los presupuestos que el usuario ya tenía cargados siguen siendo los comunes, y `personalBudgets` arranca vacío.

**UI**: `renderBudgets(summaryExpenses, isPersonal)` ahora muestra el set del modo activo con el consumo del modo activo; `handleBudgetSubmit`/`handleBudgetListClick` escriben y borran en el set correcto según `currentEntryMode`; y se centralizó la elección en `getActiveBudgets()`. Se agregó la leyenda `#budgetPanelNote` porque el panel de Presupuestos vive en Configuración, que es un overlay que tapa el switch Comunes/Personales — sin eso el usuario no sabría de qué modo son los límites que está editando. El estado vacío también distingue entre "Sin presupuestos comunes cargados." y "Sin presupuestos personales cargados.".

**Verificado en el navegador con Supabase mockeado** (revertido antes de commitear), simulando el escenario real del preview que eligió el usuario (Farmacia con límite común de $50.000 y personal de $30.000, con gastos en ambos modos):
- Cada modo muestra su propio límite y su propio consumo, con la leyenda correcta.
- Cargar un presupuesto personal desde el formulario real no toca los comunes.
- **Borrar en un modo no afecta al otro** (probado en ambas direcciones) — era el riesgo principal del cambio.
- Round-trip por `localStorage` y por backup JSON preserva `personalBudgets` y su timestamp.
- **Merge contra un remoto de la versión vieja** (sin el campo): los presupuestos personales locales sobreviven, porque `remote.personalBudgetsUpdatedAt` vale 0 y gana el local. No hace falta que los dos celulares se actualicen al mismo tiempo.
- Merge contra un remoto más nuevo: gana el remoto, como corresponde.
- El payload de sincronización incluye los 4 campos de presupuestos. Sin errores de consola.

Los presupuestos siguen sin agrupar categorías de comida (`groupFood: false`), igual que antes — no se cambió.

## 2026-07-29 — Fix: la foto/OCR no autocompletaba el gasto personal, y "Por categoría" ignoraba el modo

Dos problemas reportados por el usuario usando la app en su celular, ambos en la pestaña Personales.

**1. El OCR leía bien la factura pero no autocompletaba el formulario personal.** El usuario sacó foto a una factura estando en Personales; el texto se leyó correctamente, pero al tocar "Agregar personal" la app lo mandaba al campo de monto vacío, obligándolo a tipearlo a mano — justo lo que la foto venía a evitar. Causa: `fillExpenseFromReceipt()` escribía **siempre** en los campos del formulario común (`#expenseAmount`/`#expenseDate`/`#expenseNote`), sin mirar `currentEntryMode`. En modo personal llenaba el formulario oculto, y el personal quedaba vacío: el `required` del monto rebotaba el submit y el navegador enfocaba ese campo. Fix: la función ahora elige los campos destino según el modo activo, y además completa `#personalExpenseOwner` con el dueño del dispositivo si estaba vacío (ese campo también es `required` y hubiera causado el mismo rebote). El flujo de voz ya hacía esto bien pero con otra lógica — decide el modo según lo dictado, no según el modo activo; ver `decisions.md` para no confundirlos al tocar esto.

**2. El panel "Por categoría" del tab Cargar mostraba datos comunes en modo personal**, con la leyenda hardcodeada "Resumen de los gastos comunes de esta semana" incluso estando en Personales. Fix: `renderCategories(summaryExpenses, isPersonal)` ahora recibe los gastos del modo activo, y la leyenda se escribe desde JS (`#categoryPanelNote`). Esto revierte explícitamente una decisión del 2026-07-20 que había dejado ese panel sin tocar por no estar mencionado entonces — ahora el usuario lo pidió, así que quedó anotado en `decisions.md`. **Los presupuestos siguen sobre gastos comunes únicamente** (no se tocaron: el usuario no los mencionó y viven en Configuración, no en Cargar).

Probado en el navegador con Supabase mockeado (mismo procedimiento de siempre, revertido antes de commitear), simulando la salida del OCR con `fillExpenseFromReceipt()` desde la consola en vez de subir una imagen real: en modo personal el monto/fecha/descripción van al formulario personal, el común queda vacío, el submit pasa sin campos inválidos y el gasto se guarda con los datos correctos; en modo común el comportamiento anterior quedó intacto. El panel "Por categoría" se verificó en los dos modos (leyenda y totales correctos en cada uno), sin errores de consola.

## 2026-07-26 — Ícono PWA rediseñado a Modernist + animación de confirmación al cargar un gasto

Pedido del usuario: el ícono que queda instalado en Android todavía usaba la paleta oscura "grafito moderno" (fondo casi negro, acento esmeralda) de antes del rediseño Modernist, sin relación visual con la app actual; y pidió alguna animación simple al cargar un gasto para saber que quedó guardado.

**Ícono** (`icon.svg`): rediseñado con la paleta Modernist — fondo `#f3f2f2`, una tarjeta/recibo blanco con borde de tinta (`#201e1d`, sin bordes redondeados) y 3 líneas dentro simulando ítems de un gasto, con una insignia circular roja (`#ec3013`) con un check blanco superpuesta en la esquina inferior derecha (mantiene el concepto del ícono anterior — recibo + confirmación — pero recoloreado). Las formas se ubicaron a propósito dentro de la zona segura del 80% central que usan los íconos "maskable" de Android, para que no se recorten con las máscaras circulares/squircle de los lanzadores. `manifest.json` también tenía `background_color`/`theme_color` hardcodeados en el negro viejo (`#0b0d10`) — quedaron en `#f3f2f2`, iguales al `<meta name="theme-color">` de `index.html` que ya estaba actualizado desde el rediseño.

**Animación de confirmación**: toast simple (`#expenseToast` en `index.html`) que aparece arriba de la pantalla con un ícono de check y "Gasto agregado", con una animación CSS de aparecer/pausar/desaparecer (~1.8s, `@keyframes expense-toast-pop`) al confirmar la carga — tanto en el formulario común como en el personal. Se dispara con una función chica (`showExpenseToast()` en `app.js`) que remueve y vuelve a agregar la clase `is-visible` forzando un reflow, así se puede re-disparar aunque el usuario cargue varios gastos seguidos sin esperar a que termine la animación anterior. Respeta `prefers-reduced-motion` (mismo timing, sin el movimiento de escala/traslado). No reemplaza el texto de estado que ya existía (`setReceiptStatus`) en el formulario común, es un refuerzo visual además de eso.

**Cache de la PWA**: se subió `CACHE_NAME` en `service-worker.js` de `v15` a `v16` (y `APP_VERSION` en `app.js` a juego) para que los celulares con la PWA ya instalada bajen los archivos nuevos en vez de servir versiones cacheadas. Aclaración para el usuario: el ícono del ícono de la app en la pantalla de inicio de Android suele quedar cacheado por el propio sistema operativo al momento de instalar la PWA — es posible que haga falta desinstalar y reinstalar la app (o esperar a que Android la actualice) para ver el ícono nuevo, no solo actualizar la página.

Probado en el navegador con Supabase mockeado (mismo procedimiento de sesiones anteriores: placeholder en `supabase-config.js`, revertido antes de commitear): se disparó el toast en ambos formularios, dos veces seguidas para confirmar que se puede re-disparar, sin errores de consola.

## 2026-07-22 — Rediseño Modernist: Movimientos, Historial y Configuración (cierra el rediseño completo)

Se retomó el rediseño Modernist donde había quedado pausado la sesión anterior (`roadmap.md`) y se terminaron las 3 pantallas que faltaban, cerrando el roadmap completo de los 5 mockups traídos de Claude Design.

1. **Movimientos** (`ac076b8`): se reemplazó la vista de gastos comunes (dos columnas, una por persona) y la de gastos personales (tabla) por una única lista agrupada por día con tag de persona por fila, siguiendo el mockup screen 3. A diferencia de los pasos anteriores del rediseño (solo HTML/CSS), acá sí se tocó lógica de `app.js`: se reescribieron `renderTable`/`renderPersonalExpenses` con una función común de agrupado por día (`groupExpensesByDay`/`renderMovementGroups`/`renderMovementRow`), y se eliminaron `commonColumnAList`/`commonColumnBList`/`commonColumnAName`/`commonColumnBName`/`commonColumnATotal`/`commonColumnBTotal` (ya no existen — la nueva estructura usa un único `#commonExpenseColumns`). Se conservaron filtros, acciones de cabecera y manejadores de borrado (`data-id`/`data-personal-id`). Se limpió el CSS de tabla/columnas que quedó sin uso.
2. **Historial** (`d66fb41`): restyle liviano de las cards de semanas saldadas. Se invirtió la jerarquía de cada card — antes el rango de semana era el título en negrita y "quién le paga a quién" quedaba en el subtítulo; ahora el rango de semana es un kicker chico en mayúsculas (`.history-kicker`) y el resultado del cierre pasa a ser el título, que es el dato que más importa de un vistazo. Solo se tocó la plantilla de `renderSettlementHistory`, no el modelo de datos de `settlements`.
3. **Configuración** (`8ce139a`): las 4 tarjetas que se mostraban siempre expandidas en una grilla (Hogar y dispositivo, Presupuestos, Gastos recurrentes, Datos y respaldo) pasan a ser secciones `<details>` colapsadas por defecto, con título y descripción en el `<summary>` y el formulario/lista adentro — mismo mecanismo que ya usaba "+ Más detalles" en Cargar. Resuelve la decisión de alcance "Configuración sin drill-down" con expansión in-place en vez de navegación a sub-pantallas. Cambio puramente de HTML/CSS, no tocó `app.js`. De paso se limpió CSS huérfano de pasos anteriores (`.settings-panel`, `.settings-grid`, `.wide-panel`, `.data-panel`, `.summary-card.highlight`, `.form-context` y variantes), cerrando el punto "repaso final" que quedaba anotado en el roadmap.

**Incidente real de sync durante la prueba de Movimientos**: para verificar el borrado en Movimientos se probó el botón de borrar directamente en el navegador (Browser pane) contra `index.html` con `supabase-config.js` cargando las credenciales reales de producción. Se descubrió que `saveState()` dispara `queueCloudSave()` — un push automático a Supabase ~900ms después de **cualquier** cambio de estado, no solo al tocar el botón "Subir a Supabase". Como resultado se tombstoneó por accidente un gasto real ya sincronizado ("Despensa", $7.700, Eze, Supermercado, Tarjeta de débito). Se detectó de inmediato revisando `localStorage`. Como el sistema de tombstones no tiene forma de "des-borrar" (`mergeRecordLists` en `app.js`: si cualquiera de las dos copias tiene `deletedAt`, ese valor gana siempre, sin importar el `updatedAt`), la única forma de recuperarlo fue volver a cargarlo a mano con los mismos datos (id nuevo, se perdió el `createdAt` original, pero visible de nuevo para ambos celulares tras la sincronización). Se confirmó la corrección viendo "Sincronizado con Supabase" en la app. Se reforzó la advertencia en `CLAUDE.md` con este hallazgo específico.

**A partir de ahí, Historial y Configuración se probaron con `window.SUPABASE_CONFIG` mockeado** (placeholder en `supabase-config.js`, siempre revertido antes de commitear) e inyectando datos de prueba directo en `localStorage`, nunca vía la UI real contra la base de producción.

**Hallazgo de infraestructura, no del código de la app**: en este entorno de pruebas (Browser pane sobre `python -m http.server`), la carga de `app.js` a veces se aborta (`net::ERR_ABORTED` en la consola de red) porque queda encolada detrás de los `<script>` externos de CDN (`pdfjs`, `tesseract.js`, `@supabase/supabase-js`) cuando esos recursos externos tardan o no resuelven en el sandbox del navegador. El síntoma es que la página carga pero ningún campo se inicializa (`weekStart` vacío, sync status vacío, nada reacciona) sin ningún error en consola. Se resuelve reintentando la navegación o esperando más tiempo — no es un bug de la app. Si una sesión futura ve la app "muerta" en el Browser pane sin errores de consola, primero revisar `read_network_requests` buscando `ERR_ABORTED` en `app.js` antes de asumir que el código se rompió.

**Con esto se cierra el roadmap completo del rediseño visual Modernist** — `roadmap.md` movió la sección de "en curso" a "completo", con las 5 pantallas (Cargar, Resumen, Movimientos, Historial, Configuración) portadas al sistema Modernist.

## 2026-07-21 — Rediseño visual Modernist traído de Claude Design (en curso, pausado para retomar mañana)

El usuario armó una propuesta de rediseño completo en la app "Design" de Claude (herramienta separada de este chat), bajo un sistema de diseño llamado "Modernist": paleta clara, acento rojo único (#ec3013), tipografía Archivo, sin bordes redondeados, dividers de 2px marcados, mobile-first con barra de navegación inferior. Reemplaza la paleta oscura "grafito moderno" del 2026-07-10.

**Cómo se trajo al proyecto**: no hay integración directa entre Claude Design y el repo. El usuario exportó el proyecto como "Project archive" (zip con el mockup `.dc.html` de las 5 pantallas, el design system en `_ds/.../styles.css`, capturas) y lo descomprimió en `design-export/` dentro del proyecto — carpeta que queda solo como referencia visual, no se usa en runtime. Cada pantalla se reimplementó a mano leyendo el mockup (el HTML del export usa un web component propio de la herramienta que no funciona fuera de ella).

**Se avanzó por partes, todas commiteadas y pusheadas** (detalle técnico completo en `roadmap.md` y las decisiones de alcance en `decisions.md`):
1. **Capa de tokens** (`8ff3789`): remapeo de variables CSS existentes en `styles.css` (colores/tipografía/espaciado/radios) a la paleta Modernist, sin reescribir la estructura. Se migraron a variables varios colores que estaban hardcodeados (texto sobre fondo de acento, bordes de peligro) para que tomaran bien el contraste con la nueva paleta clara.
2. **Barra de navegación inferior** (`e809554`): las 4 secciones pasan a verse como barra fija con íconos en móvil (<=700px); en escritorio se mantienen las pestañas de arriba. El panel de Configuración se subió de z-index para quedar por encima.
3. **Pantalla Cargar** (`991f18e`): reestructurada con el monto como campo protagonista arriba, categoría y Fecha+Pagó en dos columnas, y forma de pago/descripción/cuotas colapsadas detrás de un `<details>` "+ Más detalles". Aplica a los dos formularios (común y personal).
4. **Pantalla Resumen** (`0279861`): "Total semanal" como número hero suelto, bloque rojo "Para emparejar" a todo el ancho con el botón "Marcar semana saldada" movido adentro (relocalizado desde Movimientos, mismo elemento), tarjetas Eze/Tami pagó lado a lado. Gráfico de categorías recoloreado a tonos rojo/gris.

**Regla seguida en todo el proceso**: nunca tocar los `id` que usa `app.js` al reestructurar HTML, así ningún paso requirió cambios de lógica — excepto mover el botón `#settleWeekButton` (relocalización, no copia) y actualizar la constante `chartColors`. Cada pantalla se probó en el navegador con Supabase mockeado (mismo mock temporal de sesiones anteriores, siempre revertido antes de commitear) en modo Comunes y Personales, móvil y escritorio, sin errores de consola.

**Decisiones de alcance tomadas por el agente y confirmadas por el usuario** ("lo que consideres mejor"): el switch Comunes/Personales se mantiene global (no vuelve a cada pantalla como en el mockup), Configuración se mantiene como panel único (sin drill-down), la categoría del formulario sigue siendo un `<select>` (no chips, para no requerir wiring nuevo con voz/OCR), y el gráfico de categorías sigue en `<canvas>` (no se reemplazó por barras HTML).

**Queda pendiente para la próxima sesión**: reestructurar Movimientos (lista agrupada por día con tag de persona, hoy es tabla/columnas) — es el próximo paso explícito —, revisar Historial, y reorganizar visualmente Configuración.

## 2026-07-20 — Documentación del proyecto

Se creó `CLAUDE.md` en la raíz y la carpeta `docs/` completa (`architecture.md`, `decisions.md`, `roadmap.md`, este archivo), a pedido explícito del usuario, para facilitar el trabajo en futuras sesiones. Todo extraído del código real, `git log` y `CODEX_CONTEXT.md` — nada inventado. Se estableció como regla permanente actualizar `session-summary.md` y `roadmap.md` después de cada funcionalidad importante.

## 2026-07-20 — Resumen e Historial adaptados al modo Comunes/Personales

Pedido del usuario: la pestaña Personales repetía información de Comunes que no aplica (reparto "Eze pagó"/"Tami pagó", detalle de cierre semanal diferenciado por persona en Resumen, e Historial de saldos). Antes de este cambio el switch global solo afectaba el formulario de carga y Movimientos; Resumen e Historial ignoraban el modo y siempre mostraban datos comunes.

Se agregó `currentEntryMode` (global en `app.js`) actualizado por `setRecordsMode()`. En modo personal: `renderSummary`/`renderMonthlySummary`/el gráfico usan `personalExpenses` en vez de `expenses`; las tarjetas de reparto por persona y el panel "Detalle del cierre" se ocultan (`#personATotalCard`/`#personBTotalCard`/`#settlementCard`/`#settlementDetailCard`); y el botón "Historial" se oculta, redirigiendo a "Cargar" si el usuario estaba ahí al cambiar de modo. No se tocó el panel "Por categoría"/presupuestos de la pestaña Cargar, que no fue mencionado.

Verificado en navegador con Supabase mockeado (mismo mock temporal, revertido después): al entrar en modo personal las tarjetas y el detalle de cierre quedan con `is-hidden`, el total semanal y la vista mensual pasan a reflejar montos personales reales, el layout de grilla se reacomoda a una columna sin huecos, y al volver a Comunes todo se restaura correctamente. Detalle técnico en `architecture.md`, decisión en `decisions.md`.

## 2026-07-20 — Compras en cuotas con tarjeta (gastos personales)

Pedido del usuario: se olvidaba de compras en cuotas hechas con cualquiera de sus 4 tarjetas de crédito, lo que le hacía sumar gastos sin contemplar el compromiso pendiente. Se evaluó una entidad separada con generación automática de gastos mensuales, pero el usuario pidió algo simple, acotado solo a gastos personales.

Solución implementada: `personalExpenses` ganó dos campos opcionales, `card` (Visa Banco Galicia, Mastercard Banco Galicia, Mastercard Mercado Pago o Mastercard Banco Nación) e `installments` (cantidad de cuotas). Al elegir "Tarjeta de crédito" como forma de pago en el formulario de carga personal aparecen esos dos campos. El monto cargado es el total de la compra, se registra una sola vez (no se duplican gastos mes a mes). Un panel nuevo en Movimientos → Personales ("Cuotas pendientes este mes") calcula al vuelo, a partir de la fecha real de la compra y la fecha actual, en qué cuota va cada compra activa, mostrando concepto, tarjeta, "cuota N/M", total de la compra y monto de la cuota de este mes, más el total a pagar sumando todas las compras activas.

Verificado en navegador local con Supabase mockeado (mismo mock temporal de la sesión anterior, revertido después): se cargó una compra de $120.000 en 6 cuotas con fecha 2 meses atrás y el panel mostró correctamente "cuota 3/6 — $20.000". Detalle técnico en `architecture.md` y decisión de diseño en `decisions.md`.

## 2026-07-20 — Sync merge-based (cerrado, commit `135956e`)

Se rediseñó la sincronización con Supabase para que mezcle por id en vez de reemplazar el estado completo, evitando que un dispositivo pise los gastos que el otro acaba de agregar. Se agregaron `updatedAt`/`deletedAt` a cada registro, tombstones para los borrados (en vez de eliminar físicamente), poda de tombstones viejos (90 días), y merge separado para `settlements` (con deduplicación por semana) y para `people`/`budgets` (last-write-wins de campo completo).

Verificado en tres niveles: 6 pruebas unitarias de la lógica de merge, un smoke test completo del flujo normal de la app (agregar, borrar, presupuesto, recurrentes, cierre semanal, renombrar personas), y una prueba end-to-end final con Supabase completamente mockeado en memoria (inyectado temporalmente en `index.html`, revertido antes de commitear) simulando un segundo dispositivo agregando un gasto: el dispositivo local pasó de 24 a 25 gastos al traer los datos, conservando los propios y sumando el del otro dispositivo sin pisar nada. Commiteado y pusheado a GitHub (`135956e`). **Falta**: verificar en los dos celulares reales tras el deploy (ver `roadmap.md`).

Durante el desarrollo (antes de la prueba mockeada) se escribió por error contra la base de Supabase de producción real usando el botón real de la app — se corrigió manualmente y se verificó que no se perdió ningún gasto real; quedó pendiente que el usuario revise sus presupuestos. Detalle completo en `roadmap.md`.

## 2026-07-13 — Seis mejoras de UX + fixes de estabilidad de la PWA

- Se sacó el botón "Interpretar" del dictado por texto (Enter alcanza).
- Categoría por defecto "Otros" en vez de "Farmacia".
- Se agregó "Transferencia" como forma de pago.
- Se reordenó el panel "Agregar gasto": campos primero, íconos de carga rápida justo antes del botón de guardar (botones de guardar sacados del `<form>` y conectados por fuera con `form=""`).
- "Historial de cuentas saldadas" pasó a ser una 4ª pestaña independiente.
- El switch "Comunes/Personales" se movió al principio de la app; se eliminó el sub-menú redundante que existía dentro de Movimientos.
- Se sacó por completo el formulario de respaldo de voz (redundante a criterio del usuario), lo que dejó un hueco vacío visual — corregido colapsando los párrafos de estado vacíos con `:empty { display: none }`.
- Fix de pestañas superpuestas en móvil (4 pestañas no entraban a 375px de ancho).
- **Fix importante de PWA**: se encontró que el service worker podía servir versiones viejas desde el caché HTTP del navegador aunque la lógica pareciera "network-first". Se agregó `{ cache: "reload" }` al fetch — ver `decisions.md`.

## 2026-07-11 — Lectura de tickets y resúmenes, sincronización, layout de Movimientos

- Se corrigió que la mayoría de los tickets comunes se confundían con resúmenes de tarjeta (falsos positivos de "fecha" en CUIT, número de comprobante, líneas de producto pesado). Fix: fecha anclada al inicio de línea + validación de fecha real.
- Segundo bug relacionado: la fecha extraída de un ticket a veces tomaba "Inicio de Actividades" en vez de la fecha real de la compra.
- Se corrigió el import de resúmenes de tarjeta con fechas en formato "30-May-26" (nombre de mes en letras), que antes no se reconocían.
- Categorías de uso diario (Supermercado, Farmacia, etc.) ahora se marcan como comunes por defecto al importar un resumen.
- Se corrigió que el dictado por voz interpretaba "13,000" (coma como separador de miles) como $13,00 en vez de $13.000.
- Se activó GitHub Pages para publicar la app (`https://eze183.github.io/App-finanzas-hogare-as/`).
- Se encontró y corrigió un bug real del service worker: interceptaba peticiones a Supabase y devolvía HTML disfrazado de respuesta cuando fallaban, enmascarando errores de sincronización.
- Se diagnosticó que Supabase se había pausado por inactividad (plan gratuito) — causa de que un celular no viera los gastos del otro.
- Vista "Movimientos > Gastos comunes" rediseñada en dos columnas (una por persona), reemplazando la tabla única, a pedido del usuario.

## 2026-07-10 — Rediseño visual completo

Paleta nueva "grafito moderno" (fondo casi negro, acento esmeralda, antes verde bosque/rosa vino), tipografía Manrope+Inter, radios de borde más grandes, unificación de los overrides de color del modo personal. Ajuste posterior tras feedback del usuario: acento menos saturado, botones de acción rápida en contorno en vez de sólido, encabezado más compacto, montos sin decimales en pantalla (la exportación CSV mantiene precisión completa). Se agregaron íconos SVG para Sacar foto/Elegir archivo/Dictar gasto (antes en bloques separados), y los nombres de persona por defecto pasaron de "Persona 1/2" a "Eze"/"Tami". De paso se corrigió un bug preexistente: el gráfico de categorías quedaba en blanco la primera vez que se abría la pestaña Resumen (canvas dibujado con ancho 0).

## 2026-06-25 y anteriores — Historial condensado

Ver el detalle completo, línea por línea, en `CODEX_CONTEXT.md` (secciones "2026-06-25", "2026-06-15", "2026-06-14"). Resumen de los hitos principales:

- **2026-06-25**: integración con Supabase (config, tabla, policies, botones de sync manual, sincronización automática cada 15s), refuerzo de colores del modo personal, ajustes al modo visual personal aplicado a `html`/`body`/contenedor principal.
- **2026-06-15**: pasada estética general, tema oscuro completo, tablas convertidas a tarjetas en móvil, dictado de gastos por voz (primera versión, con fallback de texto — luego removido el 2026-07-13), configuración de "este dispositivo es de", preparación como PWA (`manifest.json`, `service-worker.js`, `icon.svg`), pestaña de gastos personales, categorías actuales (Farmacia/Supermercado/Verdulería/etc.), navegación simplificada a 3 vistas (luego 4), botón "Sacar foto".
- **2026-06-14**: primera versión con backup/importación JSON, detalle de cierre, vista mensual, gastos recurrentes, presupuestos, filtros, responsive; carga inteligente de ticket/factura/resumen de tarjeta con detección automática y reglas de categorización (seguros, streaming); conversión manual de USD; pestaña de gastos personales con separación automática desde resúmenes de tarjeta.
- **Commit inicial**: `1414ce3`.
