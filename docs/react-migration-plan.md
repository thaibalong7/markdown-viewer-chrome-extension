# React Migration Plan — Viewer Chrome UI

> **Scope:** Migrate toolbar, sidebar (tabs, TOC, Files explorer), settings drawer, and toast/tooltip to React components.
> **Out of scope:** Article HTML render pipeline (`renderDocument` → `sanitizeHtml` → `renderIntoElement`) stays as-is — vanilla markdown-it → DOMPurify → innerHTML.

---

## 0. Trả lời câu hỏi: Incremental hay Big Bang?

**Khuyến nghị rõ ràng: Incremental (từ từ, phase-by-phase).**

Lý do:

1. **Shadow DOM complexity** — Viewer chạy bên trong Shadow DOM của content script. Một lần thay đổi lớn sẽ rất khó debug khi React root, event delegation, và imperative code cùng chạy trong shadow boundary.

2. **Article render pipeline phải giữ nguyên** — `renderDocument()` → `sanitizeHtml()` → `renderIntoElement()` + plugin `afterRender` DOM passes (Shiki, Mermaid actions, code-block copy buttons) thao tác trực tiếp trên `article.innerHTML`. React không nên quản lý cây DOM này. Migrate incremental cho phép giữ ranh giới này clean.

3. **Explorer cực kỳ phức tạp** — `explorer-controller.js` + `explorer-panel.js` + `explorer-tree-renderer.js` + workspace-picker + folder-scanner = ~2000+ dòng code imperative với I/O phức tạp (FETCH_FILE_AS_TEXT, AbortController, sessionStorage, virtual file readers). Migrate cả cục này cùng toolbar/TOC là recipe for disaster.

4. **Testability** — Mỗi phase tạo ra một version chạy được. Nếu phase N break, chỉ cần rollback phase N, không phải toàn bộ.

5. **CSS contract ổn định** — Tất cả SCSS dùng class names (`mdp-root`, `mdp-toolbar`, `mdp-sidebar`, v.v.). Migrate incremental = giữ nguyên class names = SCSS không cần sửa.

6. **Team velocity** — Mỗi phase có scope nhỏ, review dễ, merge conflicts ít.

**Chiến lược cốt lõi: "React Shell wrapping Imperative Islands"**

- Bắt đầu bằng việc mount React root vào Shadow DOM
- React quản lý shell layout (toolbar, sidebar frame, tabs)
- Các vùng imperative (article render, explorer panel) được mount vào React refs
- Dần dần chuyển từng "island" sang React component thuần

---

## 1. Hiện trạng kiến trúc (As-Is)

### Viewer entry flow
```
content/index.js → bootstrap.js → MarkdownViewerApp.init()
  → createShell() → imperative DOM tree
  → createSidebarResize() → pointer events trên resize handle
  → createArticleInteractions() → delegated click trên article
  → createExplorerController() → tab switching + Files panel
  → createToolbarDocumentActions() → print/export buttons
  → renderDocument() → article.innerHTML = sanitizedHtml
  → rebuildToc() → nav.mdp-toc innerHTML
```

### DOM tree (viewer-shell.js)
```
div.mdp-root
├── div.mdp-toolbar
│   ├── div.mdp-toolbar__title ("Markdown Plus")
│   └── div.mdp-toolbar__actions
│       └── div.mdp-toolbar-doc-actions (print + export buttons)
├── div.mdp-body
│   ├── aside.mdp-sidebar
│   │   ├── div.mdp-sidebar-tabs[role=tablist]
│   │   │   ├── button#mdp-tab-outline[role=tab]
│   │   │   └── button#mdp-tab-files[role=tab]
│   │   ├── div#mdp-panel-outline.mdp-sidebar-panel--outline[role=tabpanel]
│   │   │   ├── div.mdp-sidebar__title ("Outline")
│   │   │   └── nav.mdp-toc (TOC injected by rebuildToc)
│   │   ├── div#mdp-panel-files.mdp-sidebar-panel--files[role=tabpanel]
│   │   │   └── div.mdp-explorer-container (imperative explorer)
│   │   └── div.mdp-sidebar__resize-handle[role=separator]
│   └── main.mdp-content-pane
│       └── article.mdp-markdown-body (innerHTML from render pipeline)
└── div.mdp-toast (lazy, injected by toast.js)
```

### Modules that own DOM
| Module | What it creates/mutates |
|--------|------------------------|
| `viewer-shell.js` | Entire shell structure |
| `toolbar-actions.js` | Print/export buttons in toolbar |
| `sidebar-resize.js` | CSS var mutation + pointer events |
| `article-interactions.js` | Event delegation on article |
| `explorer-controller.js` | Tab switching logic |
| `explorer-panel.js` | Full explorer DOM tree |
| `explorer-tree-renderer.js` | File/folder row DOM nodes |
| `rebuild-toc.js` | TOC list inside `nav.mdp-toc` |
| `toast.js` | Toast overlay element |
| `tooltip.js` | Tooltip portal element |
| `icons.js` | SVG elements (copy/print/export) |
| `app.js` | Style injection, theme vars, lifecycle |

---

## 2. Target Architecture (To-Be)

```
content/index.js → bootstrap.js → mountViewerReact()
  → React.createRoot(shadowRoot) → <ViewerApp>
    → <ViewerShell>
      → <Toolbar />           ← React component
      → <SidebarFrame>        ← React component
        → <SidebarTabs />     ← React component
        → <OutlinePanel />    ← React component (wraps TOC)
        → <FilesPanel />      ← React (or hybrid ref bridge)
        → <ResizeHandle />    ← React component
      → <ContentPane>         ← React wrapper, article = ref
        → <article ref>       ← innerHTML managed by renderDocument (NOT React)
    → Context: SettingsContext, ViewerStateContext
    → renderDocument() still runs outside React, sets article.innerHTML
    → plugin afterRender still runs imperatively on article DOM
```

### Key boundaries
- **React manages:** Shell layout, toolbar actions, sidebar tabs, TOC rendering, toast, tooltip, settings drawer (future), explorer (later phases)
- **Imperative stays:** `renderDocument()`, `sanitizeHtml()`, `renderIntoElement()`, plugin `afterRender` passes, `article-interactions.js` (event delegation on article), Mermaid export actions, Shiki highlighting

### React in Shadow DOM
- `React.createRoot()` receives the Shadow DOM container
- Styles injected as `<style>` elements into shadow root (same as today)
- Event delegation works within shadow boundary (React 19 handles this)
- Tooltip/toast portals render inside shadow root (not `document.body`)

---

## 3. Prerequisites (Phase 0-R: React Infrastructure)

### Status
- **Done** (2026-04-14)
- Completed scope:
  - Added `@vitejs/plugin-react` and wired `react()` in `vite.config.mjs`
  - Added React viewer foundation under `src/viewer/react/` (`ViewerApp`, `mount`, contexts, `useImperativeBridge`)
  - Added Shadow DOM smoke-test wiring in `src/content/bootstrap.js`
  - Verified build with `nvm use 20 && npm run build`

### Goals
- Add `@vitejs/plugin-react` to Vite config (required for JSX in content script)
- Verify React renders inside Shadow DOM correctly
- Establish shared patterns: context, hooks, ref bridges

### Actions

| # | Action | Files |
|---|--------|-------|
| 0.1 | Install `@vitejs/plugin-react` | `package.json`, `vite.config.mjs` |
| 0.2 | Update `vite.config.mjs`: add `react()` plugin | `vite.config.mjs` |
| 0.3 | Create `src/viewer/react/ViewerApp.jsx` — minimal React root that renders a `<div className="mdp-root">` placeholder | new file |
| 0.4 | Create `src/viewer/react/mount.js` — `mountViewerReact(shadowRoot, { styles })` that calls `createRoot` on the shadow container and renders `<ViewerApp>` | new file |
| 0.5 | Create `src/viewer/react/contexts/SettingsContext.jsx` — React context for viewer settings (value from `bootstrap.js` + `SETTINGS_UPDATED` listener) | new file |
| 0.6 | Create `src/viewer/react/contexts/ViewerStateContext.jsx` — React context for runtime state: markdown, currentFileUrl, sidebarTab, tocVisible, etc. | new file |
| 0.7 | Create `src/viewer/react/hooks/useImperativeBridge.js` — custom hook pattern for mounting imperative code into a React ref (used in later phases) | new file |
| 0.8 | Smoke test: temporarily wire `mountViewerReact` in `bootstrap.js` behind a feature flag or dev-only branch to verify React renders inside Shadow DOM | `src/content/bootstrap.js` (temporary) |
| 0.9 | Verify build: `npm run build` produces valid extension, no runtime errors | — |

### Decisions to lock
- **JSX file extension:** `.jsx` (matches existing popup pattern)
- **State management:** React Context + `useReducer` (no external lib — keeps bundle small)
- **Styling:** Keep existing SCSS; React components use same `className` strings
- **Portal root:** Shadow DOM container element (not `document.body`)

### Deliverable
- React can render inside Shadow DOM
- Contexts exist and can provide settings/state
- Build works, extension loads

---

## 4. Phase 1-R: React Shell + Toolbar

### Status
- **Done** (2026-04-14)
- Completed scope:
  - Replaced imperative shell mount with React shell mount (`ViewerShell` + `partsPromise` bridge)
  - Migrated toolbar print/export actions to React (`ToolbarActions` + React icon components)
  - Removed legacy shell/toolbar modules (`viewer-shell.js`, `toolbar-actions.js`) after integration validation

### Goals
- Replace `createShell()` with a React component tree that produces the **same DOM structure and class names**
- Migrate toolbar (title + actions area) to React
- Keep sidebar and article as "imperative slots" via refs

### Actions

| # | Action | Files |
|---|--------|-------|
| 1.1 | Create `src/viewer/react/components/ViewerShell.jsx` — renders `div.mdp-root > div.mdp-toolbar + div.mdp-body > aside.mdp-sidebar + main.mdp-content-pane > article.mdp-markdown-body`. Sidebar contents and article are **ref-based slots** | new file |
| 1.2 | Create `src/viewer/react/components/Toolbar.jsx` — `div.mdp-toolbar > div.mdp-toolbar__title + div.mdp-toolbar__actions`. Actions area exposed as ref for imperative mounting | new file |
| 1.3 | Create `src/viewer/react/components/ToolbarActions.jsx` — React version of print/export buttons (replaces `toolbar-actions.js`). Uses `icons.js` SVGs converted to React components or inline JSX | new file |
| 1.4 | Convert SVG icon factories in `icons.js` to React components: `<CopyIcon>`, `<PrintIcon>`, `<ExportIcon>` in `src/viewer/react/components/icons/` | new files |
| 1.5 | Update `ViewerApp.jsx` to render `<ViewerShell>` and expose refs for `article`, `tocContainer`, `explorerContainer`, `resizeHandle`, `sidebarPanels` | `ViewerApp.jsx` |
| 1.6 | Wire `MarkdownViewerApp.init()` to use React mount instead of `createShell()`. The `parts` object is populated from React refs via a callback/ref pattern | `app.js` or new adapter |
| 1.7 | Ensure `applyReaderStyles()` (CSS var injection on root) still works — either via ref to root element or a `useEffect` that applies vars | adapter layer |
| 1.8 | Verify all imperative sub-controllers (`createSidebarResize`, `createArticleInteractions`, `createExplorerController`) still receive valid DOM elements from React refs | integration test |
| 1.9 | Delete `viewer-shell.js` (replaced by React components) | delete file |
| 1.10 | Delete `toolbar-actions.js` (replaced by `ToolbarActions.jsx`) | delete file |

### CSS impact
- **None.** Same class names, same DOM hierarchy. SCSS selectors unchanged.

### Risk mitigation
- If React refs are not populated before `init()` needs them: use a `useLayoutEffect` + callback pattern to signal "shell ready" before proceeding with imperative wiring.
- Keep `createShell()` around (renamed `createShell_legacy.js`) until phase is validated, then delete.

### Deliverable
- Viewer shell is React-rendered
- Toolbar with print/export is a React component
- All existing features still work (TOC, explorer, article render, settings updates)

---

## 5. Phase 2-R: Sidebar Tabs + TOC Panel

### Goals
- Migrate sidebar tab switching to React state
- Migrate TOC rendering to a React component
- Migrate resize handle to a React component with hook-based pointer tracking

### Actions

| # | Action | Files |
|---|--------|-------|
| 2.1 | Create `src/viewer/react/components/Sidebar.jsx` — renders `aside.mdp-sidebar` with tab bar, panels, resize handle | new file |
| 2.2 | Create `src/viewer/react/components/SidebarTabs.jsx` — tab buttons with `aria-*`, active state managed by ViewerStateContext | new file |
| 2.3 | Create `src/viewer/react/components/OutlinePanel.jsx` — renders `div.mdp-sidebar-panel--outline > div.mdp-sidebar__title + nav.mdp-toc`. TOC list rendered from heading data in context | new file |
| 2.4 | Create `src/viewer/react/hooks/useToc.js` — hook that extracts headings from article DOM (post-render), returns TOC data array. Replaces `toc-builder.js` data extraction | new file |
| 2.5 | Create `src/viewer/react/hooks/useScrollSpy.js` — hook wrapping `scroll-spy.js` logic with `IntersectionObserver` or scroll listener. Returns `activeHeadingId` | new file |
| 2.6 | Create `src/viewer/react/components/ResizeHandle.jsx` — renders `div.mdp-sidebar__resize-handle` with pointer event hooks for drag. Replaces `sidebar-resize.js` | new file |
| 2.7 | Create `src/viewer/react/hooks/useSidebarResize.js` — hook encapsulating resize pointer tracking, CSS var mutation, sessionStorage persistence | new file |
| 2.8 | Move sidebar tab persistence (`explorer-state.js` active tab) into ViewerStateContext | context update |
| 2.9 | Update `ViewerApp.jsx` to compose `<Sidebar>` instead of passing sidebar refs to imperative code | `ViewerApp.jsx` |
| 2.10 | Files panel remains a ref slot for now — `<FilesPanel>` just renders `div.mdp-sidebar-panel--files > div.mdp-explorer-container` with a ref for `createExplorerController` | new file (thin wrapper) |
| 2.11 | Remove tab-switching logic from `explorer-controller.js` (React now owns it). Explorer controller only manages Files content | `explorer-controller.js` |
| 2.12 | Delete `sidebar-resize.js` (replaced by hook + component) | delete file |
| 2.13 | Refactor `rebuild-toc.js` — either delete (if `useToc` + `OutlinePanel` fully replace it) or keep as a thin adapter | delete or refactor |

### CSS impact
- **None.** Same class names. `is-active` on tabs managed by React className logic.

### Deliverable
- Sidebar tabs switch via React state
- TOC is a React component with scroll spy
- Resize handle is a React component
- Explorer panel is still imperative (mounted into React ref)

---

## 6. Phase 3-R: Toast + Tooltip → React

### Goals
- Replace imperative toast/tooltip with React components
- Establish portal pattern inside Shadow DOM

### Actions

| # | Action | Files |
|---|--------|-------|
| 3.1 | Create `src/viewer/react/components/Toast.jsx` — renders `div.mdp-toast` inside a React portal (portal target = shadow root or `.mdp-root`). Auto-dismiss with `useEffect` timer | new file |
| 3.2 | Create `src/viewer/react/hooks/useToast.js` — hook that provides `showToast(message, durationMs?)` and manages toast queue/state | new file |
| 3.3 | Create `src/viewer/react/components/Tooltip.jsx` — viewer-specific tooltip (position calculation, show delay). Renders via portal inside shadow root. Reuse logic pattern from `src/popup/components/Tooltip.jsx` | new file |
| 3.4 | Expose toast via ViewerStateContext or a dedicated ToastContext so any component can trigger a toast | context update |
| 3.5 | Update `article-interactions.js` to call React toast (via a bridge callback) instead of imperative `showViewerToast` | `article-interactions.js` |
| 3.6 | Update `ToolbarActions.jsx` to use React `<Tooltip>` | `ToolbarActions.jsx` |
| 3.7 | Update `ResizeHandle.jsx` to use React `<Tooltip>` | `ResizeHandle.jsx` |
| 3.8 | Delete `toast.js` and `tooltip.js` | delete files |

### Shadow DOM portal pattern
```jsx
// Inside ViewerApp or a PortalProvider
const portalRoot = shadowRoot.host?.shadowRoot ?? shadowRoot
return createPortal(<Toast />, portalRoot)
```

### Deliverable
- Toast and Tooltip are React components
- All tooltip/toast consumers updated
- No imperative toast/tooltip code remains

---

## 7. Phase 4-R: Settings Drawer (In-Viewer)

### Goals
- Add an in-viewer settings drawer (slide-from-right panel)
- Reuse popup panel components or create viewer-specific variants
- Wire settings changes to `SAVE_SETTINGS` messaging

### Actions

| # | Action | Files |
|---|--------|-------|
| 4.1 | Create `src/viewer/react/components/SettingsDrawer.jsx` — slide-in panel with overlay, close button, sections | new file |
| 4.2 | Create `src/viewer/react/hooks/useViewerSettings.js` — hook that loads settings from SettingsContext, provides `patchSettings(path, value)` which calls `SAVE_SETTINGS` via `sendMessage()` | new file |
| 4.3 | Reuse or adapt popup panel components (`GeneralPanel`, `ReaderPanel`, `PluginsPanel`) for the drawer. Consider extracting shared panel components to `src/shared/react/panels/` or importing from `src/popup/panels/` directly | shared panels |
| 4.4 | Add Settings gear button to `Toolbar.jsx` — toggles drawer open/closed | `Toolbar.jsx` |
| 4.5 | Wire `SETTINGS_UPDATED` broadcast → update SettingsContext → React re-renders affected components | context + listener |
| 4.6 | Ensure `needsFullRender()` logic still triggers article re-render when needed (settings drawer changes → context update → `MarkdownViewerApp.updateSettings()` or equivalent) | integration |
| 4.7 | Add drawer open/close animation (CSS transition on transform, matches existing SCSS patterns) | `src/viewer/styles/settings.scss` (new) |

### Deliverable
- Users can open a settings drawer directly in the viewer
- Settings changes persist and sync back to background
- Popup settings still work and sync bidirectionally

---

## 8. Phase 5-R: Explorer Panel → React

### Goals
- Migrate the Files explorer from imperative DOM to React components
- This is the largest and most complex phase

### Actions

| # | Action | Files |
|---|--------|-------|
| 5.1 | Create `src/viewer/react/components/explorer/ExplorerPanel.jsx` — main explorer container with header, context strip, action buttons, body area | new file |
| 5.2 | Create `src/viewer/react/components/explorer/ExplorerHeader.jsx` — heading, mode badge, back button, path breadcrumb, depth notice | new file |
| 5.3 | Create `src/viewer/react/components/explorer/FileList.jsx` — flat list of sibling `.md` files | new file |
| 5.4 | Create `src/viewer/react/components/explorer/FileTree.jsx` — recursive folder tree with expand/collapse | new file |
| 5.5 | Create `src/viewer/react/components/explorer/FileRow.jsx` — single file row (click to navigate) | new file |
| 5.6 | Create `src/viewer/react/components/explorer/FolderRow.jsx` — folder row with chevron, expand/collapse | new file |
| 5.7 | Create `src/viewer/react/hooks/useExplorer.js` — hook managing explorer state: mode (sibling/workspace), file list, tree data, active file, loading/progress, abort | new file |
| 5.8 | Create `src/viewer/react/hooks/useFolderScanner.js` — hook wrapping `folder-scanner.js` with React-friendly state (progress, cancel, results) | new file |
| 5.9 | Create `src/viewer/react/hooks/useWorkspacePicker.js` — hook wrapping `workspace-picker.js` directory picker flow | new file |
| 5.10 | Create `src/viewer/react/components/explorer/ExplorerProgress.jsx` — progress bar with cancel button | new file |
| 5.11 | Keep pure utility modules unchanged: `url-utils.js`, `sibling-scanner.js`, `folder-scanner.js`, `workspace-picker.js`, `gitignore-matcher.js`, `explorer-files-context.js` — these have no DOM and can be called from hooks | unchanged |
| 5.12 | Wire explorer navigation (file click → fetch → re-render markdown) through context/callbacks | integration |
| 5.13 | Delete `explorer-panel.js`, `explorer-tree-renderer.js`, tab-switching parts of `explorer-controller.js` | delete/refactor |
| 5.14 | Refactor `explorer-controller.js` into a non-DOM "explorer service" that hooks consume for I/O (FETCH_FILE_AS_TEXT, scan logic) | refactor |

### CSS impact
- **Minimal.** Keep all `mdp-explorer*` class names. SCSS selectors unchanged.

### Complexity notes
- Explorer has real I/O (fetch directory listings, abort controllers, virtual file readers)
- Session storage persistence (workspace root, mode) needs to be managed in hook state
- Progress UI with cancel needs careful state management
- This phase can be further split into sub-phases if needed:
  - 5a: Sibling file list (simple)
  - 5b: Workspace tree (complex)
  - 5c: Workspace picker + progress

### Deliverable
- Explorer is fully React
- All explorer features work: sibling list, workspace tree, folder picker, progress, cancel, back navigation, session restore

---

## 9. Phase 6-R: Article Interactions Bridge + Cleanup

### Goals
- Clean integration between React components and imperative article interactions
- Final cleanup of legacy imperative code

### Actions

| # | Action | Files |
|---|--------|-------|
| 6.1 | Evaluate whether `article-interactions.js` should become a React hook (`useArticleInteractions`) or remain imperative with a clean bridge. **Recommended: keep imperative** because it operates on post-render innerHTML that React doesn't own | decision |
| 6.2 | Create a clean bridge interface: `articleInteractionsRef` in ViewerApp that imperative code writes to, React components read from (e.g., toast triggers, hash scroll requests) | `ViewerApp.jsx` |
| 6.3 | Ensure `destroy()` lifecycle is handled: React `useEffect` cleanup calls imperative `destroy()` methods for article interactions, scroll spy | lifecycle |
| 6.4 | Remove `parts` object pattern from `app.js` — React refs replace all DOM element references | `app.js` refactor |
| 6.5 | Final audit: no orphan event listeners, no DOM leaks, all `destroy()` paths validated | audit |
| 6.6 | Update `project-overview-for-ai.md` to reflect new React architecture | `docs/project-overview-for-ai.md` |
| 6.7 | Update cursor rules (`80-viewer-ui-lifecycle.mdc`) for React lifecycle patterns | `.cursor/rules/` |

### Deliverable
- Clean boundary: React owns UI shell, imperative owns article render + interactions
- No legacy DOM creation code remains (except for article pipeline)
- Documentation updated

---

## 10. Tổng kết File Changes

### New files (across all phases)
```
src/viewer/react/
├── mount.js
├── ViewerApp.jsx
├── contexts/
│   ├── SettingsContext.jsx
│   └── ViewerStateContext.jsx
├── hooks/
│   ├── useImperativeBridge.js
│   ├── useToc.js
│   ├── useScrollSpy.js
│   ├── useSidebarResize.js
│   ├── useToast.js
│   ├── useViewerSettings.js
│   ├── useExplorer.js
│   ├── useFolderScanner.js
│   └── useWorkspacePicker.js
├── components/
│   ├── ViewerShell.jsx
│   ├── Toolbar.jsx
│   ├── ToolbarActions.jsx
│   ├── Sidebar.jsx
│   ├── SidebarTabs.jsx
│   ├── OutlinePanel.jsx
│   ├── FilesPanel.jsx
│   ├── ResizeHandle.jsx
│   ├── Toast.jsx
│   ├── Tooltip.jsx
│   ├── SettingsDrawer.jsx
│   ├── icons/
│   │   ├── CopyIcon.jsx
│   │   ├── PrintIcon.jsx
│   │   └── ExportIcon.jsx
│   └── explorer/
│       ├── ExplorerPanel.jsx
│       ├── ExplorerHeader.jsx
│       ├── ExplorerProgress.jsx
│       ├── FileList.jsx
│       ├── FileTree.jsx
│       ├── FileRow.jsx
│       └── FolderRow.jsx
```

### Deleted files (after all phases complete)
```
src/viewer/shell/viewer-shell.js        → Phase 1-R
src/viewer/actions/toolbar-actions.js   → Phase 1-R
src/viewer/sidebar-resize.js            → Phase 2-R
src/viewer/actions/rebuild-toc.js       → Phase 2-R
src/viewer/toast.js                     → Phase 3-R
src/viewer/tooltip.js                   → Phase 3-R
src/viewer/explorer/explorer-panel.js   → Phase 5-R
src/viewer/explorer/explorer-tree-renderer.js → Phase 5-R
```

### Refactored files (kept but modified)
```
src/viewer/app.js                       → Major refactor (React orchestration)
src/viewer/explorer/explorer-controller.js → Becomes headless service
src/viewer/article-interactions.js      → Bridge to React toast/state
src/viewer/icons.js                     → May keep for non-React SVG needs or delete
src/content/bootstrap.js                → Wire React mount
vite.config.mjs                         → Add @vitejs/plugin-react
package.json                            → Add @vitejs/plugin-react devDep
```

### Unchanged files (pure logic, no DOM)
```
src/viewer/core/renderer.js
src/viewer/core/markdown-engine.js
src/viewer/core/toc-builder.js          (data extraction reused by useToc hook)
src/viewer/core/scroll-spy.js           (logic reused by useScrollSpy hook)
src/viewer/core/shiki-config.js
src/viewer/core/shiki-highlighter.js
src/viewer/scroll-utils.js
src/viewer/toolbar-metrics.js
src/viewer/explorer/url-utils.js
src/viewer/explorer/sibling-scanner.js
src/viewer/explorer/folder-scanner.js
src/viewer/explorer/workspace-picker.js
src/viewer/explorer/gitignore-matcher.js
src/viewer/explorer/explorer-files-context.js
src/viewer/explorer/explorer-state.js
src/shared/**
src/plugins/**
src/settings/**
src/theme/**
src/messaging/**
src/background/**
src/content/page-detector.js
src/content/raw-content-extractor.js
src/content/page-overrider.js
src/content/text-sampling.js
```

---

## 11. Phase Execution Order & Dependencies

```
Phase 0-R: React Infrastructure (Done)
    ↓
Phase 1-R: Shell + Toolbar
    ↓
Phase 2-R: Sidebar Tabs + TOC + Resize
    ↓
Phase 3-R: Toast + Tooltip
    ↓
Phase 4-R: Settings Drawer (in-viewer)
    ↓
Phase 5-R: Explorer Panel
    ↓
Phase 6-R: Cleanup + Docs
```

**Mỗi phase phải pass toàn bộ manual test trước khi bắt đầu phase tiếp theo:**
- Extension loads without errors
- Markdown file renders correctly
- TOC navigation works
- Files explorer works (sibling + workspace)
- Settings from popup sync to viewer
- Print/export functions
- Theme switching works
- Sidebar resize works

---

## 12. Build & Bundle Considerations

### Vite + React + Content Script
- `@vitejs/plugin-react` cần được thêm. Popup đã dùng React nhưng config hiện tại không có plugin-react (có thể popup build bằng classic JSX transform hoặc `@crxjs/vite-plugin` tự handle).
- Content script bundle sẽ bao gồm React runtime. Cần kiểm tra bundle size impact.
- React 19 đã có trong `dependencies`. `@vitejs/plugin-react` chỉ cần ở `devDependencies`.

### Shadow DOM specifics
- `createRoot()` nhận container element bên trong Shadow DOM.
- React 19 event delegation hoạt động trong Shadow DOM (events bubble within shadow boundary).
- Portals (toast, tooltip) phải target shadow root, không phải `document.body`.
- CSS-in-JS không cần thiết — SCSS compiled styles vẫn inject qua `<style>` elements.

### Bundle size estimate
- React + ReactDOM đã có trong bundle (popup dùng). Content script sẽ share cùng chunks nếu Vite tree-shakes đúng.
- Thêm JSX components cho viewer chrome ≈ 5-15KB gzipped (estimate, phụ thuộc vào complexity).
- Không thêm external state management lib (dùng Context + useReducer).

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| React root mount timing vs imperative init | Medium | High | `useLayoutEffect` + callback signaling "ready" before imperative code runs |
| Shadow DOM event bubbling issues | Low | Medium | React 19 handles this; test early in Phase 0-R |
| CSS specificity conflicts | Low | Low | Same class names, same SCSS — no change |
| Bundle size increase | Low | Medium | Monitor with `npm run build` size reports |
| Explorer migration breaks file navigation | Medium | High | Phase 5-R can be sub-divided; extensive testing |
| Settings sync race conditions | Low | Medium | Settings always flows through `sendMessage()` → background → broadcast |
| Performance regression (React reconciliation overhead) | Low | Low | Shell is static; only TOC and explorer have dynamic lists |

---

## 14. Migration Checklist per Phase

Cho mỗi phase, trước khi merge:

- [ ] `npm run build` succeeds
- [ ] Extension loads in Chrome without console errors
- [ ] Open a local `.md` file → viewer renders correctly
- [ ] TOC shows, click-to-scroll works, scroll spy highlights
- [ ] Sidebar tabs switch between Outline and Files
- [ ] Files explorer: sibling list loads
- [ ] Files explorer: workspace mode (open folder) works
- [ ] Sidebar resize (drag + keyboard arrows) works
- [ ] Print button works
- [ ] Export HTML/Word works
- [ ] Popup settings changes sync to viewer
- [ ] Theme switching (light/dark) works
- [ ] Code blocks have language label + copy button
- [ ] Mermaid charts render (if enabled)
- [ ] No memory leaks: open/close multiple files, check devtools
