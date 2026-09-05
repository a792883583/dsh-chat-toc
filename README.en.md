# dsh-chat-toc

[中文](README.md) · [Español](README.es.md)

A chat table-of-contents enhancement plugin for the DSH Web GUI: deeply integrates with and supercharges the official native Turn Rail without duplicate tracks; provides global shortcuts, search, bookmarks, and Markdown export.

## Features

- **Native Fusion & Zero Redundancy**: Seamlessly enhances the native DSH Turn Rail without generating a second redundant track, keeping the UI 100% clean and elegant.
- **Global Keyboard Shortcut**: Press `Cmd/Ctrl + Shift + O` anytime to toggle or pin/unpin the table-of-contents overlay, or click the subtle outline button at the top of the rail.
- **Smart Heading Extraction**: Prioritizes Markdown headings (`##`) and key takeaway bold points as outline entries, keeping long technical threads and multi-step tasks organized without clutter.
- **Pin Overlay Open**: Click the pin button in the header to lock the outline open on the right side while reviewing code or conversation.
- **Search & Quick Jump**: Full real-time search box at the top of the outline to filter messages by keyword and smooth-scroll to them instantly.
- **Message Bookmarks (⭐)**: Star key conclusions, plans, and API contracts for quick access; includes a "Starred only" toggle.
- **Export / Copy Markdown Outline**: One-click button to export the entire conversation hierarchy as formatted Markdown.
- **Automatic Session Sync**: Completely synchronized with DSH session navigation; automatically resets on fresh conversations.
- **Multilingual**: Auto-syncs with DSH Web GUI language (Chinese / English / Spanish).
- Light / dark theme follows DSH Web GUI.

## Screenshots

**Outline bar** (tick marks on the right edge of the chat after a few turns; the current message is highlighted):

![Outline bar](docs/toc-bar.png)

**Hover-expanded outline** (role color bar + number + summary, click to jump):

![Outline list](docs/toc-pop.png)

## Installation

```sh
dsh plugin --profile web add dsh-chat-toc
```

Restart `dsh web`, and after a few turns of conversation the outline bar appears on the right edge of the chat.

> For local development, install via a link instead: `dsh plugin --profile web add link:/path/to/dsh-chat-toc`. After editing source, run `npm run build` and refresh the page to see changes.

## Feedback

Found a bug or have a feature request? Open an issue on [GitHub Issues](https://github.com/a792883583/dsh-chat-toc/issues) — your feedback helps us make the plugin better.

## License

MIT
