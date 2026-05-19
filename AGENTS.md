# Markdown Plus Agent Rules

## Project Context

- This project is a Chrome Extension MV3 Markdown viewer for local `file:` Markdown documents.
- Runtime truth is `src/**`, `manifest.json`, `vite.config.mjs`, and `package.json`.
- Start architecture-sensitive work by reading `docs/project-overview-for-ai.md`. For performance work, also read `docs/performance-issues-audit.md`.
- Treat `docs/technical-spec-phases/**`, `docs/react-migration-plan.md`, and older phase plans as historical intent when they conflict with current source.
- `docs/refactor-progress-log.md` records completed refactor phases. Do not preserve phase-specific constraints just because they appear in the log.
- Update `docs/project-overview-for-ai.md` when moving ownership boundaries, changing entry flows, or introducing/removing major modules.
- Treat `dist/**` as generated output. Do not hand-edit it.

## Environment, Build, and Assets

- Use Node 20 or newer before npm scripts. Prefer `nvm use 20` or `source ~/.nvm/nvm.sh && nvm use` in non-interactive shells.
- Use project scripts from `package.json`: `npm test`, `npm run build`, `npm run dev`, `npm run size:report`.
- Keep ESM import paths explicit with `.js` extensions where current source does so.
- Prefer `.scss` for local style sources under `src/**`; do not add new local `.css` source files unless a package or platform constraint requires it.
- Viewer styles live under `src/viewer/styles/**/*.scss` and are imported with `?inline` from `src/content/viewer-loader.js`; they are bundled into the content script rather than loaded as standalone CSS assets.
- Treat `manifest.json` as high-risk config. Keep permissions minimal, explain any new permission by a concrete feature, and keep entry points plus `web_accessible_resources` aligned with actual runtime assets.

## Architecture Boundaries

- Prefer small, focused modules over large orchestration files. Around 300 lines is a review signal: check for independent responsibilities before adding more logic.
- Refactor one boundary at a time. Avoid combining UI redesign, behavior change, and file movement unless the behavior change is required.
- Extract pure helpers first, then side-effect orchestration, then UI composition. Add focused tests before moving behavior-heavy code.
- Keep React components declarative. Browser APIs, runtime messaging, clipboard, printing, downloads, file operations, and navigation side effects belong in action/service modules or focused hooks.
- Keep MV3 browser APIs in ownership layers: background services for background work, `src/messaging/index.js` for UI/content callers, and viewer action modules for document commands.

### Entry and Mount Flow

- Preserve the traceable viewer path: `src/content/index.js` -> `src/content/viewer-loader.js` / `src/content/bootstrap.js` -> `src/viewer/app.js`.
- `src/content/index.js` should stay a cheap gate for local `file:` Markdown files before loading the heavier viewer bundle.
- Keep bootstrap idempotent for reinjection/HMR and avoid repeated full-page scans in content scripts.
- Keep viewer isolation inside the dedicated root (`mdp-viewer-root`) with Shadow DOM when available.

### Viewer App

- Keep `src/viewer/app.js` as the public orchestrator; focused implementation belongs under `src/viewer/app/`.
- Current app controller ownership:
  - `renderController.js`: async render orchestration, render token, scroll preservation, TOC hydration, render context cache lifecycle.
  - `editorSessionController.js`: edit mode, dirty/save status, debounced live preview, save flow.
  - `splitScrollSync.js`: editor-to-preview scroll sync listeners/RAF/cleanup.
  - `viewerStyles.js`: reader/theme variables, sidebar width preference, edit-mode article style overrides.
  - `globalViewerListeners.js`: `beforeunload` and Ctrl/Cmd+S handling.
  - `createExplorerBridge.js`: bridge object passed into React explorer.
- `MarkdownViewerApp.destroy()` must stay idempotent and clean up app controllers, article interactions, React root, listeners, and DOM references.

### React Shell

- React owns viewer chrome only: shell, floating actions, sidebar, outline, files explorer, editor shell, toast.
- React must not reconcile rendered Markdown under `.mdp-markdown-body`; that subtree is owned by the render pipeline and plugin `afterRender` hooks.
- Preserve stable shell class names and hierarchy (`mdp-root`, `mdp-sidebar`, `mdp-markdown-body`) unless migrating SCSS and scroll math in the same change.
- Prefer shared chrome primitives for repeated controls:
  - `src/viewer/react/components/common/IconButton.jsx`
  - `src/viewer/react/components/common/ActionMenu.jsx`
  - `src/viewer/react/hooks/useDismissableLayer.js`
- Dismiss/escape behavior must be Shadow DOM-safe and cleaned up from React effects.
- Prefer `src/shared/react/Skeleton.jsx` and `src/shared/styles/_skeleton.scss` for loading placeholders.

### Explorer

- Keep `useExplorer.js` as a React composition hook.
- Non-React explorer workflows belong in `src/viewer/explorer/` and should not import React.
- React-only explorer adapters belong under `src/viewer/react/hooks/explorer/`.
- Preserve the explorer bridge contract: `navigateToFile` and `virtualFileExists` are assigned by the hook and cleared on cleanup.
- Preserve workspace virtual-file behavior and `MDP_WS_FILE`; do not convert virtual workspace files into `file:` URLs.
- Sibling/workspace scans must support cancellation via `AbortController` on teardown, workspace switch/open, mode changes, and explicit progress cancellation.

## Rendering Pipeline and Security

- Keep the normal Markdown HTML path intact: `renderDocument()` -> `sanitizeHtml()` -> `renderIntoElement()`.
- Do not add rendered HTML paths that bypass `sanitizeHtml()` in `src/viewer/core/renderer.js`.
- `renderDocument()` is the main Markdown -> safe HTML boundary. Callers should receive sanitized HTML before DOM insertion.
- Restrict `innerHTML` usage to approved render/mount boundaries. Use `textContent` and DOM APIs for dynamic UI text.
- Keep `DOMPurify` configured from the runtime `window` purifier instance unless intentionally extracting the sanitizer with equivalent behavior.
- Preserve heading `id` generation when changing MarkdownIt or `markdown-it-anchor`; TOC and link navigation rely on it.
- External Markdown links should keep `target="_blank"` and `rel="noopener noreferrer"`.
- Plugin-generated or postprocessed HTML must still pass through the sanitizer before insertion.
- Event listeners added to generated article nodes need teardown paths through `destroy()` or plugin cleanup.

### Render Context and Performance

- Extract pure parsing/normalization logic before changing render orchestration.
- Cache or reuse render context only when invalidation by plugin/parser/theme-affecting settings is explicit and tested.
- Do not cache unsafe pre-sanitize HTML across the sanitize boundary unless the cache key and sanitize step remain obvious and tested.
- Reader style-only changes should stay on the fast path through `needsFullRender()` where possible.

### Theme and Shiki

- Reader presets are defined in `src/theme/index.js`; the default preset lives in `DEFAULT_SETTINGS.theme.preset`.
- `src/viewer/core/shiki-config.js` must map every reader preset key to a bundled Shiki theme id and keep the explicit grammar/theme allowlists in sync.
- Shiki emits inline styles that must remain allowed by sanitizer config when code highlighting is enabled.
- Shiki/reader theme changes that affect fenced code require a full render because code colors are baked into HTML.
- Keep `.mdp-markdown-body pre.shiki code` specificity higher than generic inline-code styles so Shiki block whitespace remains stable.

## Settings and Messaging

- Message type names must come from `MESSAGE_TYPES` in `src/messaging/index.js`; do not introduce ad-hoc runtime message strings.
- UI/content/popup/options/viewer callers should use `sendMessage()` from `src/messaging/index.js` instead of direct `chrome.runtime.sendMessage`.
- Preserve the runtime response envelope from `src/background/service-worker.js`: `{ ok: true, data }` or `{ ok: false, error }`.
- Keep `src/background/message-router.js` readable as a route table over small service calls.
- Offscreen bridge wire messages (`OFFSCREEN_FETCH`, `OFFSCREEN_FETCH_DONE`) intentionally bypass `routeMessage()` in `service-worker.js`.
- Background/service ownership modules may use direct `chrome.*` APIs where they own that browser integration.
- Use `logger` from `src/shared/logger.js` for logs.

### Settings Ownership

- `src/settings/default-settings.js` owns `DEFAULT_SETTINGS`.
- `src/settings/settings-service.js` owns `chrome.storage`, storage key, default-safe merge, save, and reset.
- `src/settings/index.js` is the compatibility export surface for existing callers.
- Preserve default-safe loading with `deepMerge(DEFAULT_SETTINGS, raw)`.
- If the settings schema changes incompatibly, bump `settings.version` and add an explicit migration in the settings service.
- Popup/options should persist settings through `SAVE_SETTINGS`; do not read or write `chrome.storage` directly from those pages.

### Live Updates

- After save/reset, background broadcasts `MESSAGE_TYPES.SETTINGS_UPDATED` so content scripts can call `MarkdownViewerApp.updateSettings()` or teardown.
- If optimizing broadcast targeting, prove existing Markdown viewer tabs still receive runtime updates.
- `updateSettings()` should apply reader styles immediately and only trigger full Markdown render when `needsFullRender(previous, next)` requires it.

## Plugins

- Classify every plugin explicitly as core or optional.
- Use `src/plugins/core/**` for lightweight baseline Markdown behavior that most documents benefit from.
- Use `src/plugins/optional/**` for specialized or heavier behavior such as diagrams, math, extra syntax, large dependencies, or lazy initialization.
- Add plugin ids in `src/plugins/plugin-types.js` and defaults in `DEFAULT_SETTINGS.plugins`.
- Core plugins usually default to enabled. Heavy optional plugins should default to disabled unless there is a deliberate product reason.
- Register plugins in `src/plugins/plugin-manager.js`.
- Add popup labels in `src/popup/settings-constants.js`; plugin UI should be driven from merged defaults/settings rather than duplicated shapes.
- Prefer dynamic import for heavy optional dependencies.
- Plugin failures must not break the full viewer. Log warnings and keep safe fallback content.
- If runtime assets are loaded through extension URLs, update `manifest.json` `web_accessible_resources` in the same change.
- Any plugin output that becomes article HTML must stay inside the render sanitizer path.

## Quality and Observability

- Do not swallow async errors. Either rethrow, surface a user-safe fallback, or return a structured runtime error response.
- Normalize unknown errors before logging/responding from background message handlers.
- Use `logger` instead of raw `console.*` so logs stay searchable and consistent.
- Log intent plus lightweight context, not full Markdown document content or sensitive data.
- Prefer explicit failure paths in bootstrap/render flows: fail fast on missing critical data and exit early on unsupported states.
- Add or update focused tests for URL/path logic, render settings invalidation, explorer state transitions, editor dirty/save flow, and message routing when touching those areas.
- For behavior changes, run `npm test`. For packaged/runtime changes, also run `npm run build`.
- For bundle-sensitive changes, especially plugins, Shiki, editor, Mermaid, Math, or content script entrypoints, run `npm run size:report` and compare against the prior result.
