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
- Settings storage and runtime messaging
- **Extension popup (React)** for reader/plugins/general settings; minimal **options** page (JSON-oriented); no in-viewer settings drawer yet

## 2) Tech stack and runtime

- Runtime: Chrome Extension MV3
- Build tool: Vite + `@crxjs/vite-plugin`; viewer chrome styles authored in **SCSS** and compiled by Vite via `?inline` imports from `src/content/index.js` (bundled into the content script in `dist/**`; no standalone `.css` under `src/viewer/styles/`)
- Languages: **Vanilla JavaScript (ES modules)** for content/background/viewer/plugins; **React** for `src/popup/` (`PopupApp.jsx` + tab panels)
- Markdown: `markdown-it` + `markdown-it-anchor`
- Fenced code highlighting: **Shiki** (`shiki/bundle/web`)
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
- `viewer`: UI shell + **async** render pipeline + TOC (no settings UI in-page)
- `theme`: preset color tokens + CSS variable builder + `applyThemeSettings()` on viewer root
- `plugins`: registered plugins, `plugin-manager` hooks (pre/post markdown/HTML)
- `settings`: defaults, storage key, deep-merge persistence in `src/settings/index.js`
- `popup` / `options`: UI entrypoints for reading/updating settings (popup is primary)
- `messaging`: message constants and shared `sendMessage()` in `src/messaging/index.js`
- `shared`: `logger.js`, `deep-merge.js`, `clipboard.js`, `settings-diff.js` (settings path diff / full-render gate), `constants/viewer.js` (toolbar/scroll/sidebar/copy timing), `constants/explorer.js` (virtual workspace URL prefixes + scan fallbacks when settings fields are missing)

### 3.2 Core flow (implemented)

1. Content script entry `src/content/index.js` bundles compiled viewer SCSS (`?inline`) and injects those strings into the Shadow DOM (no `fetch` of per-sheet CSS assets).
2. **Product gate:** `bootstrap.js` only mounts the viewer for **local `file:`** URLs whose path ends in `.md` / `.markdown` / `.mdown` (not remote pages).
3. `src/content/bootstrap.js` runs page detection via `detectMarkdownPage()` (shared text sampling / heuristics in `text-sampling.js`).
4. If needed, fallback sampling checks whether page text resembles Markdown (`looksLikeMarkdownText`).
5. Content script fetches settings from background using `MESSAGE_TYPES.GET_SETTINGS`.
6. If enabled, Markdown is extracted (`single <pre>` preferred, else TreeWalker sampling via `getTextSample` in `text-sampling.js`).
7. `createViewerRoot()` mounts full-screen root and optional Shadow DOM.
8. `MarkdownViewerApp` builds shell, applies theme CSS variables, runs **`await renderDocument()`** (async), injects HTML, runs **`pluginManager.afterRender({ articleEl, settings, copyCodeWithToast })`**, builds TOC; Files/workspace UI is owned by **`createExplorerController()`** in `explorer/explorer-controller.js`.
9. On `MESSAGE_TYPES.SETTINGS_UPDATED`, content script calls `app.updateSettings()` or tears down / remounts when disabled.

### 3.3 Messaging flow

- Request path:
  - UI/content -> `sendMessage()` -> background `onMessage` listener
- Router:
  - `src/background/message-router.js`
- Response envelope:
  - success: `{ ok: true, data }`
  - failure: `{ ok: false, error }`

Message types (current):
- `PING`
- `GET_SETTINGS`
- `SAVE_SETTINGS`
- `RESET_SETTINGS`
- `SETTINGS_UPDATED` (broadcast from background after save; content script applies patches)
- `FETCH_FILE_AS_TEXT` (background + offscreen: read `file:` file or directory listing HTML for explorer and in-viewer navigation)

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
    settings-diff.js
    constants/
      viewer.js
      explorer.js
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
      mermaid-export.js
  viewer/
    app.js
    article-interactions.js
    icons.js
    scroll-utils.js
    sidebar-resize.js
    toast.js
    tooltip.js
    toolbar-metrics.js
    explorer/
      explorer-controller.js
      explorer-panel.js
      explorer-tree-renderer.js
      explorer-files-context.js
      explorer-state.js
      folder-scanner.js
      gitignore-matcher.js
      sibling-scanner.js
      url-utils.js
      workspace-picker.js
    actions/
      rebuild-toc.js
    core/
      markdown-engine.js
      renderer.js
      toc-builder.js
      scroll-spy.js
      shiki-config.js
      shiki-highlighter.js
    shell/
      viewer-shell.js
    styles/
      _variables.scss
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
  popup/
    index.html
    index.jsx
    PopupApp.jsx
    popup.scss
    settings-constants.js
    hooks/
      useSettingsPersistence.js
    panels/
      GeneralPanel.jsx
      ReaderPanel.jsx
      PluginsPanel.jsx
  options/
    index.html
    index.js
```

## 5) Key modules and responsibilities

- `src/content/text-sampling.js`
  - `getTextSample(root, maxChars)` — TreeWalker sampling (used by detector + extractor).
  - `looksLikeMarkdownText(text)` — shared markdown-like heuristic for detector + bootstrap fallback.

- `src/content/page-detector.js`
  - Scoring heuristic for Markdown probability.
  - Uses URL extension, MIME type, `<pre>` patterns, and sampled text markers.

- `src/content/raw-content-extractor.js`
  - Extracts markdown from:
    - single `<pre>` via `textContent` (preferred)
    - otherwise TreeWalker text sampling on `body` with line joins (`getTextSample`)
  - Normalizes BOM, CRLF / lone CR, and Unicode line/paragraph separators (U+2028 / U+2029) for consistent newline handling.

- `src/viewer/core/markdown-engine.js`
  - Configures `markdown-it` + `markdown-it-anchor`.
  - Overrides **`softbreak`** so paragraph source newlines become `<br>` (raw `\n` in HTML would collapse inside `<p>` in the browser).
  - Forces external links to `target="_blank"` with safe `rel`.

- `src/viewer/core/renderer.js`
  - **Async** `renderDocument()` orchestration:
    1. `createPluginManager({ settings })`, `createMarkdownEngine()`
    2. `extendMarkdown` / `preprocessMarkdown` (plugins)
    3. `renderMarkdown()` → HTML string
    4. `postprocessHtml` (plugins)
    5. If `plugins.codeHighlight.enabled !== false`: **`applyShikiToFencedCode(html, settings)`**
    6. **`sanitizeHtml(html)`** (DOMPurify; allows `style` + `tabindex` for Shiki)
  - Returns `{ html, pluginManager, metadata, warnings }`.

- `src/viewer/core/shiki-config.js` / `shiki-highlighter.js`
  - **`shiki-config`**: bundled Shiki theme ids + language list; maps reader `settings.theme.preset` to Shiki theme; must stay aligned with `src/theme/index.js` `BUILT_IN_THEMES` keys.
  - **`shiki-highlighter`** also contains `normalizeShikiPreWhitespace(pre)` to remove whitespace-only text nodes Shiki inserts between `.line` spans so `white-space: pre` does not create blank lines while preserving tabs/indent.
  - **`shiki-highlighter`**: replaces `pre > code.language-*` blocks with Shiki HTML in the DOM, then serializes back for sanitize.

- `src/theme/index.js`
  - Builds CSS custom properties from settings preset + typography + layout; applied to viewer root via `applyThemeSettings()`.

- `src/viewer/app.js`
  - **`MarkdownViewerApp`**: shell mount, theme vars, async **`render()`** pipeline, **`updateSettings()`** (uses `needsFullRender()` from `shared/settings-diff.js` — no style-only fast path yet; theme still forces full re-render for Shiki).
  - Composes **`createArticleInteractions()`** (hash navigation, heading-anchor copy, code-block copy via `shared/clipboard.js`, toast wiring) and **`createSidebarResize()`** (TOC width drag + keyboard).
  - Delegates Files/workspace flows to **`createExplorerController()`** in `explorer/explorer-controller.js`.

- `src/viewer/explorer/explorer-controller.js`
  - Sibling vs **workspace** mode, directory-picker / webkit scans, `scanFolderRecursive`, `FETCH_FILE_AS_TEXT` navigation, virtual `mdp-ws-*` file reads, back button sync; uses `explorer-state.js` for `sessionStorage`.

- `src/shared/constants/viewer.js`
  - Viewer-wide numeric constants: toolbar height fallback, scroll padding, sidebar min/max width, copy-button feedback duration (consumed by `scroll-utils.js`, `scroll-spy.js`, `sidebar-resize.js`, `article-interactions.js`; `toolbar-metrics.js` re-exports scroll metrics for compatibility).

- `src/shared/constants/explorer.js`
  - `MDP_WS_FILE` / `MDP_WS_DIR` prefixes and default scan limits when persisted `settings.explorer` fields are missing; used by `explorer-controller.js`, `workspace-picker.js`, `folder-scanner.js`. **`url-utils.js` re-exports** the `MDP_WS_*` symbols for older import paths.

- `src/viewer/explorer/url-utils.js`
  - Pure `file:` / virtual URL helpers: `isWorkspaceVirtualHref`, `getParentDirectoryUrl`, `normalizeDirectoryUrl`, `normalizeFileUrlForCompare`, `pathInputToFileDirectoryUrl`, `isMarkdownFileHref`, `MARKDOWN_EXT`; re-exports `MDP_WS_FILE` / `MDP_WS_DIR` from `shared/constants/explorer.js`.

- `src/viewer/explorer/sibling-scanner.js`
  - Directory listing fetch + parsing: `fetchDirectoryListingHtml`, `collectEntriesFromChromeAddRow` (Chrome `addRow()` HTML), `scanSiblingFiles`, `resolveListingHrefToFileUrl`, `posixPathRelativeToFileRoot`.

- `src/viewer/explorer/workspace-picker.js`
  - `showDirectoryPicker` scan (`scanWorkspaceFromDirectoryHandle`), `webkitdirectory` + optional `File.path` → `file:` root (`tryFileDirectoryUrlFromWebkitFiles`), else `scanWorkspaceFromWebkitFileList` (virtual `mdp-ws-*` hrefs + in-tab `File` / handle readers wired from `explorer-controller.js`).

- `src/viewer/explorer/folder-scanner.js`
  - `scanFolderRecursive` — BFS-style recursive directory fetch, `maxScanDepth` / `maxFiles` / `maxFolders`, `AbortSignal`, progress callback; builds tree of folders + markdown files only.

- `src/viewer/explorer/explorer-panel.js`
  - Imperative Files tab shell: **context strip**, actions, loading/progress, orchestrates list/tree bodies built via **`explorer-tree-renderer.js`** (`createFileRow`, `appendTreeNode`, depth notices, summaries).

- `src/viewer/explorer/explorer-tree-renderer.js`
  - DOM builders for flat rows and folder tree nodes (`createFileRow`, `appendTreeNode`), `shortenPath`, `buildDepthNotice`, `countMarkdownFilesInTree`, `createSetSummary`, `getDirectoryLabelFromUrl`.

- `src/viewer/explorer/explorer-files-context.js`
  - Pure helpers: `buildExplorerFilesContext`, `explorerTreeContainsFileHref` — consumed by **`explorer-controller.js`** for the Files context strip.

- `src/viewer/scroll-utils.js`
  - Shared scroll math for in-viewer headings (`scrollToElementInViewer`, `getToolbarHeightInScrollRoot`) — used by **`article-interactions.js`** and **`rebuild-toc.js`**.

- `src/viewer/icons.js`
  - `SVG_NS`, `createCopyIconSvg()` — shared by code-highlight and Mermaid toolbar (`mermaid-export.js` uses `SVG_NS`).

- `src/viewer/explorer/explorer-state.js`
  - `sessionStorage`: original file URL, active sidebar tab, sidebar width, **workspace root** `file:` URL, **mode** `sibling` | `workspace`.

- `src/viewer/styles/content.scss` (+ partials under `content/`) → compiled and inlined via the content script bundle
  - **`pre.shiki`**: `white-space: pre`, `tab-size: 4`, `.line` as `display: block`.
  - **`pre:not(.shiki)`**: theme vars for plain fenced blocks when Shiki off/unavailable.

- `src/plugins/plugin-manager.js`
  - Resolves active plugins from `settings.plugins`; runs `preprocessMarkdown`, `postprocessHtml`, `afterRender`, optional `extendMarkdown`.

- `src/viewer/actions/rebuild-toc.js`
  - Rebuilds TOC from heading IDs, wires click-to-scroll, registers/destroys scroll spy listeners.

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
- Basic popup/options wiring (partial Phase 9)
- **UI Files Explorer** (see `docs/technical-spec-phases/ui-files-explorer-feature-spec.md`): Phase 1 (siblings + back) and **Phase 2** (open-folder workspace, recursive scan, limits, progress UI, tree). Phase 3+ (bookmarks/popup) not done.

Not implemented yet (from planning docs):
- Full “plugin packs” marketplace or remote packs as described in older phase docs
- Hardening/performance polish and migrations (Phase 10)

## 8) Performance hotspots already identified

From `docs/performance-issues-audit.md`, notable risks:
- Viewer CSS bundled in the content script (no runtime fetch; still parse cost on every page)
- Large-page text sampling / extraction cost
- Scroll spy does O(N headings) work on updates
- Repeated regex scans and full re-render on some settings updates

Use this audit as the baseline for optimization tasks.

## 9) How AI should approach common tasks

- Detection bug/false positive:
  - Start at `src/content/page-detector.js` and fallback logic in `src/content/bootstrap.js`.

- Extraction/render mismatch:
  - Check `src/content/raw-content-extractor.js` and `src/viewer/core/renderer.js`.

- XSS/security concerns:
  - Confirm markdown output always goes through `sanitizeHtml()` before DOM insertion. Shiki adds inline `style`; DOMPurify config must keep allowing safe styling only.

- TOC behavior bugs:
  - Inspect `src/viewer/core/toc-builder.js`, `src/viewer/actions/rebuild-toc.js`, `src/viewer/core/scroll-spy.js`.

- Settings persistence issues:
  - Inspect `src/background/message-router.js` + `src/settings/index.js`.

- Popup/options not syncing:
  - Inspect `src/popup/index.jsx`, `src/popup/PopupApp.jsx`, `src/popup/hooks/useSettingsPersistence.js`, `src/options/index.js`, and message type usage (`SETTINGS_UPDATED` on the content script).

- **Theme vs fenced code colors**:
  - Reader theme uses CSS vars; Shiki colors are inline in HTML. Today **`updateSettings` always full re-renders**; keep `shiki-config.js` preset map in sync with `src/theme/index.js`. See `.cursor/rules/35-reader-theme-and-shiki.mdc`.

- **Fenced code layout (lines, tabs)**:
  - `normalizeShikiPreWhitespace`, bundled viewer styles from `content/_code-blocks.scss` (`pre.shiki`), and sanitize `ADD_ATTR` for Shiki output.

- **Plugin behavior**:
  - `src/plugins/plugin-manager.js`, individual plugins under `src/plugins/core/`, and `renderer.js` / `app.js` (`copyCodeWithToast` from `article-interactions.js`) for `afterRender` DOM passes.

- **Files explorer / workspace**:
  - `src/viewer/explorer/explorer-controller.js` + `explorer-panel.js` / `folder-scanner.js` / `sibling-scanner.js` / `url-utils.js` / `workspace-picker.js`, `FETCH_FILE_AS_TEXT` in `message-router.js` + offscreen fetch; requires **Allow access to file URLs** for `file:` reads.

## 10) Operational notes for contributors and AI agents

- Keep message names centralized in `src/messaging/index.js`.
- Prefer `sendMessage()` wrapper instead of direct ad-hoc messaging in UI/content code.
- Preserve viewer lifecycle: `init()` -> `updateSettings()` -> `destroy()`; document render is **async** (`await render()`). Method name on the class is `updateSettings` (not `patchNeedsFullRender` — that optimization is not implemented).
- Keep all source edits in `src/**` and rebuild for extension output (`npm run build`).
- When adding runtime-fetched extension assets (`fetch(chrome.runtime.getURL(...))`), sync `manifest.json` `web_accessible_resources`. Viewer chrome styles are not separate WAR entries (inlined in the content script).
- For architecture detail on Shiki and presets, see `.cursor/rules/35-reader-theme-and-shiki.mdc` and this doc’s section 5.
