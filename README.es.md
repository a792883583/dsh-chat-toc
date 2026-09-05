# dsh-chat-toc

[中文](README.md) · [English](README.en.md)

Un plugin de mejora del índice de conversación para la GUI web de DSH: se integra profundamente y potencia el Turn Rail nativo oficial sin pistas duplicadas; proporciona atajos globales, búsqueda, marcadores y exportación a Markdown.

## Características

- **Fusión Nativa y Cero Redundancia**: Mejora perfectamente el Turn Rail nativo de DSH sin generar una segunda pista redundante, manteniendo la interfaz 100% limpia y elegante.
- **Atajo de Teclado Global**: Pulsa `Cmd/Ctrl + Shift + O` en cualquier momento para alternar o fijar/desfijar el panel de índice, o haz clic en el botón sutil de esquema en la parte superior del riel.
- **Extracción Inteligente de Encabezados**: Prioriza encabezados Markdown (`##`) y conclusiones clave en negrita como resúmenes del índice, organizando mejor las conversaciones técnicas largas.
- **Fijar Panel Abierto (Pin)**: Haz clic en el botón de fijar en la cabecera para bloquear el esquema abierto a la derecha mientras revisas código o conversación.
- **Búsqueda y Salto Rápido**: Buscador en tiempo real en la parte superior para filtrar mensajes por palabra clave y desplazarse suavemente al mensaje al instante.
- **Marcadores de Mensajes (⭐)**: Marca conclusiones, planes y contratos clave para acceso rápido; incluye filtro "solo destacados".
- **Exportar / Copiar Índice Markdown**: Botón de un clic para exportar toda la jerarquía de la conversación como Markdown estructurado.
- **Sincronización Automática de Sesión**: Completamente sincronizado con la navegación de sesiones de DSH; se limpia de inmediato en conversaciones nuevas.
- **Multilingüe**: Sincronización automática con el idioma de DSH Web GUI (chino / inglés / español).
- Tema claro / oscuro siguiendo la GUI web de DSH.

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
