# dsh-chat-toc (Navegación y Mejora de Turn Rail Nativo para DSH)

[中文说明](./README.md) · [English Documentation](./README.en.md)

Un plugin de navegación y mejora de índice para la GUI web de DSH: **potencia profundamente el Turn Rail nativo oficial** sin añadir pistas redundantes. Proporciona tarjetas emergentes con vista previa dual (pregunta del usuario + respuesta de IA), marcadores con resaltado dorado brillante, almacenamiento persistente por sesión y una barra de herramientas en línea elegante (Búsqueda / Filtro de destacados / Exportación a Markdown).

## Características

- **Fusión 100% Nativa y Cero Redundancia**:
  - Elimina pistas paralelas secundarias para mantener el espacio visual limpio y ordenado.
  - Se acopla directamente al Turn Rail nativo de DSH, convirtiéndolo en una herramienta de navegación avanzada.

- **Tarjetas Emergentes Estables (Sin Cierres Inesperados)**:
  - **Vista Previa de Contenido Dual**: Al pasar el ratón por cualquier marca del riel, se muestra una tarjeta que incluye tanto la **👤 Pregunta del usuario** como la **🤖 Respuesta de IA**.
  - **Puente de Retención de 300 ms**: Mantiene la tarjeta abierta de manera estable mientras mueve el cursor hacia ella, permitiendo seleccionar texto o pulsar botones con total comodidad.
  - **Acciones Integradas (⭐ Destacar y 📋 Copiar)**: Cada tarjeta integra botones para marcar la conversación o copiar el contenido completo.

- **Almacenamiento Persistente por Sesión**:
  - Aislado por **ID de Sesión + clave única del mensaje (`chatAnchorKey`)**.
  - Conserva los destacados tras recargar la página o reiniciar el navegador; solo se eliminan si se borra o archiva la sesión.

- **Barra de Herramientas en Línea (Layout Nativo)**:
  - Integrada justo al lado del botón "Session 日志" en la barra superior nativa; evita colisiones con paneles laterales y previene barras de desplazamiento no deseadas.
  - **🔍 Búsqueda Rápida**: Despliega un cuadro de búsqueda hacia la izquierda; las coincidencias brillan en azul en el riel y se desplazan automáticamente a la posición; pulse `Esc` para cerrarlo.
  - **⭐ Filtro de Destacados**: Atenúa las marcas no destacadas al 8%, mientras que las destacadas brillan como **líneas doradas de 22px con efecto resplandeciente**.
  - **📋 Exportar Esquema Markdown**: Copia en un clic toda la estructura de la conversación en formato Markdown.

- **Multilingüe y Adaptable a Temas**:
  - Sincronización automática con el idioma de DSH Web (español, inglés y chino).
  - Totalmente compatible con los temas Claro y Oscuro de DSH.

## Capturas de Pantalla

**1. Tarjeta Emergente (Pregunta + Respuesta de IA con acciones de Destacar/Copiar, y Barra Superior):**

![Vista previa de tarjeta emergente](docs/toc-pop.png)

**2. Filtro de Destacados Activo (Marcas destacadas brillan en dorado y el resto se atenúa):**

![Resaltado de marcas](docs/toc-bar.png)

## Instalación

```sh
dsh plugin --profile web add dsh-chat-toc
```

Tras actualizar, recarga la pestaña de `dsh web` en tu navegador.

## Licencia

MIT
