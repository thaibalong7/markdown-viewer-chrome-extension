# Markdown Plus - AI Project Overview

## 1) Project purpose

`Markdown Plus` is a Chrome Extension (Manifest V3) that detects Markdown-like pages and replaces raw/plain rendering with a structured viewer UI.

Current implemented core:
- Markdown detection from URL/content heuristics
- Raw Markdown extraction from page (`<pre>` or body text sampling)
- Viewer mount in overlay + Shadow DOM (when available)
- Markdown render pipeline: `markdown-it` → plugin hooks → optional **Shiki** fenced highlighting → `sanitizeHtml` → DOM
- **Reader theme presets** (CSS variables on viewer root) aligned with **Shiki themes** for code blocks
- **Plugin registry** (task lists, heading anchors, table wrapper, code-highlight toggle) via lifecycle hooks
- Left sidebar TOC with click-to-scroll + active heading tracking
- Settings storage and runtime messaging
- In-viewer settings drawer (reader, plugins, general); popup/options for settings inspection/editing

## 2) Tech stack and runtime

- Runtime: Chrome Extension MV3
- Build tool: Vite + `@crxjs/vite-plugin`
- Language: Vanilla JavaScript (ES modules)
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
- `viewer`: UI shell + **async** render pipeline + TOC + settings drawer
- `theme`: preset color tokens + CSS variable builder + `applyThemeSettings()` on viewer root
- `plugins`: registered plugins, `plugin-manager` hooks (pre/post markdown/HTML), `plugin-state` in viewer
- `settings`: defaults, storage key, deep-merge persistence service
- `popup` / `options`: UI entrypoints for reading/updating settings
- `messaging`: message constants and shared `sendMessage()`
- `shared/helpers`: common logger

### 3.2 Core flow (implemented)

1. Content script entry `src/content/index.js` loads viewer CSS from extension assets (`base`, `layout`, `content`, `toc`, `settings`).
2. `src/content/bootstrap.js` runs page detection via `detectMarkdownPage()`.
3. If needed, fallback sampling checks whether page text resembles Markdown.
4. Content script fetches settings from background using `MESSAGE_TYPES.GET_SETTINGS`.
5. If enabled, Markdown is extracted (`single <pre>` preferred, else `getTextSample` via TreeWalker on `body`).
6. `createViewerRoot()` mounts full-screen root and optional Shadow DOM.
7. `MarkdownViewerApp` builds shell, applies theme CSS variables, runs **`await renderDocument()`** (async), injects HTML, runs **`pluginManager.afterRender()`**, builds TOC.

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

## 4) Actual folder map (current repository)

```text
src/
  background/
    service-worker.js
    message-router.js
  content/
    index.js
    bootstrap.js
    page-detector.js
    raw-content-extractor.js
    page-overrider.js
  messaging/
    index.js
  settings/
    index.js
  theme/
    index.js
  shared/
    logger.js
    deep-merge.js
  plugins/
    plugin-types.js
    plugin-manager.js
    core/
      code-highlight.plugin.js
      task-list.plugin.js
      anchor-heading.plugin.js
      table-enhance.plugin.js
  viewer/
    app.js
    actions/
      open-settings.js
      rebuild-toc.js
      update-settings.js
    core/
      markdown-engine.js
      renderer.js
      toc-builder.js
      scroll-spy.js
      shiki-config.js
      shiki-highlighter.js
    shell/
      viewer-shell.js
      settings/
        settings-popup.js
        settings-tab-definitions.js
        settings-general-panel.js
        settings-reader-panel.js
        settings-plugins-panel.js
    styles/
      base.css
      layout.css
      content.css
      toc.css
      settings.css
    state/
      viewer-state.js
  popup/
    index.html
    index.js
  options/
    index.html
    index.js
```

## 5) Key modules and responsibilities

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
  - **`patchNeedsFullRender`**: changing **`theme`** forces full markdown re-render (Shiki bakes colors into HTML; CSS vars alone do not update fences).
  - Otherwise typography/layout/color-only patches can avoid full document render per `STYLE_ONLY_KEYS` / layout allowlist.

- `src/viewer/styles/content.css`
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
    tableEnhance: { enabled: true }
  },
  version: 1
}
```

Preset keys for theme/Shiki must match built-ins: `light`, `dark`, `vscode-light-plus`, `vscode-dark-plus`.

## 7) Current state vs roadmap

Implemented strongly:
- Foundation (Phase 0)
- Markdown detection/takeover (Phase 1)
- Core rendering MVP (Phase 2)
- TOC left sidebar (Phase 3)
- In-viewer settings drawer + runtime customization (Phase 4)
- Theme presets + CSS-variable based theming (Phase 5)
- **Plugin hooks + core plugins** (task list, anchor heading, table enhance, code-highlight gating for Shiki) — aligns with **parts of Phases 6–7** in planning docs
- Basic popup/options wiring (partial Phase 9)

Not implemented yet (from planning docs):
- Full “plugin packs” marketplace or remote packs as described in older phase docs
- Hardening/performance polish and migrations (Phase 10)

## 8) Performance hotspots already identified

From `docs/performance-issues-audit.md`, notable risks:
- CSS files fetched on content script startup
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
  - Inspect `src/popup/index.js`, `src/options/index.js`, and message type usage.

- **Theme vs fenced code colors**:
  - Reader theme uses CSS vars; Shiki colors are inline in HTML. Ensure `patchNeedsFullRender` treats `theme` as full re-render; keep `shiki-config.js` preset map in sync with `src/theme/index.js`. See `.cursor/rules/35-reader-theme-and-shiki.mdc`.

- **Fenced code layout (lines, tabs)**:
  - `normalizeShikiPreWhitespace`, `content.css` `pre.shiki` rules, and sanitize `ADD_ATTR` for Shiki output.

- **Plugin behavior**:
  - `src/plugins/plugin-manager.js`, individual plugins under `src/plugins/core/`, and `renderer.js` / `app.js` for `afterRender` DOM passes.

## 10) Operational notes for contributors and AI agents

- Keep message names centralized in `src/messaging/index.js`.
- Prefer `sendMessage()` wrapper instead of direct ad-hoc messaging in UI/content code.
- Preserve viewer lifecycle: `init()` -> `updateSettings()` -> `destroy()`; document render is **async** (`await render()`).
- Keep all source edits in `src/**` and rebuild for extension output (`npm run build`).
- When adding runtime-fetched viewer assets, sync `manifest.json` `web_accessible_resources`.
- For architecture detail on Shiki and presets, see `.cursor/rules/35-reader-theme-and-shiki.mdc` and this doc’s section 5.
