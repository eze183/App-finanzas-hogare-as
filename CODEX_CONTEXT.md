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
  - Integracion inicial opcional con Supabase para sincronizar el estado compartido entre dispositivos.

## Decisiones tomadas

- Para resolver la falta de historial compartido de Codex se agrego esta memoria de proyecto y `AGENTS.md`.
- La solucion es deliberadamente simple: no depende de cuentas, servidores ni herramientas externas.
- `AGENTS.md` define el habito de leer y actualizar esta memoria en cada sesion.
- Las habilidades reutilizables de Codex se guardan separadas de la app en `C:\Users\Eze\OneDrive\GALPÓN\Habilidades Codex`, para que OneDrive las sincronice entre equipos.

## Pendientes

- Decidir si tambien se quiere sincronizar los datos reales de la app entre equipos. Hoy OneDrive comparte el codigo, pero no comparte automaticamente el `localStorage` del navegador.
- Evaluar una opcion simple de importar/exportar backup JSON si se necesita mover datos entre computadoras.
- Para probar Supabase falta pegar la URL y `anon public key` en `supabase-config.js`, ejecutar `supabase-setup.sql` en el SQL editor de Supabase y publicar los cambios.
- Supabase ya quedo configurado en `supabase-config.js` con URL `https://mjkuxzkefxzuknmqeyhn.supabase.co`, publishable key publica y `stateId` `hogar-eze-tami`. La prueba local conecto y quedo lista para subir la primera copia.

## Registro breve de cambios

### 2026-07-11 (fix dictado: coma como separador de miles)

- El usuario probo el dictado por voz ya instalado en el celular diciendo "trece mil pesos de carne" y la app cargo $13,00 en vez de $13.000.
- Causa: el reconocimiento de voz a veces transcribe el numero en digitos con coma como separador de miles ("13,000", estilo ingles) en lugar de la palabra "mil". `parseAmountInput` (`app.js`) asumia que la coma siempre es separador decimal (formato argentino), asi que interpretaba "13,000" como 13 con tres decimales de mas.
- Fix: se agrego una regla en `parseAmountInput` que reconoce coma seguida de exactamente 3 digitos y fin de cadena/no-digito como separador de miles (misma logica que ya existia para el punto) y la elimina antes de convertir la coma restante en decimal. Como es un fix en la funcion central de parseo de montos, tambien corrige el mismo caso si aparece en carga manual, OCR o import de resumenes, no solo en voz.
- Verificado: "13,000 pesos de carne" -> $13.000 (antes daba $13,00). Casos con coma decimal real como "13,50" o "1.234,56" siguen funcionando igual que antes.

### 2026-07-11 (GitHub Pages + fix service worker)

- Se activo GitHub Pages en el repo (`github.com/eze183/App-finanzas-hogare-as`), deploy desde `main` en la raiz. URL publica: `https://eze183.github.io/App-finanzas-hogare-as/`.
- Probando la URL publica se encontro un bug real en `service-worker.js`: el listener de `fetch` interceptaba TODAS las peticiones GET sin filtrar por origen, incluidas las llamadas a la API de Supabase. Cuando una de esas llamadas fallaba, el `catch` devolvia el `index.html` cacheado como si fuera la respuesta — confirmado viendo que un fetch a la URL de Supabase volvia con el HTML de la app y status 200. Esto puede haber estado enmascarando fallos silenciosos de sincronizacion todo este tiempo.
- Fix de una linea: se agrego `if (new URL(event.request.url).origin !== self.location.origin) return;` al handler de `fetch`, asi el service worker solo cachea los archivos propios de la app y deja pasar sin tocar las llamadas a Supabase y CDNs externos. Se subio la version de cache a `gastos-hogar-v14` y `APP_VERSION` a `2026-07-11-sw-fetch-scope-v14` para forzar la actualizacion en los dispositivos que ya tenian la PWA instalada.
- Verificado: con el fix, una llamada a Supabase que falla ahora da un error de red normal en vez de devolver HTML disfrazado de respuesta valida.

### 2026-07-11 (ajuste fino de estetica)

- El usuario dio feedback despues de ver el rediseño: "se ve bien pero no me convence 100%". Se le mostro un mockup comparativo (antes/despues) con 3 cambios propuestos y aprobo avanzar con los tres:
- Acento verde menos saturado: `--accent` paso de `#34d399` a `#10b981`, `--accent-strong` de `#5eeab0` a `#16c98a`. Menos "neon", mas sobrio.
- Los 3 botones de accion rapida (`.quick-action`: Sacar foto/Elegir archivo/Dictar gasto) dejaron de ser verde solido y pasaron a estilo contorno (borde fino, icono verde, texto gris), para que el verde solido quede reservado solo al boton principal "Agregar gasto". Se ajusto tambien el estilo en modo personal (icono rosa en vez de verde).
- Se saco el rotulo "Cierre semanal compartido" del encabezado, se acorto el subtitulo y se redujo el tamaño de `h1` (de hasta 3.7rem a maximo 2.1rem) para que la app cargue con menos "chrome" antes de la accion diaria.
- Se sacaron los centavos de todos los montos mostrados: `moneyFormatter` en `app.js` paso de `maximumFractionDigits: 2` a `0`. Esto es solo visual — la exportacion CSV sigue usando `.toFixed(2)` con precision completa, no se pierde informacion.
- Antes de tocar CSS se aclararon dos dudas del usuario sobre el flujo de carga: (1) por que "Agregar gasto" no deberia estar junto a foto/archivo/voz (esos 3 solo prellenan el mismo formulario, no son alternativas a el); (2) confirmar que nada se guarda automaticamente al leer una foto o resumen — siempre hace falta tocar "Agregar gasto" o "Agregar seleccionados" para confirmar.
- Verificado en el navegador real: header compacto, iconos en contorno, verde mas profundo, y montos sin decimales en resumen/detalle/tarjetas funcionando correctamente.

### 2026-07-10 (rediseno visual)

- Se rediseño la identidad visual completa a pedido del usuario (paleta, tipografia, radios), manteniendo intacta la logica, el almacenamiento y la sincronizacion con Supabase. Se hizo con Claude Code, no con Codex.
- Paleta nueva "grafito moderno": fondo casi negro `#0b0d10`, superficies `#16191d`/`#1d2126`/`#121417`, acento esmeralda `#34d399`, acento de gastos personales rosa `#f472b6` (antes verde bosque `#43b08d` y rosa vino `#d98faf`).
- Tipografia: titulos y numeros grandes con Manrope 800 (cargada por `<link>` de Google Fonts en `index.html`), cuerpo y formularios con Inter.
- Radios de borde subidos de 7-8px a variables `--radius-sm` (10px), `--radius-md` (14px), `--radius-lg` (18px) para un look mas suave.
- Se unificaron los bloques de colores hardcodeados del modo "personal" (antes duplicados con hex distintos en `body.personal-mode` y `html.personal-mode`) para que ambos usen las mismas variables CSS; se elimino el gradiente decorativo de fondo y las texturas de lineas repetidas.
- Se actualizaron `manifest.json` (`theme_color`/`background_color`), `icon.svg` y la paleta de colores del grafico de categorias en `app.js` (`chartColors`) para que combinen con la paleta nueva.
- El usuario instalo Python (antes solo tenia el stub de Microsoft Store) y se pudo levantar un servidor local (`python -m http.server`) para probar la app real en el navegador. Se agrego `.claude/launch.json` en la raiz de `C:\Users\Eze\OneDrive\Claude Code` para levantar ese servidor desde Claude Code en el futuro.
- Probando la app real se encontro y corrigio un bug ajeno al rediseño: el grafico de "Gastos por categoria" quedaba en blanco la primera vez que se abria la pestaña Resumen, porque se dibujaba en el canvas mientras la seccion todavia estaba oculta (ancho 0). Se corrigio en `app.js` (`setAppView`) llamando a `render()` cuando se entra a la vista Resumen. Verificado con captura de pantalla: la barra y la torta se dibujan bien al primer clic.
- Verificado en el navegador real: paleta, tipografia Manrope/Inter, modo personal (rosa), tabla de movimientos y panel de configuracion se ven correctos. Falta que el usuario lo revise el en su propio celular/PC para el veredicto final.

### 2026-07-10 (accion rapida por iconos + nombres por defecto)

- Se unifico "Sacar foto", "Elegir archivo" y "Dictar gasto" en una sola fila de 3 botones con icono SVG (camara, documento, microfono) dentro de un bloque `.quick-add`. Antes "Dictar gasto" estaba en un bloque separado ("Desde audio") mas abajo. La logica no cambio: mismos ids (`cameraFile`, `documentFile`, `voiceExpenseButton`, `voiceTextForm`, etc.), solo se reordeno y restilo el HTML/CSS.
- El formulario de respaldo por texto ("Si el microfono falla, escribi la frase") sigue debajo de los 3 iconos, igual que antes.
- Se cambiaron los nombres de persona por defecto de `"Persona 1"/"Persona 2"` a `"Eze"/"Tami"` en `defaultState` (`app.js`). Esto solo afecta dispositivos/navegadores nuevos sin datos guardados: si un dispositivo ya tiene gastos cargados con los nombres viejos, hay que renombrarlos una vez en Configuracion > Hogar y dispositivo (la funcion para eso ya existia).
- Verificado en el navegador: los 3 iconos se ven bien, el dictado por texto sigue autocompletando el formulario, y renombrar a Eze/Tami se propaga a resumen, formularios y filtros sin tocar mas codigo.

### 2026-07-10

- Se creo la habilidad compartida `optimizador-de-prompts` en `C:\Users\Eze\OneDrive\GALPÓN\Habilidades Codex\optimizador-de-prompts`. Convierte ideas en prompts adaptados a ChatGPT, Claude, Gemini, Grok y Claude Code.
- Se instalo una copia local en `C:\Users\Eze\.codex\skills\optimizador-de-prompts` para usarla en esta computadora. En otros equipos se debe repetir esa copia desde OneDrive.
- La validacion automatica no pudo ejecutarse porque el Python disponible no incluye el modulo `yaml`; la estructura y el contenido se revisaron manualmente.

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
- Se corrigio el dictado de importes en palabras con miles: "quince mil" y "quincemil" ahora cargan 15000 y limpian la descripcion correctamente. PWA version `voz-quince-mil-v5`, cache `gastos-hogar-v5`.
- Se reemplazaron las categorias por Farmacia, Supermercado, Verduleria, Carniceria, Polleria/Pescaderia, Servicios, Tarjeta de credito, Combustible y Otros. En estadisticas, Supermercado/Verduleria/Carniceria/Polleria-Pescaderia se agrupan como "Comida". PWA version `categorias-comida-v6`, cache `gastos-hogar-v6`.
- Se simplifico la navegacion principal agrupando la app en tres vistas: Cargar, Resumen y Movimientos. Cada vista muestra solo sus secciones relevantes para reducir ruido visual. PWA version `simplifica-vistas-v7`, cache `gastos-hogar-v7`.
- Se agrego boton "Sacar foto" para tickets, usando `capture="environment"` en Android y el mismo flujo OCR/lectura de imagen existente. PWA version `foto-ticket-v8`, cache `gastos-hogar-v8`.
- Se diferencio visualmente la seccion de gastos personales con un acento rosado/malva en botones, paneles y total personal. PWA version `color-personales-v9`, cache `gastos-hogar-v9`.
- Se amplio el modo visual de gastos personales: al activar personales cambia el fondo general, superficies, paneles, campos y acciones de la vista a una paleta rosada/malva. PWA version `modo-personal-v10`, cache `gastos-hogar-v10`.
- Se reforzo el modo visual de gastos personales aplicando la clase de tema a `html`, `body` y al contenedor principal, con reglas especificas para fondo general, paneles, pestañas, formularios y botones. Se verifico en vista movil que "Personales" use la paleta malva completa. PWA version `modo-personal-v11`, cache `gastos-hogar-v11`.
- Se preparo una prueba de sincronizacion con Supabase: se agrego `supabase-config.js`, `supabase-setup.sql`, carga de Supabase por CDN, botones "Traer de Supabase" y "Subir a Supabase", y guardado automatico remoto si esta configurado. El campo `deviceOwner` queda local por dispositivo y no se sincroniza. Se ejecuto el SQL en Supabase y se configuraron URL/publishable key. PWA version `supabase-v12`, cache `gastos-hogar-v12`.
- Se reforzo la sincronizacion con Supabase: la app ahora consulta cambios remotos cada 15 segundos, al volver al frente y al recuperar foco. Tambien evita que un pull remoto dispare una subida silenciosa innecesaria. PWA version `supabase-auto-v13`, cache `gastos-hogar-v13`.

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
