---
description: "Markdown Plus module ownership and refactor boundaries for runtime source."
alwaysApply: false
globs: "src/**/*.{js,jsx}"
paths:
  - "src/**/*.js"
  - "src/**/*.jsx"
trigger: glob
---

# Architecture Boundaries

- Prefer small, focused modules over large orchestration files. Around 300 lines is a review signal: check for independent responsibilities before adding more logic.
- Refactor one boundary at a time. Avoid combining UI redesign, behavior change, and file movement unless the behavior change is required.
- Extract pure helpers first, then side-effect orchestration, then UI composition. Add focused tests before moving behavior-heavy code.
- Keep React components declarative. Browser APIs, runtime messaging, clipboard, printing, downloads, file operations, and navigation side effects belong in action/service modules or focused hooks.
- Keep MV3 browser APIs in ownership layers: background services for background work, `src/messaging/index.js` for UI/content callers, and viewer action modules for document commands.

## Entry and Mount Flow

- Preserve the traceable viewer path: `src/content/index.js` -> `src/content/viewer-loader.js` / `src/content/bootstrap.js` -> `src/viewer/app.js`.
- `src/content/index.js` should stay a cheap gate using `isDirectActivationUrl()` before loading the heavier viewer bundle; explorer-only formats must not become direct content-script entry points accidentally.
- Keep bootstrap idempotent for reinjection/HMR and avoid repeated full-page scans in content scripts.
- Keep viewer isolation inside the dedicated root (`mdp-viewer-root`) using the current light-DOM strategy documented in `docs/architecture-overview.md`.

## Document Model and Rendering

- Keep supported extensions, activation policy, content kind, renderer id, explorer presentation, and document capabilities centralized in `src/shared/file-types.js`; UI and navigation should consume registry capabilities instead of scattering extension checks.
- Keep `src/viewer/documents/document-loader.js` as the real-file/workspace I/O boundary and `src/viewer/documents/renderer-registry.js` as the lazy renderer resolver.
- Add a new document format through the file-type registry, loader strategy, renderer, and capability-driven UI/tests together.
- Keep renderer cleanup and temporary resources owned by the active document render lifecycle.

## Viewer App

- Keep `src/viewer/app.js` as the public orchestrator; focused implementation belongs under `src/viewer/app/`.
- Current app controller ownership:
  - `documentSessionController.js`: document identity/load lifecycle, stale-load cancellation, renderer-facing loaded state, view mode, and temporary asset cleanup.
  - `renderController.js`: async render orchestration, render token, scroll preservation, TOC hydration, render context cache lifecycle.
  - `editorSessionController.js`: edit mode, dirty/save status, debounced live preview, save flow.
  - `splitScrollSync.js`: editor-to-preview scroll sync listeners/RAF/cleanup.
  - `viewerStyles.js`: reader/theme variables, sidebar width preference, edit-mode article style overrides.
  - `globalViewerListeners.js`: `beforeunload` and Ctrl/Cmd+S handling.
  - `createExplorerBridge.js`: bridge object passed into React explorer.
- `MarkdownViewerApp.destroy()` must stay idempotent and clean up app controllers, active renderer resources, article interactions, React root, listeners, object URLs, and DOM references.

## React Shell

- React owns viewer chrome only: shell, theme background, floating actions, Files/Outline panels, editor shell, document statistics, overlay scrollbars, scroll-to-top control, loading state, and toast.
- React must not reconcile rendered Markdown under `.mdp-markdown-body`; that subtree is owned by the render pipeline and plugin `afterRender` hooks.
- Preserve stable shell class names and hierarchy (`mdp-root`, `mdp-sidebar`, `mdp-markdown-body`) unless migrating SCSS and scroll math in the same change.
- Prefer shared chrome primitives in `src/viewer/react/components/common/` and `src/viewer/react/hooks/useDismissableLayer.js`.
- Keep document command definitions, grouping, and overflow order in `document-actions-model.js`; bind capability-driven handlers through `FloatingActions.jsx`. Measure the allocated command wrapper with `useDocumentActionsLayout.js`, excluding the Outline title and accounting for divider spacing, rather than measuring rendered commands.
- Files and Outline reuse `PanelToggleButton.jsx` and `ViewerScrollbar.jsx`; preserve accessible toggle/focus behavior, the shared scrollbar appearance setting, virtual-content measurement, and observer/interaction cleanup when panels collapse. Keep Files layout in `explorer.scss` and Outline composition in `RightRail.jsx`, `OutlinePanel.jsx`, `layout.scss`, and `toc.scss`. Consult the [Viewer contracts](../../docs/design-system/README.md#viewer) and [integration guide](../../docs/document-actions.md) before changing these boundaries.
- Dismiss/escape behavior must be Shadow DOM-safe and cleaned up from React effects.
- Prefer `src/shared/react/Skeleton.jsx` and `src/shared/styles/_skeleton.scss` for loading placeholders.

## Explorer

- Keep `useExplorer.js` as a React composition hook.
- Non-React explorer workflows belong in `src/viewer/explorer/` and should not import React.
- React-only explorer adapters belong under `src/viewer/react/hooks/explorer/`.
- Preserve the explorer bridge contract: `navigateToFile` and `virtualFileExists` are assigned by the hook and cleared on cleanup.
- Preserve workspace virtual-file behavior and `MDP_WS_FILE`; do not convert virtual workspace files into `file:` URLs.
- Sibling/workspace scans must support cancellation via `AbortController` on teardown, workspace switch/open, mode changes, and explicit progress cancellation.
