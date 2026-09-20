# markdown-plus

A Chrome Extension (MV3) that opens local Markdown files as a polished multi-format workspace. Its **React** viewer shell can navigate Markdown, plain text and SQL, Mermaid diagrams, raster images, and SVG files from the Files explorer while keeping Markdown editing, themes, plugins, and exports capability-aware.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Development](#development)
- [Project Structure](#project-structure)
- [Privacy](#privacy)
- [Contributing](#contributing)
- [License](#license)

## Features

- Auto-activates for local `file:` Markdown-family documents: `.md`, `.markdown`, `.mdown`, and `.mdc`.
- Renders content in a readable viewer layout (markdown-it → optional Shiki syntax highlighting → DOMPurify → article `innerHTML`; React owns chrome only). Shiki uses an explicit language allowlist (`@shikijs/langs` + `github-light` / `github-dark` themes) to keep the extension package smaller than the full `shiki/bundle/web` set.
- Opens `.txt`, `.sql`, `.mermaid`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.bmp`, `.ico`, `.apng`, and `.svg` from an active viewer without taking over those formats when opened directly. SQL has a dedicated, theme-aware syntax-highlighted view with a safe plain-text fallback; plain text and raw Mermaid use text-only DOM APIs; SVG is displayed only as an image resource.
- Dedicated right-side rail with document actions and an independently scrollable Outline for heading navigation.
- Loading UX improvements: reusable skeleton placeholders for Outline TOC hydration, Files explorer loading state, and popup settings boot.
- **Files explorer** (dedicated, independently resizable left panel): browse every supported sibling format in the same folder; use file-row actions to open in a new tab, copy a link, or copy the file name; open a **workspace** to recursively scan a directory (configurable depth and safety limits), tree view with per-folder expand/collapse and a two-stage **Collapse folders** action (first keep the open file’s ancestor path visible, then collapse that path), scan progress and cancel, or **open another folder** via the system folder picker (File System Access API when available, otherwise Chrome’s directory picker); exit workspace to return to the flat sibling list. Format-specific icons distinguish Markdown, text, SQL, Mermaid, raster, and SVG documents.
- **Internal document navigation from Markdown**: click a relative or absolute link to any supported document and open it in the same viewer without a full page reload. Real-file navigation keeps the original Markdown entry URL stable and records the open file as a compact `?f=relative/path` route, so refresh and browser Back/Forward restore the document and heading. Workspace navigation intentionally leaves the URL unchanged, so refresh returns to the original file. Active-file reveal, cross-folder scans, spaces/Unicode filenames, and format changes stay coordinated; modifier keys and external or unsupported links keep their default browser behaviour.
- **Inline Markdown editor** for local `file:` Markdown documents: toggle Edit from the floating actions, use a lazy-loaded CodeMirror 6 editor in split preview or focus mode, live-render through the existing sanitized viewer pipeline, sync editor scroll to preview, navigate TOC items back to editor source, resize the split panes, search/replace, and save with File System Access API plus download fallback.
- GitHub-inspired Light/Dark themes and typography controls, with a persistent Light/Dark quick toggle in the floating actions.
- Built-in plugin system with core and optional plugins.
- Optional Mermaid support with diagram rendering (diagrams render when they enter the viewport).
- Mermaid lightbox viewer:
  - Open from the chart itself or the toolbar expand button
  - Full-screen pan/zoom with theme-aware overlay UI
  - Controls for zoom in, zoom out, re-center, and close
  - Keyboard shortcuts: `Esc` to close, `+` / `-` to zoom, `0` to re-center
  - Higher-density `2x` lightbox rendering for sharper zoomed diagrams
- Mermaid export actions:
  - Download `SVG`
  - Download `PNG` with resolution options (`1x`, `2x`, `3x`, `4x`)
- Capability-driven document actions: Print is available for rendered formats; Edit and HTML/Word export remain Markdown-only; standalone Mermaid adds an accessible rendered/source toggle.
- User settings persisted through browser storage (`chrome.storage.sync` with local fallback).
- **Tech:** Vite, `@crxjs/vite-plugin`, `@vitejs/plugin-react`, React 19, CodeMirror 6 (lazy-loaded editor), Shiki (`shiki` core + `@shikijs/langs` / `@shikijs/themes`), SCSS inlined in the content script. KaTeX CSS for Math is loaded only when the Math plugin is enabled.

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
- `npm run analyze` - Production build with `rollup-plugin-visualizer` (writes `dist/stats.html`).
- `npm run size:report` - Quick `du` summary of `dist/` and total size of `dist/assets/*.js`.

Development notes:

- Use Node 20 (`nvm use 20`) before running npm scripts.
- Viewer styles live in `src/viewer/styles/**/*.scss` and are imported with `?inline` from `src/content/viewer-loader.js` (loaded after the thin `src/content/index.js` gate), so Vite bundles them into the viewer content script (no generated `.css` next to sources).
- Treat `src/**`, `manifest.json`, and `vite.config.mjs` as source of truth.
- Do not edit `dist/**` manually; regenerate it with `npm run build`.

## Project Structure

- `src/content` - Page detection, extraction, and viewer bootstrapping.
- `src/viewer` - **`MarkdownViewerApp`** (`app.js`) + document session/load/render adapters (`app/*`, `documents/*`), shared Mermaid rendering (`mermaid/*`), React chrome (`react/*`), Markdown pipeline (`core/*`), CodeMirror editor (`editor/*`), article interactions/navigation, and Files explorer workflows.
- `src/plugins` - Plugin manager, plugin types, core plugins, and optional plugins (Mermaid/Math/Footnote/Emoji).
- `src/settings` - Default settings and persistence layer.
- `src/popup` - React settings UI (`PopupApp.jsx`, panels, `useSettingsPersistence`).
- `src/shared` - Utilities including the central `file-types.js` registry, logging, settings diffs, clipboard/download helpers, reusable React primitives and styles, and shared constants.
- `src/background` - Runtime messaging and settings handlers.

For an up-to-date file tree and module notes, see [`docs/project-overview-for-ai.md`](docs/project-overview-for-ai.md).

## Privacy

Markdown Plus processes local documents in the browser and does not send their
content to a developer-operated server. See the
[public Privacy Policy](https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/)
for storage details and the limited cases where document resources or exported
Math content may contact a third party.

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
