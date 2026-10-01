# Markdown Plus

Markdown Plus is a Chrome Manifest V3 extension that turns local Markdown files into a polished, multi-format reading workspace. Markdown is the direct entry format; from an active viewer, the Files explorer can also open text, SQL, Mermaid, raster-image, and SVG documents without taking over those file types globally.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Development](#development)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Privacy](#privacy)
- [Contributing](#contributing)
- [License](#license)

## Features

- Activates only for local `file:` Markdown-family documents: `.md`, `.markdown`, `.mdown`, and `.mdc`.
- Opens `.txt`, `.sql`, `.mermaid`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.bmp`, `.ico`, `.apng`, and `.svg` from the Files explorer. SQL receives theme-aware Shiki highlighting with a plain-text fallback; SVG is displayed as an image resource rather than mounted as inline markup.
- Renders Markdown through `markdown-it`, enabled plugins, optional Shiki highlighting, and DOMPurify before inserting article HTML. React owns the Viewer chrome and does not reconcile the rendered article subtree.
- Ships core plugins for code-highlight gating, task lists, heading anchors, and table enhancement, plus lazy-loaded plugins for emoji, footnotes, Math/KaTeX, and Mermaid. Every registered plugin is enabled by default and can be disabled from the Popup.
- Provides independently collapsible and resizable Files and Outline rails, configurable auto-hiding overlay scrollbars, responsive actions, a reduced-motion-aware Back to top control, and optional Markdown statistics for words, Unicode characters including spaces, and estimated reading time.
- Browses supported sibling files or recursively scans a selected workspace with configurable depth/file/folder limits, nested `.gitignore` handling, progress and cancellation, directory-picker fallback, per-folder expand/collapse, active-file reveal, refresh, and file-row actions.
- Keeps internal document navigation inside the Viewer. Real-file routes preserve the original Markdown entry URL using `?f=relative/path`; browser refresh and Back/Forward restore the selected real file and heading. Virtual workspace navigation remains in memory and intentionally leaves the browser URL unchanged.
- Offers an experimental, opt-in Markdown editor for local files. A session starts only after the user selects and verifies the exact original file; CodeMirror 6 is loaded lazily and provides split/focus modes, live sanitized preview, editor-to-preview scroll sync, Outline-to-source navigation, search/replace, persisted preferences, save shortcuts, dirty-state protection, and external-change detection.
- Includes built-in and user-authored themes with semantic colors, selectable bundled syntax themes, and theme-owned `none`, solid, gradient, static-image, or animated-image backgrounds. Settings owns theme authoring; the Popup selects existing themes.
- Renders fenced and standalone Mermaid through either the official Mermaid renderer or the alternative Beautiful Mermaid renderer. Fenced diagrams render when they approach the viewport; rendered diagrams support source copying, a pan/zoom lightbox, and SVG or PNG export at `1x`–`4x`.
- Opens rendered images in a keyboard-accessible pan/zoom lightbox with fit, zoom, drag, wheel, and pinch interactions.
- Exposes capability-driven actions: printing for every rendered document format, source/rendered switching for standalone Mermaid, and HTML or Word (`.doc`) export for Markdown. Chrome's print dialog can be used to save PDF.
- Keeps recent local Markdown files in device-local extension storage, with Popup reopen/clear actions and configurable retention. Preferences use `chrome.storage.sync` with a local fallback.
- Provides a full Settings page for activation, file-access status, document statistics, scrollbar behavior, theme authoring, explorer policy, history/privacy, text-file limits, JSON settings import/export, reset workflows, and About/support information.

## Quick Start

### Prerequisites

- Node.js 20 or newer; the repository pins the preferred release in `.nvmrc`.
- Google Chrome with Developer mode enabled.

### Install and build

```bash
nvm use
npm install
npm run build
```

### Load the extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this repository's `dist/` directory.
4. Open the extension's **Details** page and enable **Allow access to file URLs**.
5. Open a local `.md`, `.markdown`, `.mdown`, or `.mdc` file in Chrome.

Chrome's file-URL access toggle is required for direct activation, sibling-file reads, and recent-file reopening.

## Development

Use the Node version in `.nvmrc` before running project scripts.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite + CRXJS development server. |
| `npm run watch` | Rebuild the extension in watch mode. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run build` | Generate a production extension under `dist/`. |
| `npm run preview` | Serve the built Vite output for inspection. |
| `npm run analyze` | Build and write the bundle visualization to `dist/stats.html`. |
| `npm run size:report` | Report total `dist/` size and the combined JavaScript asset size. |

Viewer styles live under `src/viewer/styles/**/*.scss` and are imported with `?inline` by `src/content/viewer-loader.js`. Vite compiles them into the lazily loaded Viewer content-script bundle; they are not standalone source CSS files.

Runtime truth is `src/**`, `manifest.json`, `vite.config.mjs`, and `package.json`. Treat `dist/**` as generated output and never edit it by hand.

See [DEV.md](DEV.md) for the development loop, architecture entry points, verification matrix, and troubleshooting notes.

## Project Structure

- `src/content` — cheap activation gate, page detection, raw-source extraction, Viewer style loading, and bootstrap.
- `src/viewer` — `MarkdownViewerApp`, document sessions/loaders/renderers, React chrome, Markdown pipeline, editor, explorer, navigation, actions, Mermaid services, and image interactions.
- `src/plugins` — core plugins, lazy optional plugins, defaults, hooks, and plugin lifecycle.
- `src/theme` — built-in palettes, custom-theme resolution, syntax-theme catalog, background descriptors, theme assets, and runtime CSS variables.
- `src/settings` — defaults, schema normalization/validation, migration, persistence service, and UI client.
- `src/popup` — recent files and quick Reader, Editor, and Plugins controls.
- `src/options` — full Settings UI, theme authoring, scan/privacy/resource policies, import/export, and reset flows.
- `src/background` — message routing, local file reads, downloads, broadcasts, file history, options-page routing, and IndexedDB theme assets.
- `src/messaging` — shared message types and the caller wrapper.
- `src/shared` — file-type registry, constants, utilities, logging, downloads/clipboard, settings diffs, reusable React primitives, and shared styles.
- `public` — static files copied into the packaged extension, including icons and the offscreen document.
- `assets` — reusable source artwork that is not packaged automatically.
- `sample` — local documents and media for manual smoke testing.

## Documentation

- [Documentation index](docs/README.md) — entry point for current project documentation.
- [Architecture Overview](docs/architecture-overview.md) — runtime flows, subsystem ownership, security boundaries, and task-to-source guidance.
- [Theme System](docs/theme-system.md) — theme schema, built-in/custom behavior, backgrounds, assets, extension workflows, and tests.
- [Design System](docs/design-system.md) — visual tokens, layout contracts, reusable components, and interaction conventions.
- [Design System Demo](docs/design-system-demo.html) — standalone static preview derived from the current Viewer language.
- [Gherkin Syntax](docs/gherkin-syntax.md) — Cucumber/Gherkin reference plus the Markdown fence integration supported by Markdown Plus.

## Privacy

Markdown Plus processes local documents in the browser and does not send their content to a developer-operated service. Recent file paths, verified editor file handles, and custom-theme images stay in device-local extension storage; synchronized preferences may contain descriptors but not theme-image binaries. User-authored remote resources and exported Math content can still contact their referenced third-party hosts.

See the [public Privacy Policy](https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/) for the user-facing disclosure.

## Contributing

1. Fork the repository and create a focused branch such as `feature/<name>` or `fix/<name>`.
2. Run `nvm use` and install dependencies.
3. Implement the change in the appropriate source boundary; do not edit `dist/**` manually.
4. Run `npm test` and `npm run build`. Add `npm run size:report` for bundle-sensitive changes.
5. Load `dist/` as an unpacked extension and smoke-test affected Chrome-only flows with local files.
6. Open a pull request with the problem, approach, verification steps, and screenshots or recordings for visible UI changes.

## License

[MIT](LICENSE)
