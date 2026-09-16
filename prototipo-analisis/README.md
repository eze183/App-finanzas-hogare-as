# Prototipo de análisis

Prueba independiente de la aplicación principal. Se abre desde `index.html` y utiliza una clave de `localStorage` propia, por lo que no lee ni modifica los datos guardados por la app actual.

## Qué prueba

- Gastos comunes separados de los personales.
- Desglose común por categoría, incluyendo el importe asignado a cada persona y su peso sobre el ingreso individual.
- Gastos personales atribuibles solamente a su dueño.
- Compras personales en cuotas computadas por la cuota correspondiente al mes.
- Resto estimado por persona después de su parte común y sus gastos personales.
- Privacidad por dispositivo: la vista `Comunes` no muestra ingresos ni restos; la vista `Personal` sólo muestra esos datos para `deviceOwner`.

Incluye datos agregados de demostración. El botón **Importar respaldo** acepta el JSON exportado por la app y lo guarda sólo dentro del espacio aislado del prototipo.

## Maqueta integral

La navegación incluye `Cargar`, `Análisis`, `Movimientos`, `Cuotas`, `Cierres` y `Ajustes`. La carga cambia según el modo:

- `Comunes`: pagador, categoría, medio de pago, voz y ticket.
- `Personal`: dueño privado, categorías personales/profesionales, tarjeta, cantidad y comienzo de cuotas, voz, ticket y resumen.

La maqueta guarda cargas manuales dentro de su estado aislado. Los botones de voz, ticket y resumen muestran el lugar y comportamiento previsto; el reconocimiento real continúa perteneciendo a la app principal hasta que se decida integrar este diseño.

En `Movimientos` se puede combinar filtro por categoría y persona con orden por fecha más cercana/lejana o importe mayor/menor. En la vista personal se oculta el filtro de persona porque sólo se muestran movimientos del dueño.
