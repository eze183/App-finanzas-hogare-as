# Gastos del hogar

App local para registrar gastos compartidos entre dos personas y cerrar la semana con un reparto 50/50.

## Cómo usarla

1. Abrí `index.html` en tu navegador.
2. Cambiá los nombres de las dos personas.
3. Cargá cada gasto común con fecha, persona que pagó, categoría, monto y descripción.
4. También podés subir una foto de un ticket o factura para que la app intente completar fecha, monto y descripción.
5. Elegí la semana que querés revisar.
6. Mirá el resumen: la app indica quién le pasa dinero a quién para emparejar los gastos.
7. Cuando hagan el pago entre ustedes, marcá la semana como saldada para guardarla en el historial.

Los datos se guardan automáticamente en el navegador de esta computadora.
La lectura de tickets usa OCR en el navegador y necesita conexión para cargar el lector la primera vez.

## Trabajar con Codex desde varias computadoras

Como el historial de conversaciones de Codex no se sincroniza entre equipos, este proyecto incluye una memoria compartida:

- `AGENTS.md`: instrucciones que Codex debe seguir al trabajar en este proyecto.
- `CODEX_CONTEXT.md`: resumen del estado actual, decisiones y pendientes.

Al empezar una conversación nueva en cualquier equipo, pedile a Codex:

> Lee `AGENTS.md` y `CODEX_CONTEXT.md` antes de tocar el proyecto.

Antes de cerrar una tarea, pedile:

> Actualiza la memoria del proyecto antes de cerrar.

Así la continuidad del proyecto queda guardada en OneDrive junto con el código.

## Funciones incluidas

- Resumen semanal de lunes a domingo.
- Vista mensual con total, cantidad de gastos, semanas con gastos y categoría principal.
- Total pagado por cada persona.
- Cálculo del ajuste necesario para dividir el total en partes iguales.
- Detalle del cierre con total, mitad correspondiente, pagos de cada persona y transferencia sugerida.
- Forma de pago opcional por gasto: tarjeta de crédito, débito o efectivo.
- Carga asistida desde un único botón para ticket, factura o resumen de tarjeta.
- Detección de gastos comunes y personales en resúmenes de tarjeta con revisión antes de importar.
- Pestaña para cargar gastos personales que no entran en el reparto 50/50.
- Gastos recurrentes semanales o mensuales.
- Presupuestos semanales por categoría.
- Filtros por búsqueda, persona, categoría y forma de pago.
- Desglose por categoría.
- Gráfico de barras o torta para ver gastos por categoría.
- Historial de semanas saldadas con fecha de cierre.
- Borrado de gastos individuales o de toda una semana.
- Exportación CSV de la semana seleccionada.
- Exportación e importación de backup JSON para mover datos entre navegadores o computadoras.
