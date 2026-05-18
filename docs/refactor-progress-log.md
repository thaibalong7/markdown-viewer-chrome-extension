# Refactor progress log

## 2026-05-18 - Phase 5 settings and messaging cleanup

Scope:

- Moved pure settings defaults from `src/settings/index.js` to `src/settings/default-settings.js`.
- Moved storage ownership, `STORAGE_KEYS.SETTINGS`, default-safe `deepMerge`, save, and reset logic to `src/settings/settings-service.js`.
- Kept `src/settings/index.js` as a compatibility export surface for existing settings imports.
- Updated popup constants to import `DEFAULT_SETTINGS` from the pure defaults module.
- Moved settings update broadcast from `src/background/message-router.js` to `src/background/settings-broadcast-service.js`.
- Refactored `message-router.js` into a route table via `createMessageRouter(...)`, preserving message type strings and runtime response envelope handling in `service-worker.js`.
- Kept settings broadcast behavior conservative: save/reset still sends `MESSAGE_TYPES.SETTINGS_UPDATED` to queried tabs and ignores tabs without content scripts.
- Added `.cursor/rules/88-settings-messaging-refactor.mdc` and updated the settings storage rule for the new defaults/service split.
- Updated architecture and performance docs to reflect new ownership; performance issue #12 remains open because broadcast targeting was not optimized in this phase.

Tests added:

- `src/settings/__tests__/default-settings.test.js`
- `src/settings/__tests__/settings-service.test.js`
- `src/background/__tests__/message-router.test.js`
- `src/background/__tests__/settings-broadcast-service.test.js`

Verification:

- `nvm use`
  - Result: passed with Node `20.19.5`.
- `npm test`
  - Result: passed.
  - 20 test files, 119 tests passed.
- `npm run build`
  - Result: passed.
  - Notable warning: Vite reports some chunks larger than 500 kB after minification.
- `npm run size:report`
  - Result: passed.
  - `dist`: 8.8M
  - `dist/assets/*.js` total: 7.7M

Manual smoke focus for this phase:

- Popup settings: change reader font size, theme, and content width.
- Existing local `.md` viewer receives runtime `SETTINGS_UPDATED`.
- Reset settings from popup/options.
- Enable/disable extension viewer setting if available.
- Toggle Mermaid/Math/Emoji/Footnote and reload/render a test file.
- File history: record, open, and clear entries.
- Background console stays clean when many tabs do not have the content script.

## 2026-05-18 - Phase 4 rendering pipeline cleanup

Scope:

- Moved local markdown link normalization out of `src/viewer/core/markdown-engine.js` into `src/viewer/core/markdown-link-normalizer.js`.
- Added focused normalizer tests for:
  - links with spaces.
  - links with titles.
  - inline code spans.
  - fenced code blocks.
  - nested parentheses.
  - external and unsafe absolute link behavior.
- Added `src/viewer/core/create-render-context.js` to centralize plugin manager creation, markdown engine creation, source-line mapping, and render-affecting settings hash.
- Kept render context cache disabled. The new settings hash prepares a future cache key, but no engine/plugin manager reuse is enabled until invalidation behavior is covered more broadly.
- Updated `renderDocument()` to use the render context while preserving the markdown -> safe HTML boundary: plugin hooks + markdown render + Shiki + `sanitizeHtml()`.
- Added article busy/progress state in `src/viewer/app/renderController.js` during normal async renders, reusing the existing `aria-busy` article styling without moving rendered article DOM into React.
- Added `.cursor/rules/87-render-pipeline-refactor.mdc` for render pipeline guardrails.
- Updated architecture/performance docs for the new core ownership and partially addressed render pipeline performance issue.

Verification:

- `nvm use`
  - Result: passed with Node `20.19.5`.
- `npm test`
  - Result: passed.
  - 16 test files, 110 tests passed.
- `npm run build`
  - Result: passed.
  - Notable warning: Vite reports some chunks larger than 500 kB after minification.
- `npm run size:report`
  - Result: passed.
  - `dist`: 8.8M
  - `dist/assets/*.js` total: 7.7M

Manual smoke focus for this phase:

- File with headings/TOC, including first render skeleton then hydrated outline.
- Code blocks with Shiki on light/dark reader themes.
- Relative links with spaces and titles.
- Inline code and fenced code containing text that looks like markdown links.
- Mermaid with plugin enabled.
- Math/KaTeX with plugin enabled.
- Reader theme change from popup.
- Plugin setting change from popup.

## 2026-05-18 - Phase 3 deduplicate action menus and button behavior

Scope:

- Added shared viewer UI primitives:
  - `src/viewer/react/components/common/IconButton.jsx`
  - `src/viewer/react/components/common/ActionMenu.jsx`
- Added shared React hooks:
  - `src/viewer/react/hooks/useDismissableLayer.js` for Shadow DOM-aware pointer/Escape dismissal.
  - `src/viewer/react/hooks/useCopyFeedback.js` for temporary copied-state feedback.
- Moved explorer file-row behavior into `src/viewer/actions/file-row-actions.js`:
  - plain primary click detection.
  - browser-openable file href checks.
  - new-tab opening.
  - copy file-row link behavior.
- Promoted file row local icons into:
  - `src/viewer/react/components/icons/MoreIcon.jsx`
  - `src/viewer/react/components/icons/OpenNewTabIcon.jsx`
- Refactored `FloatingActions.jsx`, `ExplorerHeader.jsx`, and `FileRow.jsx` to declare commands and menu items while preserving existing class names.
- Added `.cursor/rules/86-viewer-action-menu-refactor.mdc` to document the new action-menu boundary.
- Added focused tests for file-row action helpers and dismissable-layer helper behavior.

Verification:

- `nvm use`
  - Direct result: failed in the non-interactive shell because `nvm` was not on PATH.
  - Follow-up command: `source ~/.nvm/nvm.sh && nvm use`
  - Result: passed with Node `20.19.5`.
- `npm test`
  - Result: passed.
  - 14 test files, 100 tests passed.
- `npm run build`
  - Result: passed.
  - Notable warning: Vite reports some chunks larger than 500 kB after minification.
- `npm run size:report`
  - Result: passed.
  - `dist`: 8.8M
  - `dist/assets/*.js` total: 7.7M

## 2026-05-18 - Phase 2 split explorer orchestration

Scope:

- Kept `src/viewer/react/hooks/useExplorer.js` as the React composition hook and reduced it to 344 lines.
- Moved non-React explorer workflows into focused modules:
  - `src/viewer/explorer/explorer-navigation.js`
  - `src/viewer/explorer/explorer-scan-session.js`
  - `src/viewer/explorer/explorer-workspace-session.js`
- Moved React-only adapters into:
  - `src/viewer/react/hooks/explorer/useExplorerBridgeRegistration.js`
  - `src/viewer/react/hooks/explorer/useExplorerActions.js`
- Added AbortController-backed sibling scan sessions. Sibling scans now abort on teardown, workspace open/mode switch, and explicit progress cancellation.
- Preserved `explorerBridge.navigateToFile` and `explorerBridge.virtualFileExists` assignment/cleanup contracts.
- Added focused tests for scan cancellation, sibling cancellation, and navigation/workspace document-validity decisions.

Verification:

- `nvm use`
  - Result: passed with Node `20.19.5`.
- `npm test`
  - Result: passed.
  - 12 test files, 93 tests passed.
- `npm run build`
  - Result: passed.
  - Notable warning: Vite reports some chunks larger than 500 kB after minification.
- `npm run size:report`
  - Result: passed.
  - `dist`: 8.8M
  - `dist/assets/*.js` total: 7.6M

## 2026-05-16 - Phase 1 split `MarkdownViewerApp`

Scope:

- Split `src/viewer/app.js` into focused app modules:
  - `src/viewer/app/viewerStyles.js`
  - `src/viewer/app/renderController.js`
  - `src/viewer/app/editorSessionController.js`
  - `src/viewer/app/splitScrollSync.js`
  - `src/viewer/app/createExplorerBridge.js`
  - `src/viewer/app/globalViewerListeners.js`
- Kept public import path stable: `content/bootstrap.js` still imports `MarkdownViewerApp` from `src/viewer/app.js`.
- Reduced `src/viewer/app.js` from 608 lines to 250 lines.
- Updated architecture docs/rules to describe the new app module ownership.

Verification:

- `npm test`
  - Result: passed.
  - 8 test files, 82 tests passed.
- `npm run build`
  - Result: passed.
  - Notable warning: Vite reports some chunks larger than 500 kB after minification.
- `npm run size:report`
  - Result: passed.
  - `dist`: 8.8M
  - `dist/assets/*.js` total: 7.6M

Manual smoke focus for this phase:

- Initial viewer mount and first render.
- TOC hydration and heading click behavior.
- Popup reader setting changes that use the style-only fast path.
- Edit mode dirty state, Ctrl/Cmd+S save shortcut, and beforeunload prompt.
- Editor split preview scroll sync.
- Internal Markdown link navigation and explorer current-file sync.

## 2026-05-16 - Phase 0 baseline

Scope:

- Created the baseline progress log for the refactor plan.
- Added `.nvmrc` with Node `20.19.5` so `nvm use` matches `package.json` (`>=20`).
- Added first safety tests before behavior refactors:
  - `src/viewer/actions/__tests__/file-link-actions.test.js`
  - `src/viewer/core/__tests__/markdown-engine.test.js`

Environment:

- Default shell Node was `v14.21.3`, which cannot run current Vitest.
- Baseline commands were run with `nvm use 20.19.5`.

Verification:

- `npm test`
  - Result: passed.
  - Baseline before adding new tests: 6 test files, 72 tests passed.
  - After Phase 0 safety tests: 8 test files, 82 tests passed.
- `npm run build`
  - Result: passed.
  - Notable warning: Vite reports some chunks larger than 500 kB after minification.
- `npm run size:report`
  - Result: passed.
  - `dist`: 8.8M
  - `dist/assets/*.js` total: 7.6M

Notes:

- Vite/CRX emitted warnings about both `rollupOptions` and `rolldownOptions` being specified by CRX plugins. These warnings existed during baseline and were not introduced by Phase 0.
- Build output in `dist/` was regenerated by `npm run build`; do not hand-edit generated files.
