# dsh-chat-toc

[中文](README.md) · [English](README.en.md)

Un plugin de índice de conversación para la GUI web de DSH: una barra de esquema estilo libro en el borde derecho del chat; pasa el ratón para expandir el índice, haz clic en cualquier entrada para ir a ese mensaje.

## Características

- **Barra de índice**: pegada al borde derecho del área de chat (a la izquierda de la flecha de colapso del panel de Git). Cada mensaje es una marca — cuanto más larga la marca, más contenido; los mensajes de usuario son azules, los del asistente verdes
- **Extracción inteligente de encabezados y resúmenes**: prioriza encabezados Markdown (`##`) y conclusiones clave en negrita como resúmenes del índice, organizando mejor las conversaciones técnicas largas
- **Evitación de colisiones y diseño adaptativo**: desplazamiento automático hacia la izquierda para evitar tapar el botón oficial de colapso (`<`) y el panel Git
- **Reinicio automático al cambiar de sesión**: detecta la navegación de la SPA y limpia inmediatamente las entradas del índice en sesiones nuevas o vacías
- **Resaltado de posición actual**: al desplazarte, la marca del mensaje actual se resalta (sincronizado entre la barra y la lista desplegable)
- **Expandir al pasar el ratón y Fijar panel (Pin)**: mueve el ratón a la barra para ver el índice completo; haz clic en el icono 📌 de la cabecera para **fijar el panel de índice abierto** mientras navegas; haz clic de nuevo o usa el atajo para desfijar
- **Atajo de teclado global**: pulsa `Cmd/Ctrl + Shift + O` en cualquier momento para alternar o fijar/desfijar el panel de índice
- **Búsqueda en el índice**: el índice expandido tiene un buscador que filtra los mensajes por resumen/clave en tiempo real (sin distinción de mayúsculas), ideal para localizar y saltar a mensajes históricos
- **Marcadores de mensajes**: pase el ratón por cualquier entrada del índice y toque la estrella (⭐) para marcar mensajes clave (p. ej. conclusiones, contratos API); la cabecera del índice tiene un filtro de un clic "solo destacados"; los marcadores persisten en localStorage del navegador
- **Exportar / Copiar índice Markdown**: la cabecera del índice ofrece un botón "📋 Copiar índice" para extraer el esquema completo de la conversación en un árbol Markdown con un solo clic
- **Clic para ir al mensaje**: haz clic en cualquier entrada para desplazarte suavemente hasta el mensaje correspondiente
- **Multilingüe**: sigue el idioma de la interfaz web de DSH (chino / inglés); los navegadores en español reciben automáticamente el texto en español; por defecto chino simplificado
- Tema claro / oscuro siguiendo la GUI web de DSH; coexiste con dsh-git-panel, las posiciones se ajustan automáticamente

## Capturas de pantalla

**Barra de índice** (marcas en el borde derecho del chat tras varias interacciones; el mensaje actual se resalta):

![Barra de índice](docs/toc-bar.png)

**Índice desplegado al pasar el ratón** (barra de color por rol + número + resumen, clic para ir al mensaje):

![Índice](docs/toc-pop.png)

## Instalación

```sh
dsh plugin --profile web add dsh-chat-toc
```

Reinicia `dsh web` y, tras varias interacciones de la conversación, la barra de índice aparece en el borde derecho del chat.

> Para desarrollo local, instala mediante un enlace: `dsh plugin --profile web add link:/path/to/dsh-chat-toc`. Tras editar el código, ejecuta `npm run build` y actualiza la página para ver los cambios.

## Comentarios

¿Encontró un error o tiene una sugerencia? Abra un issue en [GitHub Issues](https://github.com/a792883583/dsh-chat-toc/issues) — sus comentarios nos ayudan a mejorar el plugin.

## Licencia

MIT
