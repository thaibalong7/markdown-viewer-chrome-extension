# Refactor progress log

## 2026-05-18 - Phase 6 docs and rules cleanup

Scope:

- Reviewed requested clean-architecture docs, performance audit, React migration plan, current rules, and current source ownership after Phase 1-5.
- Updated `docs/project-overview-for-ai.md` to reflect the current settings split:
  - `src/settings/default-settings.js` owns pure defaults.
  - `src/settings/settings-service.js` owns `chrome.storage`, storage key, merge/save/reset.
  - `src/settings/index.js` is now only the compatibility export surface.
- Updated `docs/performance-issues-audit.md`:
  - Marked Issue #13 as `RESOLVED` for sibling scan abort support.
  - Marked Issue #26 as `RESOLVED` for render context/plugin manager/markdown engine reuse.
  - Kept render main-thread/sanitize cost under Issue #8 as still open / partially addressed.
  - Updated Issue #38 ownership from `settings/index.js` to `settings-service.js`.
- Added archive/source-truth notes to `docs/react-migration-plan.md` so historical pre-React architecture sections do not look like current runtime architecture.
- Added implementation-status notes to both clean architecture plans (`docs/refactor-clean-architecture-plan.md`, `docs/refactor-clean-architecture-plan.vi.md`) with current line-count snapshot after Phase 1-5.
- Updated rules:
  - Consolidated the previous phase-specific and narrow rules into the current long-lived set:
    - `.cursor/rules/00-project-context.mdc`
    - `.cursor/rules/10-environment-build-and-assets.mdc`
    - `.cursor/rules/20-architecture-boundaries.mdc`
    - `.cursor/rules/30-rendering-pipeline-security.mdc`
    - `.cursor/rules/40-settings-messaging.mdc`
    - `.cursor/rules/50-plugins.mdc`
    - `.cursor/rules/60-quality-observability.mdc`

Rules:

- Removed phase-only rule files after folding their durable constraints into the consolidated rules above.

Verification:

- `nvm use`
  - Direct result: failed in the non-interactive shell because `nvm` was not on PATH.
  - Follow-up command: `source ~/.nvm/nvm.sh && nvm use`
  - Result: passed with Node `20.19.5`.
- `npm test`
  - Direct result after the standalone `nvm use`: failed because the next shell used an older Node that cannot parse Vitest's `??=`.
  - Follow-up command: `source ~/.nvm/nvm.sh && nvm use && npm test`
  - Result: passed.
  - 21 test files, 127 tests passed.
- `npm run build`
  - Command: `source ~/.nvm/nvm.sh && nvm use && npm run build`
  - Result: passed.
  - Notable warning: Vite reports some chunks larger than 500 kB after minification.
- `npm run size:report`
  - Command: `source ~/.nvm/nvm.sh && nvm use && npm run size:report`
  - Result: passed.
  - `dist`: 8.8M
  - `dist/assets/*.js` total: 7.7M
- `git diff --check`
  - Result: passed.

Notes:

- No runtime source refactor, UI change, public behavior change, message type/envelope change, or settings storage key change was made.
- `docs/technical-spec-phases/**` was intentionally left unchanged. Those files are historical specs; the only needed clarification was added to the docs-context rule and React migration archive note.
- Performance issues were not marked resolved when only ownership moved. Issue #12 remains open after the Phase 5 broadcast-service split; Issue #8 remains partially addressed because main-thread parse/Shiki/sanitize cost still exists.

## 2026-05-18 - Phase 5 settings and messaging cleanup

Scope:

- Moved pure settings defaults from `src/settings/index.js` to `src/settings/default-settings.js`.
- Moved storage ownership, `STORAGE_KEYS.SETTINGS`, default-safe `deepMerge`, save, and reset logic to `src/settings/settings-service.js`.
- Kept `src/settings/index.js` as a compatibility export surface for existing settings imports.
- Updated popup constants to import `DEFAULT_SETTINGS` from the pure defaults module.
- Moved settings update broadcast from `src/background/message-router.js` to `src/background/settings-broadcast-service.js`.
- Refactored `message-router.js` into a route table via `createMessageRouter(...)`, preserving message type strings and runtime response envelope handling in `service-worker.js`.
- Kept settings broadcast behavior conservative: save/reset still sends `MESSAGE_TYPES.SETTINGS_UPDATED` to queried tabs and ignores tabs without content scripts.
- Added a settings/messaging refactor rule, later consolidated into `.cursor/rules/40-settings-messaging.mdc`, and updated the settings storage rule for the new defaults/service split.
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
- Added render context reuse inside each `renderController` instance:
  - Reuses plugin manager + markdown engine when effective plugin settings and reader preset are unchanged.
  - Invalidates the single-entry cache when plugin settings or reader preset changes.
  - Clears cache on controller destroy.
  - Does not cache rendered HTML before or after `sanitizeHtml()`.
- Updated `renderDocument()` to use the render context while preserving the markdown -> safe HTML boundary: plugin hooks + markdown render + Shiki + `sanitizeHtml()`.
- Added article busy/progress state in `src/viewer/app/renderController.js` during normal async renders, reusing the existing `aria-busy` article styling without moving rendered article DOM into React.
- Added render pipeline guardrails, later consolidated into `.cursor/rules/30-rendering-pipeline-security.mdc`.
- Updated architecture/performance docs for the new core ownership and partially addressed render pipeline performance issue.
- Added focused tests for render settings hash, context cache reuse/invalidation, internal runtime context isolation, and `renderDocument()` metadata/no-HTML-cache behavior.

Verification:

- `nvm use`
  - Result: passed with Node `20.19.5`.
- `npm test`
  - Result: passed.
  - After Phase 4 follow-up: 21 test files, 127 tests passed.
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
- Added action-menu boundary guidance, later consolidated into `.cursor/rules/20-architecture-boundaries.mdc`.
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
