# Memoria compartida de Codex

Este archivo reemplaza el historial online que Codex no comparte entre equipos. Vive dentro de OneDrive, asi que cualquier computadora que abra esta carpeta puede leer el mismo estado del proyecto.

## Como usarlo

Al iniciar una conversacion nueva con Codex, escribir algo como:

> Lee `AGENTS.md` y `CODEX_CONTEXT.md` antes de tocar el proyecto.

Al terminar una tarea, pedir:

> Actualiza la memoria del proyecto antes de cerrar.

## Resumen del proyecto

App local para registrar gastos compartidos del hogar entre dos personas y cerrar cada semana con reparto 50/50.

La app se abre directamente desde `index.html`. No tiene backend. Guarda los datos en `localStorage`, por lo que los gastos cargados pertenecen al navegador y equipo donde se usen.

## Estado actual

- Archivos principales:
  - `index.html`: estructura de la interfaz.
  - `styles.css`: estilos visuales.
  - `app.js`: logica de gastos, resumen semanal, historial, graficos, OCR y exportacion CSV.
  - `README.md`: guia de uso.
- Funciones ya incluidas:
  - Carga de gastos con fecha, persona, categoria, forma de pago, monto y descripcion.
  - Resumen semanal de lunes a domingo.
  - Calculo de ajuste para dividir gastos 50/50.
  - Detalle del cierre semanal con total, mitad, pagos por persona y transferencia sugerida.
  - Vista mensual con total, cantidad de gastos, semanas con gastos y categoria principal.
  - Grafico por categoria en barras o torta.
  - Carga inteligente de archivo unico para ticket, factura o resumen de tarjeta.
  - OCR de tickets/facturas mediante Tesseract.js.
  - Lectura de texto/PDF para resúmenes de tarjeta y deteccion de gastos comunes con revision previa.
  - Pestaña de gastos personales que no afectan el reparto 50/50.
  - En resumenes de tarjeta, separacion automatica entre gastos comunes y gastos personales.
  - Deteccion editable del titular del resumen para asignar gastos personales.
  - Gastos recurrentes semanales o mensuales.
  - Presupuestos semanales por categoria.
  - Filtros por busqueda, persona, categoria y forma de pago.
  - Historial de semanas saldadas.
  - Borrado de gastos individuales o semanas.
  - Exportacion CSV.
  - Exportacion e importacion de backup JSON.

## Decisiones tomadas

- Para resolver la falta de historial compartido de Codex se agrego esta memoria de proyecto y `AGENTS.md`.
- La solucion es deliberadamente simple: no depende de cuentas, servidores ni herramientas externas.
- `AGENTS.md` define el habito de leer y actualizar esta memoria en cada sesion.

## Pendientes

- Decidir si tambien se quiere sincronizar los datos reales de la app entre equipos. Hoy OneDrive comparte el codigo, pero no comparte automaticamente el `localStorage` del navegador.
- Evaluar una opcion simple de importar/exportar backup JSON si se necesita mover datos entre computadoras.

## Registro breve de cambios

### 2026-06-15

- Se hizo una pasada estetica general: encabezado mas compacto, tarjetas con mejor jerarquia, panel lateral mas ordenado, sombras mas suaves y paleta visual mas equilibrada.
- Se mejoro la vista movil convirtiendo las tablas de gastos comunes y personales en tarjetas legibles, evitando el desplazamiento horizontal.
- Se integro una sugerencia de Gemini para el bloque de carga de archivos: se agrego `receipt-reader-text` y se ajusto la composicion del bloque en desktop/mobile.
- Se aplico un tema oscuro a toda la app, incluyendo paneles, formularios, tablas, tarjetas y colores del grafico en canvas.
- Se corrigio un problema de scroll: el panel de Personas/Presupuestos ya no queda fijo ni tapa la seccion de carga de archivos al bajar por la pagina.
- Se redujo la sensacion de pagina larga agregando pestañas principales: "Carga semanal" para el uso diario y "Configuracion" para nombres, presupuestos, gastos recurrentes y backup.
- Se agrego carga de gastos por voz con el boton "Dictar gasto". Usa reconocimiento de voz del navegador para completar gastos comunes o personales antes de confirmarlos manualmente.
- Se ajustaron las pestañas para que "Carga semanal" contenga todo lo diario, incluyendo resumen, detalle, grafico, carga y tablas. "Configuracion" queda separada de verdad.
- Se agrego fallback escrito para la carga por voz: si el navegador bloquea el microfono, se puede escribir la frase y tocar "Interpretar" para completar el formulario.
- Se reemplazo la pestaña visible de configuracion por un boton de engranaje. La configuracion ahora se abre como panel superpuesto con cierre por X, toque exterior o tecla Escape, pensado para uso movil.
- Se agrego configuracion de "este dispositivo es de". Cada celular/navegador puede quedar asociado a Eze o Tami, y los gastos comunes/personales se cargan por defecto a esa persona sin elegir pagador en cada carga. El pagador sigue pudiendo cambiarse como excepcion.
- Se preparo la app como PWA para Android: se agregaron `manifest.json`, `service-worker.js`, `icon.svg` y referencias en `index.html`. Para instalarla en el telefono debe publicarse por HTTPS, por ejemplo con GitHub Pages.
- Se corrigio la edicion de nombres en configuracion: la app ya no pisa los campos Persona 1/Persona 2 mientras se estan escribiendo, evitando que se borren al abrir el teclado o cambiar el tamaño de pantalla.
- Se reforzo la correccion de nombres para Android: mientras la configuracion esta abierta, los campos de personas se rellenan solo al abrir el panel y no se repintan con eventos de resize/teclado.
- Se actualizo el service worker a cache `gastos-hogar-v2` con estrategia network-first para evitar que Android use una version vieja de la PWA. Se agrego `APP_FINANZAS_VERSION` para verificar la version cargada.
- Se subio visualmente la seccion "Agregar gasto" para que aparezca antes de resumen/detalle/grafico, facilitando la carga en celular.
- Se mejoro el dictado de gastos: ahora entiende importes como "10mil" o "10 mil", interpreta "dulce de leche" como Comida y limpia la descripcion resultante.
- Se agregaron pestañas de listado para alternar entre "Gastos comunes" y "Gastos personales", separando mejor los gastos individuales. La PWA quedo en version `tabs-personales-v4` y cache `gastos-hogar-v4`.

### 2026-06-14

- Se agrego `AGENTS.md` con instrucciones persistentes para futuras sesiones de Codex.
- Se agrego `CODEX_CONTEXT.md` como memoria compartida del proyecto.
- Se genero `preview-ultimos-cambios.png` para revisar la vista actual de la app.
- Se agregaron backup/importacion JSON, detalle de cierre, vista mensual, gastos recurrentes, presupuestos, filtros y mejoras responsive.
- Se generaron capturas `preview-desktop-actualizado.png` y `preview-mobile-actualizado.png` para validar la interfaz.
- Se corrigio el alta de gastos desde tickets: ahora acepta montos con coma o punto y, si la fecha del ticket pertenece a otra semana, la app cambia automaticamente a esa semana para mostrar el gasto agregado.
- Se reemplazo el flujo separado de foto/ticket por un unico boton de archivo que detecta ticket, factura o resumen de tarjeta. En resumenes de tarjeta identifica gastos comunes por palabras clave y los muestra para revisar antes de importarlos.
- Se ajustaron reglas con un resumen real: detecta INTEGRITY como seguro de moto, CIA SEG LA MER como seguro de auto, GALICIA SEGURO como seguro de casa, Spotify y Netflix como streaming. Los importes en USD quedan detectados pero desmarcados por defecto para evitar cargarlos como pesos sin convertir.
- Se agrego conversion manual de USD a pesos en la revision de resumen de tarjeta. La app muestra "Cotizacion USD", calcula el total a importar, convierte los consumos marcados en dolares y salta a la semana con mayor importe importado. La vista mensual refleja el total completo del resumen.
- Se cambio el criterio de importacion de resumen de tarjeta: todos los consumos seleccionados se cargan en la semana actualmente seleccionada, y la fecha original del consumo queda solo como referencia en la descripcion.
- Se agrego pestaña de gastos personales. Los consumos de resumen de tarjeta que no coinciden con reglas comunes pasan a personales, con titular detectado automaticamente y editable antes de importar.
