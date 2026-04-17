# markdown-plus

A Chrome Extension (MV3) that detects local Markdown files and turns raw text into a clean reading experience with a **React**-based viewer shell (toolbar, sidebar, TOC, Files explorer), themes, plugins, and customizable settings via a **React popup**.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Development](#development)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- Auto-detects Markdown-like pages (product gate: local `file:` `.md` / `.markdown` / `.mdown` plus detector heuristics).
- Renders content in a readable viewer layout (markdown-it → optional Shiki → DOMPurify → article `innerHTML`; React owns chrome only).
- Left sidebar Table of Contents with heading navigation.
- **Files explorer** (sidebar Files tab): browse Markdown siblings in the same folder; open a **workspace** to recursively scan a directory (configurable depth and safety limits), tree view with expand/collapse, scan progress and cancel, or **open another folder** via the system folder picker (File System Access API when available, otherwise Chrome’s directory picker); exit workspace to return to the flat sibling list.
- GitHub-inspired Light/Dark themes and typography controls.
- Built-in plugin system with core and optional plugins.
- Optional Mermaid support with diagram rendering.
- Mermaid export actions:
  - Download `SVG`
  - Download `PNG` with resolution options (`1x`, `2x`, `3x`, `4x`)
- **Print** and **export** (HTML / Word) from the toolbar when a real `file:` URL is active.
- User settings persisted through browser storage (`chrome.storage.sync` with local fallback).
- **Tech:** Vite, `@crxjs/vite-plugin`, `@vitejs/plugin-react`, React 19, SCSS inlined in the content script.

## Quick Start

### Prerequisites

- Node.js 20+
- Google Chrome (Developer Mode enabled)

### Install

```bash
nvm use 20
npm install
```

### Run in development

```bash
nvm use 20
npm run dev
```

### Build

```bash
nvm use 20
npm run build
```

### Load extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `dist/` folder (after build).
5. Open a `.md` page and verify the viewer is applied.

## Development

Available scripts:

- `npm run dev` - Start Vite + CRXJS (content script, popup JSX, and viewer SCSS rebuild into `dist/`).
- `npm run build` - Production extension output to `dist/`.
- `npm run watch` - Vite build in watch mode.
- `npm run preview` - Preview built output.

Development notes:

- Use Node 20 (`nvm use 20`) before running npm scripts.
- Viewer styles live in `src/viewer/styles/**/*.scss` and are imported with `?inline` from `src/content/index.js`, so Vite bundles them into the content script (no generated `.css` next to sources).
- Treat `src/**`, `manifest.json`, and `vite.config.mjs` as source of truth.
- Do not edit `dist/**` manually; regenerate it with `npm run build`.

## Project Structure

- `src/content` - Page detection, extraction, and viewer bootstrapping.
- `src/viewer` - **`MarkdownViewerApp`** (`app.js`) + React chrome (`react/*`: shell, sidebar, TOC, explorer, toast), async render pipeline (`core/*`), article clicks/hash scroll (`article-interactions.js`), plugin SVG helpers (`icons.js`), plugin tooltips (`dom-tooltip.js`), shared scroll math (`scroll-utils.js`), Files I/O helpers (`explorer/*` consumed by `useExplorer.js`).
- `src/plugins` - Plugin manager, plugin types, core plugins, and optional plugins (Mermaid/Math/Footnote/Emoji).
- `src/settings` - Default settings and persistence layer.
- `src/popup` - React settings UI (`PopupApp.jsx`, panels, `useSettingsPersistence`).
- `src/shared` - Utilities (`logger`, `deep-merge`, `clipboard`, `download`, `settings-diff`, `markdown-detect`) and **constants** (`viewer.js`, `explorer.js`, `tooltip.js`).
- `src/background` - Runtime messaging and settings handlers.

For an up-to-date file tree and module notes, see [`docs/project-overview-for-ai.md`](docs/project-overview-for-ai.md).

## Contributing

Contributions are welcome.

1. Fork the repository and create a branch:
   - `feature/<name>` or `fix/<name>`
2. Ensure Node 20 is active:
   - `nvm use 20`
3. Implement your changes in `src/**`.
4. Validate your changes:
   - Run `npm run build`
   - Load the extension and test with real Markdown pages
5. Open a Pull Request with:
   - Problem statement
   - Approach
   - Test steps
   - Screenshots/GIFs for UI changes (if applicable)

## License

[MIT](LICENSE)
