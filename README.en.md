# dsh-chat-toc (DSH Chat Outline & Native Turn Rail Enhancer)

[中文说明](./README.md) · [Documentación en Español](./README.es.md)

A native conversation navigation and table-of-contents enhancer for the DSH Web GUI: **deeply supercharges the official native Turn Rail** without adding redundant parallel tracks. Provides dual-layer preview popovers (User prompt + AI response), one-click bookmarks with golden glowing highlights, session-scoped persistent storage, and an ultra-clean inline top toolbar (Search / Starred filter / Markdown export).

## Features

- **100% Native Fusion & Zero Redundancy**:
  - Eliminates secondary side-by-side indicator tracks to preserve clean UI breathing room.
  - Directly attaches to DSH's native Turn Rail, transforming the minimal map into a flagship navigation experience.

- **Stable Hover Popovers (No Unexpected Dismissal)**:
  - **Dual Content Display**: Hovering any native rail mark reveals a clean preview card displaying both the **👤 User prompt** and **🤖 AI core response**.
  - **300ms Hover Bridge**: Keeps the card stably visible while moving the cursor leftward from the rail into the card, allowing smooth text selection and interaction without flashing dismissals.
  - **In-Card Actions (⭐ Bookmark & 📋 Copy)**: Directly embeds action buttons at the bottom of the card to star the conversation turn or copy the complete prompt and response.

- **Session-Scoped Persistent Storage**:
  - Scoped by stable **Session ID + message unique anchor keys (`chatAnchorKey`)**.
  - Survives page refreshes and browser restarts without losing any starred marks; clears only when the session is archived or deleted.

- **Inline Native Top Toolbar**:
  - Embedded right beside the "Session Logs" action button in the native top bar; avoids sidebar collisions and never causes dual body scrollbars.
  - **🔍 Instant & Deep Session History Search**: Instant fuzzy highlight for current page; **press Enter in long sessions to trigger Deep History Search**, automatically paging through earlier turns via the official "Load earlier" action until the target is found and smooth-scrolled into view!
  - **💻 Code & Tools Filter Capsules**: Quick filter pills (`All` · `Code 💻` · `Tools ⚙️`) below the search bar to isolate turns with code blocks or tool calls in long conversations.
  - **⭐ Starred-Only Filter**: Turns unstarred marks into subtle 8% opacities, while starred marks illuminate into **22px elongated golden lines with ambient particle glows**.
  - **📋 Export Markdown Outline**: One-click button to extract the entire conversation turn hierarchy as formatted Markdown.

- **Multilingual & Theme Adaptive**:
  - Automatically reactive to DSH Web language settings (Chinese / English / Spanish).
  - 100% compatible with both Light and Dark DSH themes.

## Screenshots

**1. Hover Card (Prompt + AI Response Preview with Inlined Star/Copy actions, and the Inline Top Toolbar):**

![Hover Card Preview](docs/toc-pop.png?v=0.4.10)

**2. Starred Filter Active (Starred marks shine in golden glow, non-starred marks dim down):**

![Rail Marks Highlight](docs/toc-bar.png?v=0.4.10)

## Requirements

- **DSH Web** with the official Turn Rail navigation (shipped inside `@deepseek-ai/dsh-web-app`); verified on **`@deepseek-ai/dsh@0.1.5-rc.2`**.
- **How it hooks in**: it locates the official rail by DOM **structure** — e.g. the `previewPrompt` node inside the official preview card — instead of fragile CSS-Module hashes, so it tolerates official minor upgrades far better.
- **Dependencies**: a pure client-side enhancement. No other plugins, no host-side service, no extra configuration.

## Installation

```sh
dsh plugin --profile web add dsh-chat-toc
```

After updating, refresh your `dsh web` browser tab to enjoy the upgraded experience.

## Feedback

Found a bug or have a suggestion? Feel free to open an issue on [GitHub Issues](https://github.com/a792883583/dsh-chat-toc/issues).

## License

MIT
