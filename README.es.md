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
  - **🔍 Búsqueda Instantánea y Profunda**: Resaltado difuso en la vista actual; **en conversaciones largas, presione Enter para Búsqueda Profunda**, cargando automáticamente mensajes antiguos mediante "Cargar anteriores" hasta encontrar y desplazar hacia el objetivo.
  - **💻 Cápsulas de Filtro de Código y Herramientas**: Filtros rápidos (`Todos` · `Código 💻` · `Herramientas ⚙️`) bajo el buscador para localizar al instante turnos con bloques de código o llamadas a herramientas.
  - **⭐ Filtro de Destacados**: Atenúa las marcas no destacadas al 8%, mientras que las destacadas brillan como **líneas doradas de 22px con efecto resplandeciente**.
  - **📋 Exportar Esquema Markdown**: Copia en un clic toda la estructura de la conversación en formato Markdown.

- **Multilingüe y Adaptable a Temas**:
  - Sincronización automática con el idioma de DSH Web (español, inglés y chino).
  - Totalmente compatible con los temas Claro y Oscuro de DSH.

## Capturas de Pantalla

**1. Tarjeta Emergente (Pregunta + Respuesta de IA con acciones de Destacar/Copiar, y Barra Superior):**

![Vista previa de tarjeta emergente](docs/toc-pop.png?v=0.4.10)

**2. Filtro de Destacados Activo (Marcas destacadas brillan en dorado y el resto se atenúa):**

![Resaltado de marcas](docs/toc-bar.png?v=0.4.10)

## Requisitos

- **Versión mínima: host DSH ≥ `0.1.5-rc.2`** (`@deepseek-ai/dsh-client-runtime` / `dsh-client-locale` / `dsh-client-ui-chat` ≥ `0.1.5-rc.2`). `peerDependencies` declara `>=0.1.5-rc.2 <0.3.0`.
  Este plugin depende de los siguientes contratos DOM oficiales, que solo existen desde `0.1.5-rc.2`:
  - `data-chat-flow-kind` / `data-chat-turn` / `data-chat-anchor-key` (marcadores autoritativos de turno y fila)
  - la distinción `data-chat-flow-kind="text"` frente a `"reasoning"` (para tomar el **cuerpo de la respuesta** y omitir el razonamiento)
  - el número de turno dentro del `aria-label` de cada marca (`chat.turnNavigation.jump`)
  - `*_bubble` / `*_previewPrompt` / `*_previewResponse` (texto del prompt y respaldo de vista previa oficial)
- **Verificado en**: `0.1.5-rc.2`, `0.1.6-alpha.1/2` y **`0.2.0-rc.1`** (última actual).
- **Compatible con el rediseño rompedor de `0.2.0-rc.1`**: esa versión **eliminó la clase `markPosition`** y pasó el riel a **renderizado virtualizado**. Este plugin ahora se ancla en el **propio botón de marca**, válido en ambas generaciones, y vuelve a leer el DOM cada vez en lugar de cachear referencias a elementos.
- **Cómo se integra**: se basa en **atributos de datos** oficiales (`data-chat-*`) y en `aria-label` en lugar de hashes frágiles de CSS Modules, usando subcadenas de clase «prefijo hash + guion bajo» solo cuando es realmente necesario.
- **Dependencias**: una mejora puramente del lado del cliente. Sin otros plugins, sin servicio en el host y sin configuración adicional.

## Instalación

```sh
dsh plugin --profile web add dsh-chat-toc
```

Tras actualizar, recarga la pestaña de `dsh web` en tu navegador.

## Licencia

MIT
