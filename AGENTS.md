# Instrucciones para Codex

Este proyecto se trabaja desde varios equipos usando OneDrive. El historial interno de Codex no viaja entre computadoras, por eso la continuidad del trabajo se guarda en archivos del propio proyecto.

## Al empezar una conversacion nueva

1. Leer `CODEX_CONTEXT.md`.
2. Revisar la seccion "Estado actual" y "Pendientes".
3. Si el usuario pide algo ambiguo, usar ese contexto antes de preguntar.

## Antes de terminar una tarea

Actualizar `CODEX_CONTEXT.md` con:

- Que se hizo.
- Archivos modificados.
- Decisiones tomadas.
- Pendientes o ideas para despues.
- Problemas encontrados, si los hubo.

Mantener el archivo breve y practico. No hace falta copiar toda la conversacion: solo lo necesario para que otra sesion de Codex pueda continuar el proyecto sin perder el hilo.

## Reglas del proyecto

- La app es local y se abre desde `index.html`.
- Los datos de gastos se guardan en el navegador de cada computadora.
- Priorizar soluciones simples, sin servidor, salvo que el usuario pida sincronizacion real de datos entre equipos.
- Evitar cambios grandes de arquitectura si no son necesarios.
