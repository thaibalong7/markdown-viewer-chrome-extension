---
description: "Markdown rendering, DOM safety, render performance, themes, and Shiki constraints."
alwaysApply: false
globs:
  - "src/viewer/**/*.js"
  - "src/viewer/**/*.jsx"
  - "src/content/**/*.js"
  - "src/plugins/**/*.js"
  - "src/theme/**/*.js"
  - "src/shared/settings-diff.js"
  - "src/settings/default-settings.js"
  - "src/settings/settings-schema.js"
  - "src/background/theme-asset-service.js"
  - "src/shared/background-image.js"
  - "src/options/settings-import.js"
  - "src/options/**/*.jsx"
  - "src/viewer/styles/**/*.scss"
paths:
  - "src/viewer/**/*.js"
  - "src/viewer/**/*.jsx"
  - "src/content/**/*.js"
  - "src/plugins/**/*.js"
  - "src/theme/**/*.js"
  - "src/shared/settings-diff.js"
  - "src/settings/default-settings.js"
  - "src/settings/settings-schema.js"
  - "src/background/theme-asset-service.js"
  - "src/shared/background-image.js"
  - "src/options/settings-import.js"
  - "src/options/**/*.jsx"
  - "src/viewer/styles/**/*.scss"
trigger: glob
---

# Rendering Pipeline and Security

- Keep the Markdown HTML path intact: Markdown/plugin transforms -> optional Shiki highlighting -> `sanitizeHtml()` in `renderDocument()` -> `renderIntoElement()`.
- Do not add rendered HTML paths that bypass `sanitizeHtml()` in `src/viewer/core/renderer.js`.
- `renderDocument()` is the main Markdown -> safe HTML boundary. Callers should receive sanitized HTML before DOM insertion.
- Restrict `innerHTML` usage to approved render/mount boundaries. Use `textContent` and DOM APIs for dynamic UI text.
- Keep `DOMPurify` configured from the runtime `window` purifier instance unless intentionally extracting the sanitizer with equivalent behavior.
- Preserve heading `id` generation when changing MarkdownIt or `markdown-it-anchor`; TOC and link navigation rely on it.
- External Markdown links should keep `target="_blank"` and `rel="noopener noreferrer"`.
- Plugin-generated or postprocessed HTML must still pass through the sanitizer before insertion.
- Event listeners added to generated article nodes need teardown paths through `destroy()` or plugin cleanup.

## Non-Markdown Renderers

- Plain text and raw Mermaid source must use `textContent`/DOM APIs, SQL Shiki output must pass through `sanitizeHtml()`, and rendered Mermaid SVG must pass through `sanitizeMermaidSvg()` before insertion.
- Standalone SVG documents must stay image resources rendered through `<img>`; never mount their source as inline SVG markup.
- Document renderers must honor abort signals and return cleanup functions for listeners, lightboxes, or temporary resources they create.

## Render Context and Performance

- Extract pure parsing/normalization logic before changing render orchestration.
- Cache or reuse render context only when invalidation by plugin/parser/theme-affecting settings is explicit and tested.
- Do not cache unsafe pre-sanitize HTML across the sanitize boundary unless the cache key and sanitize step remain obvious and tested.
- Reader style-only changes should stay on the fast path through `needsFullRender()` where possible.

## Theme and Shiki

- Built-in reader themes and custom-theme resolution are defined in `src/theme/index.js`; the active theme id and saved custom themes live under `DEFAULT_SETTINGS.theme`.
- `src/theme/syntax-themes.js` owns the curated syntax-theme catalog and base-theme mapping; `src/viewer/core/shiki-config.js` owns explicit grammar/theme loaders. Keep catalog ids, base mappings, loaders, and their tests in sync.
- Shiki emits inline styles that must remain allowed by sanitizer config when code highlighting is enabled.
- Shiki/reader theme changes that affect fenced code require a full render because code colors are baked into HTML.
- Keep `.mdp-markdown-body pre.shiki code` specificity higher than generic inline-code styles so Shiki block whitespace remains stable.
- Keep custom-theme input structured and schema-validated: accept bounded colors/background descriptors and bundled syntax-theme ids, never arbitrary CSS, raw Shiki JSON, inline SVG, or remote background URLs.
- Theme background images remain device-local: validate the supported image MIME allowlist and 5 MiB limit, persist blobs in IndexedDB by validated `assetId`, and revoke Viewer object URLs on replacement or teardown.
