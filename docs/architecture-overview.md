# Markdown Plus — Architecture Overview

This is the canonical architectural overview of Markdown Plus. It is written for maintainers, contributors, and AI coding agents. It explains the current system rather than its implementation history or future roadmap.

Runtime truth lives in `src/**`, `manifest.json`, `vite.config.mjs`, and `package.json`. When this document and source disagree, follow the source and update this document in the same change when an ownership boundary, entry flow, or major module changes.

## Product scope

Markdown Plus is a Chrome Manifest V3 extension for reading local Markdown files in a dedicated viewer. A Markdown document is the entry point into a local workspace that can also display supported text, diagram, and image files.

Direct activation is limited to local `file:` URLs with `.md`, `.markdown`, `.mdown`, or `.mdc`. Once active, the Files explorer can also open `.txt`, `.sql`, `.mermaid`, raster images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.bmp`, `.ico`, `.apng`), and `.svg`. Non-Markdown formats do not activate the extension directly. `src/shared/file-types.js` defines this distinction.

## Technology and source boundaries

- Chrome Extension Manifest V3
- Vite with `@crxjs/vite-plugin`
- React 19 for Viewer chrome, Popup, and Settings
- JavaScript modules for services, document orchestration, rendering, and plugins
- SCSS compiled by Vite and bundled into the content script
- `markdown-it` plus `markdown-it-anchor` for Markdown
- Shiki for fenced-code highlighting and DOMPurify for HTML sanitization
- CodeMirror 6 for the lazy-loaded Markdown editor
- Mermaid and KaTeX as optional, dynamically loaded rendering dependencies
- Node.js 20 or newer for development

`dist/**` is generated output. Runtime-packaged static files live under `public/`; reusable source artwork lives under `assets/`.

## Runtime layers

| Layer | Primary ownership |
| --- | --- |
| `src/content/` | Activation gate, page detection, raw Markdown extraction, viewer mount |
| `src/viewer/` | App orchestration, document sessions, renderers, navigation, editor, explorer, React chrome |
| `src/plugins/` | Core and optional Markdown extensions |
| `src/theme/` | Reader presets and runtime CSS variables |
| `src/settings/` | Defaults, validation, persistence client, storage service |
| `src/popup/` | Recent files and quick reader/editor/plugin controls |
| `src/options/` | Full settings, diagnostics, import/export, and reset workflows |
| `src/background/` | Message routing, local file reads, downloads, settings broadcasts, file history |
| `src/messaging/` | Shared message names and caller wrapper |
| `src/shared/` | File registry, utilities, constants, React primitives, and shared styles |

## Entry and mount flow

```text
src/content/index.js
  -> src/content/viewer-loader.js
  -> src/content/bootstrap.js
  -> src/viewer/app.js
```

1. `content/index.js` performs a cheap `file:` and Markdown-family check using the shared file-type registry. Unsupported pages do not load the heavier Viewer bundle.
2. `viewer-loader.js` imports Viewer SCSS as compiled strings and starts bootstrap. It also applies settings broadcasts and tears down the viewer when the extension is disabled.
3. `bootstrap.js` confirms the page looks like Markdown, loads settings through background messaging, and extracts source from a single `<pre>` or the document body.
4. `page-overrider.js` creates `mdp-viewer-root` inside the body and hides the raw representation.
5. `MarkdownViewerApp` mounts the React shell, creates its controllers, binds article interactions, and starts the initial render.

The Viewer intentionally uses light DOM. This keeps document text visible to browser features and other extensions that inspect body content. A dedicated root and stable `mdp-*` class hierarchy provide application isolation.

## Viewer application ownership

`src/viewer/app.js` exposes `MarkdownViewerApp`, the stable imperative boundary used by bootstrap. Focused responsibilities live under `src/viewer/app/`:

- `documentSessionController.js` owns current-document identity, loading, cancellation, capability publication, dirty-editor checks, and loaded-resource cleanup.
- `renderController.js` selects a renderer, cancels stale renders, runs renderer cleanup, publishes busy/TOC state, preserves scroll, and presents recoverable render errors.
- `editorSessionController.js` owns edit mode, dirty/save state, debounced preview, and save errors.
- `splitScrollSync.js` owns editor-to-preview scroll synchronization and cleanup.
- `viewerStyles.js` applies theme/layout variables and runtime style elements.
- `globalViewerListeners.js` owns `beforeunload`, save shortcuts, and view-mode keyboard behavior.
- `createExplorerBridge.js` connects React explorer actions to the document session.

The lifecycle is `init()` -> `updateSettings()` -> `destroy()`. Destruction must stay idempotent and release controllers, renderers, listeners, React roots, object URLs, and DOM references.

## Document model, loading, and capabilities

`src/shared/file-types.js` is the central registry for supported extensions, activation policy, content kind, renderer selection, explorer presentation, and capabilities such as outline, edit, export, print, view modes, and zoom.

`src/viewer/documents/document-model.js` creates identities containing `href`, display name, file-type id, source kind, and view mode. React UI state is derived from the identity and registry capabilities rather than scattered URL checks.

`src/viewer/documents/document-loader.js` is the I/O boundary:

- real text documents use the background/offscreen path because local page origins cannot reliably fetch sibling `file:` resources;
- workspace files use a `File` or `FileSystemFileHandle` supplied by the explorer;
- text, SQL, and Mermaid enforce the configured UTF-8 size limit;
- real images use normalized local URLs;
- workspace images use session-owned object URLs revoked during replacement or teardown.

`src/viewer/documents/renderer-registry.js` dynamically resolves Markdown, plain-text, SQL, Mermaid, and image renderers. A new format starts in the file-type registry, then adds a loader strategy and renderer. Viewer chrome should continue to consume capabilities rather than add format-specific URL checks.

## Rendering and DOM ownership

React owns Viewer chrome: shell, side panels, document actions, editor shell, loading states, and toasts. It does not reconcile rendered content under `.mdp-markdown-body`.

Markdown follows this path:

```text
source
  -> plugin manager / markdown-it extensions
  -> markdown-it HTML
  -> plugin HTML postprocessing
  -> optional Shiki highlighting
  -> DOMPurify sanitization
  -> article innerHTML
  -> plugin afterRender hooks
```

`renderDocument()` in `src/viewer/core/renderer.js` is the main safe-HTML boundary. Markdown and plugin HTML must pass through `sanitizeHtml()` before `renderIntoElement()` inserts it. Heading ids are shared by the Outline, hash navigation, and editor integration.

Other renderers use narrower paths:

- plain text uses `<pre><code>` and text-only DOM APIs;
- SQL uses sanitized Shiki output with a text fallback;
- standalone Mermaid uses the shared Mermaid service and sanitizer with rendered/raw modes;
- raster and SVG files render through `<img>`; SVG source is never mounted as inline markup.

Renderer event listeners and temporary resources belong to its cleanup lifecycle.

## React shell and shared UI

Viewer React code lives under `src/viewer/react/`. `mount.js` owns the React root and exposes an imperative handle to `MarkdownViewerApp`; `ViewerApp.jsx` composes the shell and context providers.

Major ownership:

- `ViewerShell.jsx`: overall layout and rendered-article boundary;
- `Sidebar.jsx` and `FilesPanel.jsx`: left Files panel;
- `RightRail.jsx` and `OutlinePanel.jsx`: document actions and heading navigation;
- `EditorPanel.jsx` and `StatusBar.jsx`: CodeMirror shell and editor state;
- `FloatingActions.jsx`: capability-driven document commands;
- `src/viewer/react/hooks/useExplorer.js`: React composition around explorer workflows.

Reusable application primitives and styles live under `src/shared/react/` and `src/shared/styles/`. Surface-specific layout remains local to Viewer, Popup, or Options.

## Files explorer and workspace

The explorer has sibling mode, which lists supported files beside the current document, and workspace mode, which recursively scans a selected directory and renders a tree.

Non-React workflows live in `src/viewer/explorer/`: scanning, workspace selection/restoration, cancellation, navigation, URL normalization, `.gitignore` matching, and session state. React adapters and reducer helpers live under `src/viewer/react/hooks/explorer/`.

Workspace selection prefers the File System Access API and can fall back to `webkitdirectory`. When real paths are unavailable, files receive `mdp-ws-*` virtual URLs backed by in-memory `File` objects or handles. Virtual workspace URLs must not be converted into fake `file:` URLs.

Sibling and workspace scans support `AbortController` cancellation. Explorer UI state is session-scoped; a real `file:` workspace root may be restored when settings allow it.

## Navigation and browser history

`src/viewer/navigation/link-resolver.js` classifies article links as same-document hashes, self-links, registered real documents, workspace documents, external links, assets, or unsupported links. Only supported internal documents are intercepted. Modifier keys, downloads, explicit targets, external URLs, and unsupported assets keep browser behavior.

For real files, `src/viewer/navigation/viewer-route.js` keeps the original Markdown entry stable:

```text
entry.md?f=relative/path/to/document.txt#heading
```

This supports reload and Back/Forward without making explorer-only formats direct activation entries. Workspace navigation does not write virtual paths into the browser URL; reload returns to the entry document.

Explorer navigation ultimately calls the document session's `openDocument()` path. That boundary coordinates loading, stale-request cancellation, rendering, active-file state, title, focus, and history.

## Markdown editor

Editing is an experimental opt-in feature controlled by `settings.editor.enabled`, which defaults to disabled. It is available only when document capabilities allow it and the source is a local Markdown URL; CodeMirror remains lazy-loaded until a verified edit session starts. If editing is disabled while a session has unsaved changes, that dirty session remains available for Save or Discard, but new edit sessions are blocked.

The editor reuses the sanitized Markdown pipeline for debounced previews. It supports split and focus layouts, editor-to-preview scroll sync, Outline-to-source navigation, dirty state, save shortcuts, exit/before-unload confirmation, search/replace, and persisted preferences.

Before edit mode opens, the user-facing safety gate shows the current local path and requires the original existing file to be selected through the File System Access API. `src/viewer/editor/file-io.js` verifies the exact filename and loaded content, requests write permission, persists the verified handle in IndexedDB, and records an in-memory disk baseline. Save writes only through that connected handle and blocks when the file changed externally; it never falls back to downloading a copy, and failures keep the editor dirty. Session policy remains in `editorSessionController.js`.

## Plugins, Mermaid, and code highlighting

Plugin ids/defaults live in `src/plugins/plugin-types.js`; registration and lifecycle hooks live in `src/plugins/plugin-manager.js`.

- Core: code-highlight gating, task lists, heading anchors, table enhancement.
- Optional: emoji, footnotes, Math/KaTeX, Mermaid.

Optional plugins are dynamically imported when enabled. Hooks can extend Markdown, preprocess source, postprocess HTML, and attach behavior after render. Plugin-produced article HTML remains inside the sanitizer path.

Shiki uses explicit language and theme loaders from `src/viewer/core/shiki-config.js`. Reader theme keys in `src/theme/index.js` must stay aligned with Shiki mappings.

Standalone and fenced Mermaid share `src/viewer/mermaid/` services for renderer loading, SVG sanitization, theme mapping, errors, lightbox behavior, and export actions.

## Settings, storage, and messaging

Settings ownership:

- `src/settings/default-settings.js`: default shape;
- `src/settings/settings-schema.js`: normalization, validation, and hard ranges;
- `src/settings/settings-service.js`: storage key, safe merge, save, reset;
- `src/settings/settings-client.js`: Popup/Options request client;
- `src/settings/index.js`: compatibility exports.

Preferences use `chrome.storage.sync` with local fallback. Recent local-file history is stored separately in `chrome.storage.local` and follows its privacy/retention policy.

Message names are centralized in `src/messaging/index.js`. UI/content callers use `sendMessage()`; background services own browser APIs. Normal responses use `{ ok: true, data }` or `{ ok: false, error }`.

`src/background/message-router.js` routes settings, history, local reads, and downloads. Offscreen fetch wire messages bypass that router. Successful settings save/reset broadcasts `SETTINGS_UPDATED` so viewers can update, rerender, mount, or teardown.

## Security and privacy boundaries

- Direct activation and background file reads are restricted to local `file:` URLs.
- Markdown/plugin HTML passes through DOMPurify before insertion.
- External website links receive `noopener noreferrer` protection.
- Plain text and raw Mermaid use text-only DOM APIs.
- SVG documents render as image resources, never inline source markup.
- Manifest permissions remain minimal and tied to concrete features.
- Logs contain intent and lightweight context, not document bodies.
- Local content is processed in the browser and is not sent to a developer-operated service. User-authored remote resources and exported Math assets can still contact their external hosts.

## Task-to-source map

| Task | Start with |
| --- | --- |
| Activation or detection | `src/content/index.js`, `page-detector.js`, `bootstrap.js` |
| Raw extraction | `src/content/raw-content-extractor.js`, `text-sampling.js` |
| Markdown/sanitization | `src/viewer/core/renderer.js`, `markdown-engine.js` |
| Document type/capability | `src/shared/file-types.js` |
| Loading/session | `src/viewer/documents/document-loader.js`, `documentSessionController.js` |
| Renderer behavior | `src/viewer/documents/renderer-registry.js`, `renderers/` |
| Viewer lifecycle | `src/viewer/app.js`, `src/viewer/app/` |
| Files/workspace | `src/viewer/explorer/`, `src/viewer/react/hooks/useExplorer.js` |
| Links/history | `src/viewer/navigation/`, `explorer-navigation.js` |
| Editor/save | `src/viewer/app/editorSessionController.js`, `src/viewer/editor/` |
| Plugins | `src/plugins/plugin-manager.js`, `src/plugins/core/`, `src/plugins/optional/` |
| Theme/Shiki | `src/theme/index.js`, `src/viewer/core/shiki-config.js` |
| Settings | `src/settings/`, `src/background/message-router.js` |
| Popup/Options | `src/popup/`, `src/options/`, `src/shared/react/` |
| Print/export | `src/viewer/actions/document-actions.js`, `src/shared/download.js` |

## Verification

Use Node.js 20 or newer and the scripts in `package.json`:

```bash
npm test
npm run build
npm run size:report
```

Run tests for behavior changes, add a production build for packaged/runtime changes, and use the size report for bundle-sensitive changes. Chrome-only flows—file access, workspace selection, Back/Forward, editing, and exports—still require an unpacked-extension smoke test from `dist/`.
