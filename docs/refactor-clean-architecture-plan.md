# Refactor plan: clean architecture, dedup, maintainability

Date: 2026-05-15

## Goal

Make `markdown-plus` easier to read, safer to change, and friendlier for both new developers and AI coding agents without rewriting the product. The refactor should preserve the current MV3 runtime behavior, React shell boundary, markdown render pipeline security boundary, and existing feature set.

Primary outcomes:

- Smaller modules with one clear reason to change.
- Clearer boundaries between orchestration, pure domain logic, browser APIs, React UI, and side effects.
- Less duplicated UI/action code.
- More tests around extracted pure logic before moving behavior.
- Architecture docs and Cursor rules that guide future changes consistently.

## Current architecture snapshot

The codebase already has useful top-level ownership:

- `src/content`: cheap page gate, bootstrap, raw markdown extraction, viewer loader.
- `src/background`: MV3 service worker, message router, file/history/offscreen services.
- `src/viewer`: viewer orchestrator, markdown rendering, article interactions, explorer, editor, React shell.
- `src/popup` and `src/options`: settings and history UI.
- `src/shared`: constants, clipboard, downloads, logger, markdown detection, reusable React skeletons.
- `src/plugins`: markdown-it plugins and optional heavy plugins.

The main maintainability risks are concentrated in a few files:

| File | Lines | Risk |
| --- | ---: | --- |
| `src/viewer/react/hooks/useExplorer.js` | 961 | Scanning, navigation, workspace restore, tree state, bridge mutation, history/hash/focus, error UI in one hook. |
| `src/viewer/app.js` | 608 | App lifecycle, render orchestration, editor dirty/save state, scroll sync, styles, file history, global listeners in one class. |
| `src/viewer/react/components/FloatingActions.jsx` | 305 | Document commands, menu behavior, editor mode controls, copy feedback, UI rendering in one component. |
| `src/viewer/react/components/explorer/FileRow.jsx` | 206 | Row rendering, open-new-tab behavior, copy-link behavior, menu outside-click logic, local icons. |
| `src/viewer/core/markdown-engine.js` | 248 | Markdown parser setup plus local-link normalization parser in one file. |

This is not a sign that the project is broken. It means the next refactor should extract stable seams around behavior that is already working.

## Refactor principles

1. Preserve behavior first. Any extraction should be covered by tests or be mechanical enough to review line-by-line.
2. Extract pure logic before moving side effects. Pure URL/link/tree/settings helpers are easiest to test and safest to reuse.
3. Keep browser APIs behind ownership modules. React components should not directly know more browser/runtime details than necessary.
4. Keep React out of the markdown article DOM. The `article.innerHTML` boundary remains imperative and sanitized through `renderDocument()`.
5. Avoid broad rewrites. Move one responsibility at a time, run tests, and update docs/rules with each architectural boundary change.
6. Prefer feature folders for viewer subdomains: `viewer/explorer`, `viewer/editor`, `viewer/rendering`, `viewer/actions`, `viewer/react`.

## Target source structure

This is a direction, not a mandatory one-shot move.

```text
src/viewer/
  app/
    MarkdownViewerApp.js
    createExplorerBridge.js
    renderController.js
    editorSessionController.js
    splitScrollSync.js
    viewerStyles.js
  explorer/
    explorer-navigation.js
    explorer-scan-session.js
    explorer-workspace-session.js
    explorer-files-context.js
    explorer-state.js
    explorer-tree-utils.js
    folder-scanner.js
    sibling-scanner.js
    url-utils.js
    workspace-picker.js
  react/
    hooks/
      explorer/
        useExplorer.js
        useExplorerState.js
        useExplorerActions.js
        useExplorerBridgeRegistration.js
    components/
      common/
        ActionMenu.jsx
        IconButton.jsx
        OutsideDismissLayer.jsx
      explorer/
      icons/
  core/
    markdown-engine.js
    markdown-link-normalizer.js
    renderer.js
```

The folder split should happen gradually. Import aliases are not needed now; relative imports are acceptable while the project is small.

## Phase 0: safety baseline

Before refactoring behavior:

- Run `npm test` and `npm run build`.
- Capture current file-size and bundle-size baseline with `npm run size:report` after build.
- Add a lightweight `docs/refactor-progress-log.md` when implementation starts, recording each extracted module and verification command.
- Keep `docs/project-overview-for-ai.md` updated whenever source ownership moves.

Recommended first tests to add:

- `buildCurrentFileLink()` already exists; add or extend tests for virtual workspace hrefs, same browser URL hash preservation, and empty inputs.
- Local markdown link normalization in `markdown-engine.js`: spaces, titles, code spans, fenced code, nested parentheses.
- Explorer navigation pure helpers after extraction: same-file navigation, workspace virtual navigation, sibling scan reuse condition.

## Phase 1: split `MarkdownViewerApp`

Problem: `src/viewer/app.js` owns too many independent workflows. This makes future editor/render/navigation changes risky.

Target extraction:

- `viewer/app/viewerStyles.js`
  - Move `clampSidebarWidth`, `createStyleElement`, `applySidebarWidthPreference`, `applyReaderStyles`, `_applyEditModeOverrides`.
  - Keep only a thin call from `MarkdownViewerApp`.
- `viewer/app/renderController.js`
  - Own render token, TOC ready flag, scroll snapshot/restore, `renderDocument()`, `renderIntoElement()`, plugin `afterRender`, and `syncTocItems`.
  - Expose `render({ preserveScroll, honorHash })` and `syncTocItems()`.
- `viewer/app/editorSessionController.js`
  - Own edit mode active, dirty state, save status, save in flight, beforeunload/Ctrl+S, debounced preview render.
  - Keep file save through `editor/file-io.js`.
- `viewer/app/splitScrollSync.js`
  - Own preview/editor user intent listeners, RAF scheduling, `computePreviewScrollTarget`, `smoothScrollPreviewTo`, cleanup.
- `viewer/app/createExplorerBridge.js`
  - Build the bridge object passed to React and isolate bridge mutation shape.

Acceptance criteria:

- `src/viewer/app.js` drops below about 250 lines.
- Public behavior of `MarkdownViewerApp.init()`, `updateSettings()`, `render()`, and `destroy()` remains unchanged.
- Existing editor scroll sync tests still pass; add direct tests for extracted pure clamp/style decisions where useful.

## Phase 2: split explorer orchestration

Problem: `useExplorer.js` is the largest file and mixes React hook state with domain workflows and browser/runtime side effects.

Target extraction:

- `explorer/explorer-navigation.js`
  - Move focus after navigation, deferred hash retry, URL history update, title update, self/current file comparison, post-navigation tree reveal decision.
  - Keep functions dependency-injected with bridge/sendMessage instead of importing React.
- `explorer/explorer-scan-session.js`
  - Wrap `AbortController`, progress payload creation, cancellation, and fallback behavior.
  - Add sibling scan abort support. This also addresses open performance issue #13.
- `explorer/explorer-workspace-session.js`
  - Own workspace open/restore/exit flows for directory handle, webkit virtual files, and persisted file root.
- `react/hooks/explorer/useExplorerBridgeRegistration.js`
  - Own bridge mutation for `navigateToFile` and `virtualFileExists`.
- `react/hooks/explorer/useExplorerActions.js`
  - Own the small React action object returned to `ExplorerPanel`.

Acceptance criteria:

- `useExplorer.js` becomes a composition hook under about 250-350 lines.
- Extracted explorer modules do not import React.
- Sibling scans can be aborted during teardown, mode switch, and workspace open.
- Tests cover scan cancellation and post-navigation state decisions.

## Phase 3: deduplicate action menus and button behavior

Problem: `FloatingActions.jsx`, `FileRow.jsx`, and explorer header repeat menu open/close, outside-click dismissal, copy link feedback, and local SVG icons.

Target extraction:

- `react/components/common/OutsideDismissLayer.jsx` or `react/hooks/useDismissableLayer.js`
  - Shared pointerdown/Escape close behavior.
  - Must work inside Shadow DOM by using `getRootNode()`.
- `react/components/common/IconButton.jsx`
  - Shared tooltip + `aria-pressed` + disabled + class composition for icon buttons.
- `react/components/common/ActionMenu.jsx`
  - Shared menu trigger/menu item structure for export menu and file row actions.
- `viewer/actions/file-row-actions.js`
  - Move `isPlainPrimaryClick`, `isBrowserOpenableFileHref`, `openFileHrefInNewTab`, and copy file link behavior out of `FileRow.jsx`.
- Promote local row icons.
  - Move `MoreIcon` and `OpenNewTabIcon` into `react/components/icons/`.

Acceptance criteria:

- `FloatingActions.jsx` focuses on declaring available commands.
- `FileRow.jsx` focuses on row markup and delegates behavior.
- No change to keyboard/mouse behavior.
- Existing styles continue to apply, or class names are intentionally migrated in one SCSS patch.

## Phase 4: rendering pipeline cleanup

Problem: rendering is behaviorally correct but costly and parser-related responsibilities are mixed.

Target extraction:

- `core/markdown-link-normalizer.js`
  - Move `normalizeLocalMarkdownLinkDestinations()` and helper functions out of `markdown-engine.js`.
  - Add tests for edge cases before extraction.
- `core/create-render-context.js`
  - Centralize plugin manager creation, markdown engine creation, and render settings hash.
- Render reuse investigation.
  - Cache markdown engine/plugin manager when plugin settings do not change.
  - Keep security boundary: all output still passes through `sanitizeHtml()` before `innerHTML`.
- Loading state.
  - Add a viewer render busy flag to React shell so large renders show a visible progress/skeleton state.

Acceptance criteria:

- `markdown-engine.js` mostly describes markdown-it setup and source-line mapping.
- Render pipeline has a clear extension point for future worker/progressive render work.
- No unsanitized HTML path is introduced.

## Phase 5: settings and messaging cleanup

Problem: settings and messaging are already centralized, but the API shape can be clearer and future broadcast cost is known.

Target extraction:

- `settings/default-settings.js`
  - Move `DEFAULT_SETTINGS` out of `settings/index.js`.
- `settings/settings-service.js`
  - Keep storage read/write/merge logic isolated.
- `background/settings-broadcast-service.js`
  - Move `notifySettingsUpdated()` out of `message-router.js`.
  - Later optimize broadcast to only interested tabs or relevant URL patterns.
- `messaging/message-contracts.js` if message types keep growing.
  - Keep `MESSAGE_TYPES` centralized; do not introduce direct string literals.

Acceptance criteria:

- `message-router.js` becomes a readable route table over small service functions.
- Settings defaults can be imported by tests without importing storage service code.
- Existing response envelope remains `{ ok, data/error }`.

## Phase 6: docs and rules cleanup

Update docs after each implemented phase:

- `docs/project-overview-for-ai.md`: actual folder map and ownership boundaries.
- `docs/performance-issues-audit.md`: mark issues resolved or moved.
- `docs/react-migration-plan.md`: archive completed migration notes or trim stale implementation details.
- Phase specs under `docs/technical-spec-phases/`: keep as historical specs; do not treat them as runtime truth when source differs.

Rules to keep/update:

- Keep `.cursor/rules/15-docs-context-first.mdc`.
- Keep `.cursor/rules/80-viewer-ui-lifecycle.mdc`, but update references after `app.js` split.
- Add a clean architecture/refactor rule so future agents extract pure logic first and keep React/browser/markdown boundaries clear.

## Phase 7: tests and verification matrix

Minimum verification per refactor PR/commit:

- `npm test`
- `npm run build`
- Manual smoke in Chrome extension for:
  - Opening a local `.md` file.
  - Toggling reader settings in popup.
  - Internal markdown link navigation and hash navigation.
  - Files explorer sibling mode and workspace mode.
  - Edit mode, split preview, Ctrl/Cmd+S fallback flow.
  - Export HTML/Word and print dialog.

Test coverage priorities:

- Pure URL/link/path logic.
- Explorer state transitions and cancellation.
- Render settings diff and render context reuse.
- Editor dirty/save state transitions.
- Dismissable menu behavior with Shadow DOM event roots.

## Suggested implementation order

1. Add tests for markdown link normalization and file link actions.
2. Extract `markdown-link-normalizer.js`.
3. Extract shared dismissable menu hook and row/file action helpers.
4. Split `FloatingActions.jsx` and `FileRow.jsx`.
5. Extract `splitScrollSync.js` from `MarkdownViewerApp`.
6. Extract editor session state from `MarkdownViewerApp`.
7. Extract render controller from `MarkdownViewerApp`.
8. Split explorer scan/navigation/workspace sessions and add sibling abort.
9. Split settings broadcast/defaults.
10. Update architecture docs and performance audit status.

This order starts with low-risk pure logic, then UI dedup, then lifecycle-heavy modules.

## Non-goals for the first refactor pass

- Do not migrate the whole project to TypeScript yet. Add JSDoc where it improves contracts.
- Do not replace the markdown renderer.
- Do not move the sanitized article DOM under React.
- Do not redesign the UI while refactoring internals.
- Do not introduce a state management library unless React context/hooks become a measurable blocker.

## Stop conditions

Pause and reassess if any phase causes:

- Build output to grow unexpectedly.
- Extension permissions or manifest behavior to change.
- Markdown HTML to bypass `sanitizeHtml()`.
- Content script gate to load heavy viewer code on non-markdown pages.
- A refactor PR/commit touching more than one major feature area without tests.
