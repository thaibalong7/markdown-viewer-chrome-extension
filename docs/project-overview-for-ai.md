# Markdown Plus - AI Project Overview

## 1) Project purpose

`Markdown Plus` is a Chrome Extension (Manifest V3) that detects Markdown-like pages and replaces raw/plain rendering with a structured viewer UI.

Current implemented core:
- Markdown detection from URL/content heuristics
- Raw Markdown extraction from page (`<pre>` or body text sampling)
- Viewer mount in overlay + Shadow DOM (when available)
- Markdown render pipeline: `markdown-it` → plugin hooks → optional **Shiki** fenced highlighting → `sanitizeHtml` → DOM
- **Reader themes** (`light` / `dark`, default `light`) aligned with **Shiki themes** for code blocks
- **Plugin registry** (task lists, heading anchors, table wrapper, code-highlight toggle) via lifecycle hooks
- Optional plugins (Mermaid, Math/KaTeX, Footnote, Emoji) with runtime toggle in Settings
- Mermaid chart actions: three-dot menu with `Download SVG` and `Download PNG` (1x/2x/3x/4x)
- Left sidebar TOC with click-to-scroll + active heading tracking
- **Files explorer** (sidebar **Files** tab): sibling `.md` list for the parent folder; **workspace mode** — recursive folder scan (Chrome `file:` directory listings via `FETCH_FILE_AS_TEXT` when a real `file:` root is known), depth/file/folder limits, tree UI with expand/collapse, progress + cancel, “Open this folder” / “Open another folder…” (native **directory picker** via File System Access API when available, else **webkitdirectory**; may fall back to in-memory virtual files without `file:` paths), session restore of workspace root for `file:` scans only; “Exit workspace” returns to sibling list
- **Internal Markdown link navigation**: clicking a relative/absolute link to another `.md` file opens it in the same viewer without full page reload. Link resolver (`src/viewer/navigation/link-resolver.js`) classifies links into kinds (same-document-hash, self-link, markdown-file, workspace-virtual-file, external, asset, unsupported). Click interception in `article-interactions.js` respects modifier keys, `target`, `download` attrs. Browser Back/Forward via `popstate`/`hashchange` coordination. Sidebar active-file sync on cross-folder navigation. Supports spaces, Unicode, encoded hrefs, parent folder traversal, and virtual workspace files. See `docs/internal-hyperlink-navigation-solution.md`.
- Loading skeleton UX: reusable `SkeletonLine` / `SkeletonBlock` primitives used by viewer sidebar (Outline + Files) and popup settings loading state
- Settings storage and runtime messaging
- **Extension popup (React)** for reader/plugins/general settings; minimal **options** page (JSON-oriented); no in-viewer settings drawer yet

## 2) Tech stack and runtime

- Runtime: Chrome Extension MV3
- Build tool: Vite + `@vitejs/plugin-react` + `@crxjs/vite-plugin`; viewer chrome styles authored in **SCSS** and compiled by Vite via `?inline` imports from `src/content/viewer-loader.js` (after the thin gate in `src/content/index.js`), bundled into the content script in `dist/**`; no standalone `.css` under `src/viewer/styles/`
- Languages: **Vanilla JavaScript (ES modules)** for content/background/viewer core/plugins; **React 19** for `src/popup/` and **viewer chrome** under `src/viewer/react/` (`ViewerApp.jsx`, shell/sidebar/explorer/toast)
- Markdown: `markdown-it` + `markdown-it-anchor`
- Fenced code highlighting: **Shiki** — `createHighlighterCore` from `shiki/core` with Oniguruma WASM (`shiki/engine/oniguruma`), explicit grammars from `@shikijs/langs` and themes from `@shikijs/themes` (see `src/viewer/core/shiki-config.js`; avoids shipping the full `shiki/bundle/web` language/theme set)
- Sanitization: `dompurify`
- Minimum Node engine: `>=20`

Source of truth:
- `src/**`
- `manifest.json`
- `vite.config.mjs`

Generated output:
- `dist/**` (do not hand-edit)

## 3) High-level architecture

### 3.1 Layers

- `background`: central runtime message handling and settings operations
- `content`: detect/extract/mount flow on web pages
- `viewer`: **React** shell (floating document actions, sidebar, TOC, Files explorer, toast) + **async** markdown render pipeline + imperative article interactions (no settings UI in-page yet)
- `theme`: preset color tokens + CSS variable builder + `applyThemeSettings()` on viewer root
- `plugins`: registered plugins, `plugin-manager` hooks (pre/post markdown/HTML)
- `settings`: defaults, storage key, deep-merge persistence in `src/settings/index.js`
- `popup` / `options`: UI entrypoints for reading/updating settings (popup is primary)
- `messaging`: message constants and shared `sendMessage()` in `src/messaging/index.js`
- `shared`: `logger.js`, `deep-merge.js`, `clipboard.js`, `download.js` (downloads + `DOWNLOAD_DATA_URL`), `settings-diff.js` (settings path diff / full-render gate), `markdown-detect.js` (pathname extension + `looksLikeMarkdownText`), `fs-handle-debug.js` (optional FS handle logging), `constants/viewer.js`, `constants/explorer.js`, `constants/tooltip.js` (hover delays for chrome tooltips), reusable React UI primitives in `shared/react/` and shared style partials in `shared/styles/`

### 3.2 Core flow (implemented)

1. Content script: `src/content/index.js` is a thin gate (local `file:` + `.md` only) and dynamically imports `src/content/viewer-loader.js`, which bundles compiled viewer SCSS (`?inline`) and injects those strings into the Shadow DOM (no `fetch` of per-sheet CSS assets). KaTeX CSS is not part of this path by default; it loads when the Math plugin runs (see `math.plugin.js` + `MarkdownViewerApp.injectViewerStyles`).
2. **Product gate:** `bootstrap.js` only mounts the viewer for **local `file:`** URLs whose path ends in `.md` / `.markdown` / `.mdown` (not remote pages).
3. `src/content/bootstrap.js` runs page detection via `detectMarkdownPage()` (uses `getTextSample` from `text-sampling.js` and `looksLikeMarkdownText` / pathname helpers from `shared/markdown-detect.js`).
4. If needed, fallback sampling checks whether page text resembles Markdown (`looksLikeMarkdownText` in `shared/markdown-detect.js`).
5. Content script fetches settings from background using `MESSAGE_TYPES.GET_SETTINGS`.
6. If enabled, Markdown is extracted (`single <pre>` preferred, else TreeWalker sampling via `getTextSample` in `text-sampling.js`).
7. `createViewerRoot()` mounts full-screen root and optional Shadow DOM.
8. `MarkdownViewerApp` calls **`mountViewerReact()`** (React root in the same container as injected `<style>` tags), awaits **`partsPromise`** → `{ root, article }`, applies theme CSS variables on `root`, composes **`createArticleInteractions()`** (hash links, copy, toast bridge, **internal Markdown link interception** via `resolveLink` + `navigateToFile` callbacks), runs **`await renderDocument()`** (async), **`renderIntoElement(article, html)`**, **`pluginManager.afterRender(...)`**, then **`syncTocItems()`** → React outline; a bridge-level `tocReady` flag avoids the initial “No headings found” flash by showing skeleton until TOC hydration completes; Files/workspace UI is **`useExplorer`** + `ExplorerPanel.jsx` inside the React tree.
9. On `MESSAGE_TYPES.SETTINGS_UPDATED`, content script calls `app.updateSettings()` or tears down / remounts when disabled.

### 3.3 Messaging flow

- Request path:
  - UI/content -> `sendMessage()` -> background `onMessage` listener
- Router:
  - `src/background/message-router.js`
- Response envelope:
  - success: `{ ok: true, data }`
  - failure: `{ ok: false, error }`

Message types (current; see `src/messaging/index.js`):
- `PING` (optional health-check; handled in router)
- `GET_SETTINGS`
- `SAVE_SETTINGS`
- `RESET_SETTINGS`
- `SETTINGS_UPDATED` (broadcast from background after save; content script applies patches)
- `FETCH_FILE_AS_TEXT` (background + offscreen: read `file:` file or directory listing HTML for explorer and in-viewer navigation)
- `DOWNLOAD_DATA_URL` (`chrome.downloads` for `data:` URLs — used on `file:` pages)
- `OFFSCREEN_FETCH` / `OFFSCREEN_FETCH_DONE` (wire protocol to `public/offscreen.js`; bypass `routeMessage` envelope in the service worker listener)

## 4) Actual folder map (current repository)

```text
src/
  background/
    service-worker.js
    message-router.js
    offscreen-fetch.js
  content/
    index.js
    bootstrap.js
    page-detector.js
    raw-content-extractor.js
    page-overrider.js
    text-sampling.js
    host-print.scss
  messaging/
    index.js
  settings/
    index.js
  theme/
    index.js
  shared/
    logger.js
    deep-merge.js
    clipboard.js
    download.js
    settings-diff.js
    markdown-detect.js
    fs-handle-debug.js
    constants/
      viewer.js
      explorer.js
      tooltip.js
    react/
      Skeleton.jsx
    styles/
      _skeleton.scss
  plugins/
    plugin-types.js
    plugin-manager.js
    core/
      code-highlight.plugin.js
      task-list.plugin.js
      anchor-heading.plugin.js
      table-enhance.plugin.js
    optional/
      emoji.plugin.js
      footnote.plugin.js
      math.plugin.js
      mermaid.plugin.js
      mermaid-actions.js
      mermaid-lightbox.js
      mermaid-export.js
  viewer/
    app.js
    article-interactions.js
    dom-tooltip.js
    icons.js
    scroll-utils.js
    react/
      ViewerApp.jsx
      mount.js
      contexts/
        SidebarTabContext.jsx
        ToastContext.jsx
      hooks/
        useExplorer.js
        useScrollSpy.js
        useSidebarResize.js
        explorer/
          explorerReducer.js
          createExplorerViewActions.js
      components/
        FilesPanel.jsx
        OutlinePanel.jsx
        ResizeHandle.jsx
        Sidebar.jsx
        SidebarTabs.jsx
        Toast.jsx
        FloatingActions.jsx
        Tooltip.jsx
        ViewerShell.jsx
        icons/
          ExportIcon.jsx
          PrintIcon.jsx
        explorer/
          ExplorerHeader.jsx
          ExplorerPanel.jsx
          ExplorerProgress.jsx
          FileRow.jsx
          FileTree.jsx
          FolderRow.jsx
    navigation/
      link-resolver.js
      __tests__/
        link-resolver.test.js
    explorer/
      explorer-files-context.js
      explorer-state.js
      explorer-tree-utils.js
      folder-scanner.js
      gitignore-matcher.js
      sibling-scanner.js
      url-utils.js
      workspace-picker.js
    actions/
      document-actions.js
    core/
      markdown-engine.js
      renderer.js
      toc-builder.js
      scroll-spy.js
      shiki-config.js
      shiki-highlighter.js
    styles/
      _variables.scss
      _chrome-print.scss
      _floating-actions.scss
      base.scss
      layout.scss
      content.scss
      toc.scss
      explorer.scss
      content/
        _typography.scss
        _code-blocks.scss
        _code-block-ui.scss
        _tables.scss
        _plugins.scss
        _mermaid.scss
        _article-print.scss
  popup/
    index.html
    index.jsx
    PopupApp.jsx
    popup.scss
    settings-constants.js
    icon-placeholder-16.png
    icon-placeholder-48.png
    icon-placeholder-128.png
    components/
      Tooltip.jsx
    hooks/
      useSettingsPersistence.js
    panels/
      GeneralPanel.jsx
      ReaderPanel.jsx
      PluginsPanel.jsx
  options/
    index.html
    index.js
public/
  offscreen.js
  offscreen.html
```

## 5) Key modules and responsibilities

- `src/content/text-sampling.js`
  - `getTextSample(root, maxChars)` — TreeWalker sampling (used by detector + extractor).

- `src/shared/markdown-detect.js`
  - `MARKDOWN_PATHNAME_EXT_RE`, `pathnameHasMarkdownExtension(pathname)` — single source for `.md`/`.markdown`/`.mdown` pathname checks (used by `bootstrap`, `page-detector`, re-exported as `MARKDOWN_EXT` from `url-utils.js`).
  - `looksLikeMarkdownText(text)` — markdown-like heuristic for detector + bootstrap fallback.

- `src/content/page-detector.js`
  - Scoring heuristic for Markdown probability.
  - Uses URL extension, MIME type, `<pre>` patterns, and sampled text markers (pathname extension via `markdown-detect.js`).

- `src/content/raw-content-extractor.js`
  - Extracts markdown from:
    - single `<pre>` via `textContent` (preferred)
    - otherwise TreeWalker text sampling on `body` with line joins (`getTextSample`)
  - Normalizes BOM, CRLF / lone CR, and Unicode line/paragraph separators (U+2028 / U+2029) for consistent newline handling.

- `src/viewer/core/markdown-engine.js`
  - Configures `markdown-it` + `markdown-it-anchor`.
  - Overrides **`softbreak`** so paragraph source newlines become `<br>` (raw `\n` in HTML would collapse inside `<p>` in the browser).
  - `link_open` rule: only sets `target="_blank"` + `rel="noopener noreferrer"` on **external** links (`http:`, `https:`, `mailto:`, `tel:`). Internal links (relative, `file:`, hash-only) render without `target` so the viewer can intercept clicks.

- `src/viewer/core/renderer.js`
  - **Async** `renderDocument(markdown, settings, runtimeContext)` orchestration:
    1. `createPluginManager({ settings })`, `createMarkdownEngine()`
    2. `extendMarkdown` / `preprocessMarkdown` (plugins; `runtimeContext` can pass `injectViewerStyles` for optional CSS like KaTeX)
    3. `renderMarkdown()` → HTML string
    4. `postprocessHtml` (plugins)
    5. If `plugins.codeHighlight.enabled !== false`: **`applyShikiToFencedCode(html, settings)`**
    6. **`sanitizeHtml(html)`** (DOMPurify; allows `style` + `tabindex` for Shiki)
  - Returns `{ html, pluginManager, metadata, warnings }`.

- `src/viewer/core/shiki-config.js` / `shiki-highlighter.js`
  - **`shiki-config`**: explicit `SHIKI_LANG_IDS` allowlist with per-id loaders (static `import()` entries so the bundler does not include every Shiki grammar); `SHIKI_BUNDLED_THEME_IDS` / `github-light` + `github-dark`; maps reader `settings.theme.preset` to Shiki theme; must stay aligned with `src/theme/index.js` `BUILT_IN_THEMES` keys.
  - **`shiki-highlighter`** also contains `normalizeShikiPreWhitespace` (HTML string path) to remove whitespace-only text nodes Shiki inserts between `.line` spans so `white-space: pre` does not create blank lines while preserving tabs/indent.
  - **`shiki-highlighter`**: string-first `applyShikiToFencedCode` replaces fenced `<pre><code class="language-…">` blocks in the HTML string with Shiki output before sanitize.

- `src/theme/index.js`
  - Builds CSS custom properties from settings preset + typography + layout; applied to viewer root via `applyThemeSettings()`.

- `src/viewer/navigation/link-resolver.js`
  - **`resolveMarkdownLink(rawHref, context)`** — pure function that classifies a raw `<a href>` into one of: `same-document-hash`, `self-link`, `markdown-file`, `workspace-virtual-file`, `external`, `asset`, `unsupported`. Returns `{ kind, resolvedUrl, hash, shouldIntercept }`.
  - Handles edge cases: spaces/Unicode in filenames, percent-encoded hrefs, query strings, parent folder traversal (`../`), virtual workspace prefixes (`MDP_WS_FILE`).
  - Uses `new URL(rawHref, currentFileUrl)` for resolution; `MARKDOWN_PATHNAME_EXT_RE` for extension matching; `normalizeFileUrlForCompare` for self-link detection.
  - Unit tested in `src/viewer/navigation/__tests__/link-resolver.test.js`.

- `src/viewer/app.js`
  - **`MarkdownViewerApp`**: **`mountViewerReact(container)`** → awaits shell `{ root, article }`; **`applyReaderStyles()`** applies `applyThemeSettings()` + typography/layout inline styles on `article`; **`injectViewerStyles({ id, cssText })`** for one-off runtime styles (e.g. KaTeX) keyed by `id`; async **`render()`** / **`updateSettings()`** (uses `needsFullRender()` for a style-only fast path; theme/plugin/structure changes still force full re-render for Shiki/runtime pipeline consistency).
  - Composes **`createArticleInteractions({ getArticle, showToast, getScrollRoot, getCurrentFileUrl, navigateToFile, resolveLink })`** — imperative listeners on the article element (React does not own `innerHTML`); toast goes through **`_reactHandle.showToast`** (React `ToastContext`); internal Markdown link clicks are intercepted via `resolveLink` (wrapping `resolveMarkdownLink`) and delegated to `navigateToFile` (from `explorerBridge`).
  - Passes **`explorerBridge`** callbacks into React for navigation, re-render, and file I/O; explorer UI state lives in **`useExplorer`**.

- **React viewer layer** (`src/viewer/react/`)
  - **`mount.js`**: `createRoot(container)`, `partsPromise` resolves when **`ViewerShell`** calls `onShellReady({ root, article })`. Props-driven re-renders: `updateSettings`, `updateTocItems`, `setTocReady`, **`bumpChrome()`** (refresh floating-actions visibility when `currentFileUrl` changes imperatively). Settings are **not** duplicated in React context (passed as props from mount).
  - **`ViewerApp.jsx`**: `ToastProvider`, **`SidebarTabProvider`** (active Outline/Files tab only), **`ViewerShell`** + floating actions slot.
  - **Toast / Tooltip (chrome)**: `Toast.jsx`, `Tooltip.jsx` with portals targeting the **ShadowRoot** when present (`shared/constants/tooltip.js` for delays).
  - **Sidebar**: `Sidebar.jsx`, `OutlinePanel.jsx` (TOC list + **`useScrollSpy`** and `tocReady` gating with skeleton state), `ResizeHandle.jsx` + **`useSidebarResize`** (CSS var `--mdp-toc-width`, sessionStorage width, keyboard resize).
  - **Files**: `ExplorerPanel.jsx` + **`useExplorer`** (orchestrates view state; **`hooks/explorer/explorerReducer.js`** + **`createExplorerViewActions.js`** for reducer/patch helpers); pure scanners/pickers remain under `viewer/explorer/*.js`.

- `src/shared/react/Skeleton.jsx`
  - Shared loading primitives (`SkeletonLine`, `SkeletonBlock`) used by viewer and popup.

- `src/shared/styles/_skeleton.scss`
  - Shared shimmer animation and skeleton base styles (`.mdp-skeleton*`) plus popup variant class (`.popup-skeleton`).

- `src/shared/constants/viewer.js`
  - Viewer-wide numeric constants: top-offset fallback, scroll padding, sidebar min/max width, copy-button feedback duration (consumed by `scroll-utils.js`, `scroll-spy.js`, `useSidebarResize.js`, `article-interactions.js`).

- `src/shared/constants/explorer.js`
  - `MDP_WS_FILE` / `MDP_WS_DIR` prefixes and default scan limits when persisted `settings.explorer` fields are missing; used by **`useExplorer.js`**, `workspace-picker.js`, `folder-scanner.js`. **`url-utils.js` re-exports** the `MDP_WS_*` symbols for older import paths.

- `src/viewer/explorer/url-utils.js`
  - Pure `file:` / virtual URL helpers: `isWorkspaceVirtualHref`, `getParentDirectoryUrl`, `normalizeDirectoryUrl`, `normalizeFileUrlForCompare`, `pathInputToFileDirectoryUrl`, `isMarkdownFileHref`, `MARKDOWN_EXT` (alias of `MARKDOWN_PATHNAME_EXT_RE` from `shared/markdown-detect.js`); re-exports `MDP_WS_FILE` / `MDP_WS_DIR` from `shared/constants/explorer.js`.

- `src/viewer/explorer/sibling-scanner.js`
  - Directory listing fetch + parsing: `fetchDirectoryListingHtml`, `collectEntriesFromChromeAddRow` (Chrome `addRow()` HTML), `scanSiblingFiles`, `resolveListingHrefToFileUrl`, `posixPathRelativeToFileRoot`.

- `src/viewer/explorer/workspace-picker.js`
  - `showDirectoryPicker` scan (`scanWorkspaceFromDirectoryHandle`), `webkitdirectory` + optional `File.path` → `file:` root (`tryFileDirectoryUrlFromWebkitFiles`), else `scanWorkspaceFromWebkitFileList` (virtual `mdp-ws-*` hrefs + in-tab `File` / handle readers wired from **`useExplorer`**).

- `src/viewer/explorer/folder-scanner.js`
  - `scanFolderRecursive` — BFS-style recursive directory fetch, `maxScanDepth` / `maxFiles` / `maxFolders`, `AbortSignal`, progress callback; builds tree of folders + markdown files only.

- `src/viewer/explorer/explorer-tree-utils.js`
  - Path labels, depth notices, folder expand state helpers, tree counts — used by **`useExplorer`** and explorer UI components.

- `src/viewer/explorer/explorer-files-context.js`
  - Pure helpers: `buildExplorerFilesContext`, `explorerTreeContainsFileHref` — consumed by **`useExplorer`** for the Files context strip.

- `src/viewer/scroll-utils.js`
  - Shared scroll math for in-viewer headings (`scrollToElementInViewer`, `getToolbarHeightInScrollRoot`) — used by **`article-interactions.js`** and **`OutlinePanel.jsx`** / **`useScrollSpy`**. Current top offset fallback is `0` because there is no sticky top toolbar.

- `src/viewer/icons.js`
  - Imperative **plugin** SVG helpers only: `SVG_NS`, `createCopyIconSvg()`, Mermaid toolbar/lightbox icons (`createExpandIconSvg()`, `createZoomInIconSvg()`, `createZoomOutIconSvg()`, `createRecenterIconSvg()`, `createCloseIconSvg()`). Viewer chrome icons are React components under `react/components/icons/`.

- `src/plugins/optional/mermaid.plugin.js` / `mermaid-actions.js` / `mermaid-lightbox.js` / `mermaid-export.js`
  - Mermaid fence override renders placeholder `.mdp-mermaid` blocks, then lazy-renders SVGs on viewport entry.
  - `mermaid-actions.js` attaches copy, expand/lightbox, and export actions for rendered Mermaid blocks.
  - `mermaid-lightbox.js` owns the full-screen diagram viewer: theme-aware overlay UI, higher-density `2x` SVG clone for sharper zoom, full-screen drag-to-pan, wheel/pinch zoom, `re-center`, and keyboard shortcuts (`Esc`, `+`, `-`, `0`).
  - `_mermaid.scss` includes both inline block chrome and lightbox styling.

- `src/viewer/dom-tooltip.js`
  - **`attachTooltip(anchor, { text })`** for **plugin-injected** controls (fenced copy button, Mermaid menu) — fixed positioning, parent = ShadowRoot or `document.body`. Distinct from React **`Tooltip.jsx`** used on floating actions/resize handle.

- `src/viewer/explorer/explorer-state.js`
  - `sessionStorage`: original file URL, active sidebar tab, sidebar width, **workspace root** `file:` URL, **mode** `sibling` | `workspace`.

- `src/content/host-print.scss` — host/light-DOM print rules (injected with viewer root); pairs with `viewer/styles/_chrome-print.scss` (floating actions/sidebar hidden) and `viewer/styles/content/_article-print.scss` (article typography for print).
- `src/viewer/styles/content.scss` (+ partials under `content/`) → compiled and inlined via the content script bundle
  - **`pre.shiki`**: `white-space: pre`, `tab-size: 4`, `.line` as `display: block`.
  - **`pre:not(.shiki)`**: theme vars for plain fenced blocks when Shiki off/unavailable.

- `src/plugins/plugin-manager.js`
  - Resolves active plugins from `settings.plugins`; runs `preprocessMarkdown`, `postprocessHtml`, `afterRender`, optional `extendMarkdown`.

- `src/viewer/actions/document-actions.js`
  - Print / export HTML / export Word helpers used by **`FloatingActions.jsx`**.

- `src/settings/index.js`
  - Single source of settings persistence logic
  - Deep-merges persisted settings with defaults
  - Reads/writes via `chrome.storage.sync` (fallback `local`)

## 6) Settings model (current)

Default shape in `src/settings/index.js` (plugins come from `getDefaultPluginSettings()`):

```js
{
  enabled: true,
  layout: { showToc: true, tocWidth: 280, contentMaxWidth: 980 },
  theme: { preset: 'light' },
  typography: { fontFamily: 'system-ui', fontSize: 16, lineHeight: 1.7 },
  plugins: {
    codeHighlight: { enabled: true },
    taskList: { enabled: true },
    anchorHeading: { enabled: true },
    tableEnhance: { enabled: true },
    emoji: { enabled: true },
    footnote: { enabled: true },
    math: { enabled: false },
    mermaid: { enabled: false }
  },
  explorer: {
    maxScanDepth: 4,
    maxFiles: 2000,
    maxFolders: 500
  },
  version: 1
}
```

Defaults for optional plugins come from `getDefaultPluginSettings()` in `src/plugins/plugin-types.js`. **Settings UI:** React popup (`PopupApp` + `panels/*`); labels in `popup/settings-constants.js`.

Preset keys for theme/Shiki must match built-ins: `light`, `dark`.

## 7) Current state vs roadmap

Implemented strongly:
- Foundation (Phase 0)
- Markdown detection/takeover (Phase 1)
- Core rendering MVP (Phase 2)
- TOC left sidebar (Phase 3)
- Runtime customization via **extension popup** + `SETTINGS_UPDATED` messaging (Phase 4 intent; no in-viewer drawer)
- Theme presets + CSS-variable based theming (Phase 5)
- **Plugin hooks + core plugins** (task list, anchor heading, table enhance, code-highlight gating for Shiki) — aligns with **parts of Phases 6–7** in planning docs
- **Optional plugins completed** (Mermaid, Math, Footnote, Emoji), including Mermaid export actions (SVG + PNG with scale options)
- **Popup (React)** + **minimal options** page (Phase 9): full settings UX lives in the popup; options remain JSON-oriented reset/export-style surface
- **UI Files Explorer** (see `docs/technical-spec-phases/ui-files-explorer-feature-spec.md`): Phase 1 (siblings + back) and **Phase 2** (open-folder workspace, recursive scan, limits, progress UI, tree). Phase 3+ (bookmarks/popup) not done.
- **Internal Markdown link navigation** (see `docs/internal-hyperlink-navigation-solution.md`): all phases (0–5) completed. Link resolver, article click interception, browser history Back/Forward, sidebar integration, virtual workspace links, and polish/tests.

Not implemented yet (from planning docs):
- Full “plugin packs” marketplace or remote packs as described in older phase docs
- Hardening/performance polish and migrations (Phase 10)

## 8) Performance hotspots already identified

From `docs/performance-issues-audit.md`, notable risks:
- Viewer CSS bundled in the content script (no runtime fetch; still parse cost on every page)
- Shiki/Mermaid/KaTeX heavy assets: mitigated by explicit Shiki language list, lazy optional plugins, lazy KaTeX CSS when Math is on, and Mermaid `IntersectionObserver` batching; see `docs/performance-issues-audit.md` and `DEV.md` (bundle size section)
- Large-page text sampling / extraction cost
- Scroll spy uses cached heading offsets + binary search on scroll (see `scroll-spy.js` / `useScrollSpy.js`); watch unstable React deps that force spy teardown
- Repeated regex scans; full re-render on theme/plugin changes (typography/layout-only updates can skip full render via `needsFullRender()`)

Use this audit as the baseline for optimization tasks.

## 9) How AI should approach common tasks

- Detection bug/false positive:
  - Start at `src/content/page-detector.js` and fallback logic in `src/content/bootstrap.js`.

- Extraction/render mismatch:
  - Check `src/content/raw-content-extractor.js` and `src/viewer/core/renderer.js`.

- XSS/security concerns:
  - Confirm markdown output always goes through `sanitizeHtml()` before DOM insertion. Shiki adds inline `style`; DOMPurify config must keep allowing safe styling only.

- TOC behavior bugs:
  - Inspect `src/viewer/core/toc-builder.js`, `src/viewer/react/components/OutlinePanel.jsx`, `src/viewer/react/hooks/useScrollSpy.js`, `src/viewer/core/scroll-spy.js`.

- Settings persistence issues:
  - Inspect `src/background/message-router.js` + `src/settings/index.js`.

- Popup/options not syncing:
  - Inspect `src/popup/index.jsx`, `src/popup/PopupApp.jsx`, `src/popup/hooks/useSettingsPersistence.js`, `src/options/index.js`, and message type usage (`SETTINGS_UPDATED` on the content script).

- Loading-state UX in chrome/popup:
  - Inspect `src/shared/react/Skeleton.jsx`, `src/shared/styles/_skeleton.scss`, `src/viewer/react/components/OutlinePanel.jsx`, `src/viewer/react/components/explorer/ExplorerPanel.jsx`, `src/popup/PopupApp.jsx`, and `tocReady` updates in `src/viewer/app.js` / `src/viewer/react/mount.js`.

- **Theme vs fenced code colors**:
  - Reader theme uses CSS vars; Shiki colors are inline in HTML. `updateSettings()` skips full render for style-only diffs (`typography.*`, `layout.contentMaxWidth`, `layout.showToc`, `layout.tocWidth`) but still re-renders for theme/plugin/other structural diffs; keep `shiki-config.js` preset map in sync with `src/theme/index.js`. See `.cursor/rules/35-reader-theme-and-shiki.mdc`.

- **Fenced code layout (lines, tabs)**:
  - `normalizeShikiPreWhitespace`, bundled viewer styles from `content/_code-blocks.scss` (`pre.shiki`), and sanitize `ADD_ATTR` for Shiki output.

- **Plugin behavior**:
  - `src/plugins/plugin-manager.js`, individual plugins under `src/plugins/core/`, and `renderer.js` / `app.js` (`copyCodeWithToast` from `article-interactions.js`) for `afterRender` DOM passes.

- **Files explorer / workspace**:
  - `src/viewer/react/hooks/useExplorer.js` + `react/components/explorer/*` + `folder-scanner.js` / `sibling-scanner.js` / `url-utils.js` / `workspace-picker.js` / `explorer-state.js`, `FETCH_FILE_AS_TEXT` in `message-router.js` + offscreen fetch; requires **Allow access to file URLs** for `file:` reads.

- **Internal Markdown link navigation**:
  - Link resolver: `src/viewer/navigation/link-resolver.js` (pure function, unit tested).
  - Click interception: `src/viewer/article-interactions.js` (`handleInternalLinkClick`, `popstate` handler, `hashchange` coordination).
  - Bridge wiring: `src/viewer/app.js` passes `resolveLink` + `navigateToFile` callbacks into `createArticleInteractions`.
  - Markdown engine fix: `src/viewer/core/markdown-engine.js` (`link_open` rule only sets `target="_blank"` on external links).
  - Sidebar sync: `src/viewer/react/hooks/useExplorer.js` (`navigateToFile` updates active file, triggers sibling re-scan when crossing folder boundaries).
  - Design doc: `docs/internal-hyperlink-navigation-solution.md`.

## 10) Operational notes for contributors and AI agents

- Keep message names centralized in `src/messaging/index.js`.
- Prefer `sendMessage()` wrapper instead of direct ad-hoc messaging in UI/content code.
- Preserve viewer lifecycle: `init()` -> `updateSettings()` -> `destroy()`; document render is **async** (`await render()`). Method name on the class is `updateSettings`; full-render gating is implemented via `needsFullRender()` in `src/shared/settings-diff.js`.
- Keep all source edits in `src/**` and rebuild for extension output (`npm run build`).
- When adding runtime-fetched extension assets (`fetch(chrome.runtime.getURL(...))`), sync `manifest.json` `web_accessible_resources`. Viewer chrome styles are not separate WAR entries (inlined in the content script).
- For architecture detail on Shiki and presets, see `.cursor/rules/35-reader-theme-and-shiki.mdc` and this doc’s section 5.
