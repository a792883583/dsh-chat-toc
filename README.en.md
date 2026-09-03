# dsh-chat-toc

[中文](README.md) · [Español](README.es.md)

A chat table-of-contents plugin for the DSH Web GUI: a book-style outline bar on the right edge of the conversation; hover to expand the outline, click any entry to jump to that message.

## Features

- **Outline bar**: hugs the right edge of the chat area (left of the Git panel's collapse arrow). Each message is a tick mark — the longer the mark, the more content; user messages are blue, assistant messages green
- **Smart heading & summary extraction**: prioritizes Markdown headings (`##`) and key takeaway bold points as outline entries, keeping long technical threads and multi-step tasks organized without clutter
- **Current position highlight**: as you scroll, the mark for the current message is highlighted (synced between the bar and the popup list)
- **Hover to expand & Pin open**: move the mouse onto the bar to reveal the full outline; click the 📌 icon in the header to **pin the outline panel open** so it stays visible while browsing; click again or use the shortcut to unpin
- **Global keyboard shortcut**: press `Cmd/Ctrl + Shift + O` anytime to toggle or pin/unpin the table-of-contents overlay
- **Outline search**: the expanded outline has a search box that filters messages by summary/key in real time (case-insensitive), making it easy to find and jump to historical messages
- **Message bookmarks**: hover any outline entry and tap the star (⭐) to bookmark key messages (e.g. conclusions, API contracts); the outline header has a one-click "starred only" filter; bookmarks persist in browser localStorage across reloads
- **Export / Copy Markdown Outline**: the outline header provides a "📋 Copy outline" button to extract the entire conversation outline into a formatted Markdown tree in one click
- **Click to jump**: click any entry to smooth-scroll to the corresponding message
- **Multilingual**: follows the DSH Web UI language (Chinese / English); Spanish browsers automatically get Spanish copy; defaults to Simplified Chinese
- Light / dark theme follows the DSH Web GUI; coexists with dsh-git-panel, positions follow automatically

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
