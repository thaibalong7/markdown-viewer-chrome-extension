# Markdown Plus — Architecture Overview

This is the canonical architectural overview of Markdown Plus. It is written for maintainers, contributors, and AI coding agents. It explains the current system rather than its implementation history or future roadmap.

Runtime truth lives in `src/**`, `manifest.json`, `vite.config.mjs`, and `package.json`. When this document and source disagree, follow the source and update this document in the same change when an ownership boundary, entry flow, or major module changes.

## Product scope

Markdown Plus is a Chrome Manifest V3 extension for reading local Markdown files in a dedicated viewer. A Markdown document is the entry point into a local workspace that can also display supported text, diagram, and image files.

Direct activation is limited to local `file:` URLs with `.md`, `.markdown`, `.mdown`, or `.mdc`. Once active, the Files explorer can also open `.txt`, `.sql`, `.mermaid`, raster images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.bmp`, `.ico`, `.apng`), and `.svg`. Non-Markdown formats do not activate the extension directly. `src/shared/file-types.js` defines this distinction.

## Technology and source boundaries

- Chrome Extension Manifest V3
- Chrome 109 or newer, as declared by `minimum_chrome_version`
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
| `src/theme/` | Built-in themes, custom-theme resolution, theme-owned background descriptors, local theme-asset client, and runtime CSS variables |
| `src/settings/` | Defaults, validation, persistence client, storage service |
| `src/popup/` | Recent files, theme selection, quick reader/editor/plugin controls, and Settings/About navigation |
| `src/options/` | Full settings, file-access status, custom-theme management, policy controls, import/export, reset workflows, and About/support information |
| `src/background/` | Message routing, local file reads, downloads, settings broadcasts, file history, and device-local theme assets |
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
3. `bootstrap.js` confirms the local Markdown-family URL, loads settings through background messaging, and extracts source from a single `<pre>` or the document body; registered empty and whitespace-only Markdown files still mount the Viewer.
4. `page-overrider.js` creates `mdp-viewer-root` inside the body and hides the raw representation.
5. `MarkdownViewerApp` mounts the React shell, creates its controllers, binds article interactions, and starts the initial render.

The Viewer intentionally uses light DOM. This keeps document text visible to browser features and other extensions that inspect body content. A dedicated root and stable `mdp-*` class hierarchy provide application isolation.

## Viewer application ownership

`src/viewer/app.js` exposes `MarkdownViewerApp`, the stable imperative boundary used by bootstrap. Focused responsibilities live under `src/viewer/app/`:

- `documentSessionController.js` owns current-document identity, loading, cancellation, capability publication, dirty-editor checks, and loaded-resource cleanup.
- `renderController.js` selects a renderer, cancels stale renders, runs renderer cleanup, publishes busy/TOC state, preserves scroll, and presents recoverable render errors.
- `editorSessionController.js` owns edit mode, dirty/save state, debounced preview, and save errors.
- `watchSessionController.js` owns visible-tab Markdown polling, stable-change confirmation, pending updates, retries, and coordination with editor/save state. `readingActivityGuard.js` owns the input/selection guard and cleans up its listeners with the watch lifecycle.
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

`src/viewer/documents/renderer-registry.js` dynamically resolves Markdown, plain-text, SQL, Mermaid, and image renderers. Empty Markdown documents render an explicit state while retaining normal Markdown edit capabilities. A new format starts in the file-type registry, then adds a loader strategy and renderer. Viewer chrome should continue to consume capabilities rather than add format-specific URL checks.

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

`src/viewer/article-interactions.js` owns delegated article link, heading-anchor, code-copy, and zoomable-image behavior. Loaded, non-linked article images become keyboard-operable zoom targets; `src/viewer/image-lightbox.js` provides fit, pan, wheel/pinch zoom, keyboard shortcuts, focus return, and teardown for both Markdown images and standalone image documents.

## React shell and shared UI

Viewer React code lives under `src/viewer/react/`. `mount.js` owns the React root and exposes an imperative handle to `MarkdownViewerApp`; `ViewerApp.jsx` composes the shell and context providers.

Major ownership:

- `ViewerShell.jsx`: overall layout and rendered-article boundary;
- `BackgroundScene.jsx`: trusted full-viewport rendering for the active theme's structured background descriptor, page-visibility pausing, reduced-motion handling, and local image URL cleanup;
- `Sidebar.jsx` and `FilesPanel.jsx`: left Files panel;
- `RightRail.jsx` and `OutlinePanel.jsx`: document actions and heading navigation;
- `EditorPanel.jsx` and `StatusBar.jsx`: CodeMirror shell and editor state;
- `DocumentStats.jsx`: opt-out Markdown word/character/reading-time summary derived from the original source;
- `ViewerScrollbar.jsx`: keyboard- and pointer-operable overlay scrollbars for reading, preview, and editor scroll roots;
- `ScrollToTopButton.jsx`: responsive, reduced-motion-aware return-to-top action in read mode;
- `FloatingActions.jsx`: capability-driven document commands;
- `src/viewer/react/hooks/useExplorer.js`: React composition around explorer workflows.

Reusable application primitives and styles live under `src/shared/react/` and `src/shared/styles/`. Shared icon geometry lives in `src/shared/icons/`: the application family uses a 24px grid and 1.8 stroke, while explorer identities use a separate native 16px grid, fixed colors, and 1.25 stroke. React adapters (`AppIcon`, `FileTypeIcon`) and the imperative `createAppIconSvg` helper consume the same trusted definitions; Viewer compatibility components contain no separate geometry. Surface-specific layout remains local to Viewer, Popup, or Options.

Files and Outline can collapse independently and retain a narrow interaction gutter or actions rail. Their drag widths, Files Details expansion, explorer mode, expanded folders, and editor split width are tab-session preferences in `sessionStorage`; the Outline width can fall back to `layout.tocWidth`, while Files falls back to its runtime default. Files retains its title in both modes, with a Workspace badge only in workspace mode; its location/count row identifies the current folder or selected workspace root. Files Details starts closed and opens through its standalone disclosure, preserving either stored preference. `ExplorerHeader.jsx` owns metadata disclosure and context actions; `useExplorerDetailsLayout.js` measures the heading row’s content width, complete title/badge width and pointer density with cleaned-up observers/listeners; `ExplorerContextActions.jsx` shows contextual commands directly while space permits, overflowing only the remainder into the shared ActionMenu. When details expands, Copy moves beside the filename and Open/Switch folder becomes a labeled card-footer button. Back/Leave workspace is a separate labeled button beneath Open/Switch folder inside the same card footer when expanded and returns to a compact header command when collapsed; the disclosure stays in the header. Hidden metadata stays mounted for height animation but becomes invisible and inert immediately. Scan entry synchronizes the presented mode/root; progress through nested folders does not replace the workspace-root label. Tree controls, progress/cancel and warnings remain available. Viewer scrollbars can auto-hide or remain visible. Document statistics are shown only for loaded Markdown in read mode, count Unicode code points including whitespace, estimate reading time at 200 words per minute, and can be disabled from Settings.

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

## File list refresh

The Files rail Refresh file list command only rescans the current folder/workspace. `explorer-list-refresh.js` owns the command and availability policy; `useExplorer` only wires refs, progress and the action. It does not reload the document, enter navigation, discard drafts, reset the route, or fall back to the entry document. Expanded folders and tree scroll are retained. File-URL workspace rescans use `openWorkspaceFolder({ listOnly: true, keepCurrentDocumentOnMissing: true })`; failure retains the previous list without changing the article. Handle/snapshot workspaces currently require selecting the folder again to rescan the list. Document updates owns Markdown source checks and revision application independently; non-Markdown live refresh remains outside Watch's scope.

## Markdown watch mode

`settings.watch.mode` supports `ask` (default), `auto`, and `off`, configured in General settings. Viewer chrome exposes a compact Document updates control in the action rail, including while editing. Its popover contains mode/status, Check now and the pending-update action; a static dot and a deduplicated live announcement indicate pending changes or errors without opening an overlay or moving focus. Watch checks only the active Markdown document while the tab is visible, about every two seconds; a changed source must match a second read after 400 ms for manual/Ask checks, or 1.5 seconds for automatic checks. Automatic replacement is limited to once per five seconds and deferred during recent scroll/input activity or a held pointer. Input must be idle for 1.5 seconds before resuming; persistent article selection, focus, or an open Watch popover do not create an indefinite lock. A deferred automatic update also exposes the same one-click manual fallback as Ask. Each eventual apply uses newly read source. Continuous writes retain a stable pending indicator. Manual actions stay enabled during background polling; a manual request cancels a background stability check and runs after its I/O settles, without overlapping reads. Automatic applies do not emit success toasts, and in-place renders retain the existing outline until the replacement outline is ready. Errors back off up to 30 seconds and keep current content. Watch reads have a 5 MiB source limit and reuse the document loader and existing background/offscreen route without additional permissions.

The document session retains the current workspace reader and a disk baseline independent of the editor draft. File URLs and fresh `getFile()` handles support watch; snapshot-only workspace `File` objects explain that the workspace must be selected again. Explorer reader replacement invalidates pending reads and updates the current workspace reader. Navigation, settings changes, visibility changes, Save, and teardown invalidate stale work; reads do not overlap.

Automatic updates apply only in read mode. Edit mode, edit preparation, dirty drafts, and Save block automatic replacement. Loading a pending revision rereads disk and always requires explicit confirmation that edit mode will close; a dirty draft receives a destructive warning that it will be permanently discarded. Existing save-time disk conflict checks remain authoritative; successful writes advance the disk baseline with the exact saved source, while typing during Save remains dirty. Watch updates bypass navigation/history and explorer rescans.

`navigation/reading-position.js` preserves heading/text, section offset, and ratio fallback through render. Render lifecycle owns user-input listeners and a short ResizeObserver window for late layout changes; user navigation cancels restoration. Revision sources stay in tab memory.

## Change Review

The document session assigns source revision ids independently of reader invalidation and keeps only the previous accepted source from the most recent external apply. Navigation and successful internal Save clear that previous snapshot. Ask/Off review accepted source against pending disk source, retaining the latest applied comparison when no update is pending. Auto opens the comparison from the most recent apply, even when a newer disk revision is deferred; that pending comparison is offered separately through Review latest. Edit protection selects only accepted baseline against pending disk source. Editor preview text never becomes a review baseline.

`react/components/ChangeReview.jsx` exposes View changes in the document action rail and lazily imports `ChangeReviewPanel.jsx` on demand. `review/review-pair.js` owns explicit pair selection: polling cannot replace a pinned comparison; Review latest selects the available pair, and document navigation closes the review. Disk checks continue while review is open. The open dialog does not itself block automatic article replacement after recent input stops; the pinned diff remains unchanged even if Auto applies a newer source underneath it. Loading the latest disk version still uses Watch’s fresh-read and dirty-draft confirmation path, and can load a version newer than the pinned comparison.

`review/line-diff.js` computes a bounded Myers source-line diff with old/new line numbers, exact line endings, counts and three lines of context per region. `review/change-review.js` derives affected sections from Markdown parser heading tokens and source ranges, including Setext headings and duplicate names, excluding fenced/indented code. It maps surviving old headings through unchanged lines; deleted headings retain their old names without a destination. Limits are 512 Ki UTF-16 code units per source, 20,000 lines per source, one million diff work steps, an 80 ms cooperative computation budget, and 2,000 output rows. Size/work/output excess or a time-budget overrun produces an explicit fallback to external diff tools; parsing is bounded by source size and checked after completion rather than preempted.

React renders review text safely without inserting source HTML or reconciling the article. Change Review and editor confirmations share `react/components/common/ModalDialog.jsx`, `useModalDialog.js`, and `_modal-dialog.scss`; native dialog modality makes the background inert, contains focus, and handles nested confirmations. The shared hook owns Escape/outside dismissal and focus return without scrolling; `useReviewNavigation.js` owns region focus and Alt+Up/Down navigation. `review/review-navigation.js` allows section navigation only for existing article headings when the current generation, accepted source and completed render match the reviewed new source in read mode. No source history is persisted, and review does not merge drafts or bypass Save conflict checks. User behavior, limits, and the implementation map are documented in [`document-updates-and-change-review.md`](./document-updates-and-change-review.md).

## Plugins, Mermaid, and code highlighting

Plugin ids/defaults live in `src/plugins/plugin-types.js`; registration and lifecycle hooks live in `src/plugins/plugin-manager.js`.

- Core: code-highlight gating, task lists, heading anchors, table enhancement.
- Optional: emoji, footnotes, Math/KaTeX, Mermaid.

All registered plugins are enabled by default. Optional plugins are dynamically imported when enabled, so users can still disable specialized behavior and avoid loading its implementation. Hooks can extend Markdown, preprocess source, postprocess HTML, and attach behavior after render. Plugin-produced article HTML remains inside the sanitizer path.

Plugin execution is fault-isolated per plugin. A failed optional import or lifecycle hook quarantines only that plugin for the current render context, while the remaining plugins and basic Markdown continue. Cleanup handlers run independently, failures are logged with plugin/stage metadata rather than document content, and the Viewer surfaces one non-blocking warning toast for the affected render lifecycle.

Shiki uses explicit language and theme loaders from `src/viewer/core/shiki-config.js`. The curated syntax-theme catalog in `src/theme/syntax-themes.js` must stay aligned with those loaders.

Each reader theme is a complete visual entity. `src/theme/index.js` owns built-in palettes and resolves `theme.activeId` across built-in and saved custom themes; every resolved theme includes semantic colors, a resolved bundled syntax-theme id, and a structured background descriptor. Custom themes may follow their built-in base's syntax theme or select another curated bundled theme. `src/theme/backgrounds.js` resolves the supported `none`, `solid`, `gradient`, and local `image` descriptor variants into trusted render data. `BackgroundScene` renders the active theme's background behind the Viewer grid while sidebar and content surfaces remain theme-colored overlays. Settings never accept arbitrary CSS, raw syntax-theme JSON, or remote URLs.

For the complete theme schema, source map, custom-theme workflow, asset lifecycle, extension guidance, and test checklist, see [`theme-system.md`](./theme-system.md).

Standalone and fenced Mermaid share `src/viewer/mermaid/` services for renderer loading, SVG sanitization, theme mapping, errors, lightbox behavior, and export actions.

## Settings, storage, and messaging

Settings ownership:

- `src/settings/default-settings.js`: default shape;
- `src/settings/settings-schema.js`: normalization, validation, and hard ranges;
- `src/settings/settings-service.js`: storage key, safe merge, save, reset;
- `src/settings/settings-client.js`: Popup/Options request client;
- `src/settings/index.js`: compatibility exports.

Preferences use `chrome.storage.sync` with local fallback. Recent local-file history is stored separately in `chrome.storage.local` and follows its privacy/retention policy.

The current preference shape also owns Viewer activation, typography, TOC/content sizing, overlay-scrollbar visibility, Markdown document-stat visibility, the Document Updates mode, plugin states, explorer policies and scan limits, recent-file policy, standalone text-file limits, and opt-in editor preferences. The Settings page owns the full policy/import/export/reset surface; the Popup owns quick Reader, Editor, Plugins, and Recent controls.

Theme settings use `theme.activeId` plus `theme.customThemes`. The Settings page is the only authoring surface: it creates, names, edits, and deletes custom themes and configures their colors and background. The Popup is a selector only and lists built-in themes together with saved custom themes. Custom theme records are validated, bounded, and synchronized with settings; incompatible version-1 `theme.preset` data is migrated explicitly.

Custom theme images are device-local assets. Settings validates supported raster and animated-image formats with a 5 MiB limit, then the background service persists each Blob in IndexedDB under an independent `assetId`; the synchronized theme descriptor stores only that reference, presentation settings, motion, dimming, and an asset revision. The Viewer requests the active theme asset through centralized messaging, creates a session object URL, and revokes it when the theme changes or the Viewer unmounts. Replacing or deleting a custom theme removes its superseded asset, and reset clears the complete theme-asset store.

Message names are centralized in `src/messaging/index.js`. UI/content callers use `sendMessage()`; background services own browser APIs. Normal responses use `{ ok: true, data }` or `{ ok: false, error }`.

`src/background/message-router.js` routes settings, history, local reads, downloads, and theme-asset lifecycle calls. Offscreen fetch wire messages bypass that router. Successful settings save/reset broadcasts `SETTINGS_UPDATED` so viewers can update, rerender, mount, or teardown. The response confirms persistence after dispatching these notifications, without waiting for tab replies or Viewer rendering.

## Security and privacy boundaries

- Direct activation and background file reads are restricted to local `file:` URLs.
- Markdown/plugin HTML passes through DOMPurify before insertion.
- External website links receive `noopener noreferrer` protection.
- Plain text and raw Mermaid use text-only DOM APIs.
- SVG documents render as image resources, never inline source markup.
- Custom theme backgrounds accept structured colors and gradients or bounded local raster/animated images only, never arbitrary CSS, inline SVG, or remote image URLs.
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
| Viewer chrome, stats, scrollbars | `src/viewer/react/components/ViewerShell.jsx`, `DocumentStats.jsx`, `ViewerScrollbar.jsx`, `ScrollToTopButton.jsx` |
| Files/workspace | `src/viewer/explorer/`, `src/viewer/react/hooks/useExplorer.js` |
| Links/history | `src/viewer/navigation/`, `explorer-navigation.js` |
| Editor/save | `src/viewer/app/editorSessionController.js`, `src/viewer/editor/` |
| Document updates/review | [`docs/document-updates-and-change-review.md`](./document-updates-and-change-review.md), `src/viewer/app/watchSessionController.js`, `src/viewer/review/` |
| Plugins | `src/plugins/plugin-manager.js`, `src/plugins/core/`, `src/plugins/optional/` |
| Theme/background/Shiki | [`docs/theme-system.md`](./theme-system.md), `src/theme/index.js`, `src/theme/backgrounds.js`, `ThemeSettings.jsx`, `BackgroundScene.jsx`, `src/viewer/core/shiki-config.js` |
| Settings | `src/settings/`, `src/background/message-router.js` |
| Popup/Options | `src/popup/`, `src/options/`, `src/shared/react/` |
| Print/export | `src/viewer/actions/document-actions.js`, `src/shared/download.js` |
| Article/image interactions | `src/viewer/article-interactions.js`, `src/viewer/image-lightbox.js` |

## Verification

Use Node.js 20 or newer and the scripts in `package.json`:

```bash
npm test
npm run build
npm run size:report
```

Run tests for behavior changes, add a production build for packaged/runtime changes, and use the size report for bundle-sensitive changes. Chrome-only flows—file access, workspace selection, Back/Forward, document watching/review, editing, and exports—still require an unpacked-extension smoke test from `dist/`.
