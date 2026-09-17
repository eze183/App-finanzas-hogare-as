# Gastos del hogar

App local para registrar gastos compartidos entre dos personas y cerrar la semana con un reparto 50/50.

## Actualización de protección de datos (publicada)

La versión v35 está publicada en [la app](https://eze183.github.io/App-finanzas-hogare-as/), tras la confirmación del backup y la autorización del usuario. En ambos celulares, abrir con Internet, esperar unos segundos, cerrar completamente y volver a abrir la app para que cargue la actualización. No es necesario borrar datos ni importar el backup para actualizar.

Las correcciones de `codex/proteccion-datos` están documentadas en [Protección de datos](docs/proteccion-datos.md). Para probar sin red ni datos reales:

```sh
node --test tests/protection.test.cjs
```

## Nueva interfaz financiera (publicada)

La versión v41 está publicada en GitHub Pages. Lleva la maqueta visual completa a la app real sin reemplazar su almacenamiento, prioriza el resultado del cierre y conserva todas las funciones anteriores. El ingreso queda sólo en el navegador del dueño: no se sincroniza ni forma parte del backup compartido.

El punto de regreso anterior al cambio está en la rama local `codex/backup-app-antes-analisis-2026-09-16` (`f0111b0`) y en `backups/app-v35-antes-nueva-interfaz-2026-09-16.zip`.

No abras el `index.html` de trabajo para hacer pruebas con datos ficticios: conserva la configuración real de Supabase. La prueba de navegador usa una copia del HTML sin scripts externos ni configuración real, y bloquea toda petición no simulada. Ver [cómo ejecutar las pruebas integradas](tests/README.md).

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
- Desglose mensual común por categoría, porcentaje y parte por persona.
- Vista privada del ingreso individual, gastos personales efectivos y resto estimado.
- Compras en cuotas contabilizadas mes a mes para calcular el flujo personal.
- Total pagado por cada persona.
- Cálculo del ajuste necesario para dividir el total en partes iguales.
- Detalle del cierre con total, mitad correspondiente, pagos de cada persona y transferencia sugerida.
- Forma de pago opcional por gasto: tarjeta de crédito, débito o efectivo.
- Carga asistida desde un único botón para ticket, factura o resumen de tarjeta.
- Detección de gastos comunes y personales en resúmenes de tarjeta con revisión antes de importar.
- Pestaña para cargar gastos personales que no entran en el reparto 50/50.
- Gastos recurrentes semanales o mensuales.
- Presupuestos semanales por categoría.
- Filtros por búsqueda, persona, categoría y forma de pago; orden por monto o fecha.
- Desglose por categoría.
- Gráfico de barras o torta para ver gastos por categoría.
- Historial de semanas saldadas con fecha de cierre.
- Borrado de gastos individuales o de toda una semana.
- Exportación CSV de la semana seleccionada.
- Exportación e importación de backup JSON para mover datos entre navegadores o computadoras.
