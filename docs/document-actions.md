# Viewer document actions

The right rail uses Direct icons beside the OUTLINE label, with On this page and the heading count on the row below. Visual dimensions and states live in the [Viewer design-system contracts](./design-system/README.md#viewer); this guide owns command composition and integration. This is a Viewer-local composition, not a global button or Files-header redesign. Runtime source is canonical; the planning demo is retained at the user's request for further design exploration.

## Ownership

| Concern | Source |
| --- | --- |
| Action definitions, visibility, group/order, prefix overflow, flat format expansion | [src/viewer/react/components/document-actions-model.js](../src/viewer/react/components/document-actions-model.js) |
| Capability resolution and existing service/controller callbacks | [src/viewer/react/components/FloatingActions.jsx](../src/viewer/react/components/FloatingActions.jsx) |
| Generic direct controls, dividers, overflow and focus migration | [src/viewer/react/components/DocumentActionToolbar.jsx](../src/viewer/react/components/DocumentActionToolbar.jsx) |
| Grouped menus, dismissal, visible return targets and viewport bounds | [src/viewer/react/components/DocumentActionsMenu.jsx](../src/viewer/react/components/DocumentActionsMenu.jsx) |
| Allocated width/height, pointer changes, ResizeObserver cleanup | [src/viewer/react/hooks/useDocumentActionsLayout.js](../src/viewer/react/hooks/useDocumentActionsLayout.js) |
| Watch state/popover and dirty-update confirmation | [src/viewer/react/components/WatchStatus.jsx](../src/viewer/react/components/WatchStatus.jsx) |
| Pinned comparison and lazy dialog, independent of toolbar layout | [src/viewer/react/components/ChangeReview.jsx](../src/viewer/react/components/ChangeReview.jsx) |
| Mirrored Outline composition, hide/restore, and scroll/focus return | [RightRail.jsx](../src/viewer/react/components/RightRail.jsx), [OutlinePanel.jsx](../src/viewer/react/components/OutlinePanel.jsx), [PanelToggleButton.jsx](../src/viewer/react/components/PanelToggleButton.jsx) |
| Files composition and shared scrollbar inputs | [Sidebar.jsx](../src/viewer/react/components/Sidebar.jsx), [FilesPanel.jsx](../src/viewer/react/components/FilesPanel.jsx), [explorer/ExplorerPanel.jsx](../src/viewer/react/components/explorer/ExplorerPanel.jsx) |
| Overlay measurement, visibility, pointer/keyboard behavior, and cleanup | [ViewerScrollbar.jsx](../src/viewer/react/components/ViewerScrollbar.jsx) |
| Geometry, responsive composition and semantic colors | [_floating-actions.scss](../src/viewer/styles/_floating-actions.scss), [layout.scss](../src/viewer/styles/layout.scss), [toc.scss](../src/viewer/styles/toc.scss), [explorer.scss](../src/viewer/styles/explorer.scss), [_viewer-scrollbar.scss](../src/viewer/styles/_viewer-scrollbar.scss), [_variables.scss](../src/viewer/styles/_variables.scss), [_editor.scss](../src/viewer/styles/_editor.scss) |

## Stable grouping

Quick access contains Updates then Theme. Document contains View changes when a reviewable comparison exists, followed by Edit (or Save, Done and Focus while editing), applicable source/rendered controls, then Copy. Output contains Print and Export, supported only in read mode. View changes also remains available for existing accepted-history comparisons; the redesign does not remove that capability just because no revision is pending.

The catalog filters unsupported commands before measuring. Temporarily disabled controls retain their place. Virtual workspace Copy remains disabled with an explanation; custom themes do not receive a fake light/dark toggle. Editor feature gates, file connection, dirty exit confirmation, save conflict checks and protected disk application remain owned by existing flows.

Updates, Theme and View changes are pinned when available. The generic partitioner preserves a prefix of the ordered list, reserving a More target and counting group dividers. The remaining suffix appears in More in the same order. Export uses one direct trigger; overflow expands its format choices into flat menu items. Nothing wraps or shrinks below the pointer target size.

Horizontal and vertical layouts use the same partitioner. The observer measures the action row's allocated dimensions rather than the current commands, avoiding shrink/expand feedback loops. The 60px rail keeps 44px touch controls; the dock has a bounded viewport-relative width. Extremely small available bounds cannot fit an arbitrary number of pinned controls: new pinned actions require a deliberate layout/product decision, not an automatic flag.

## Sidebar integration

Follow the [sidebar composition](./design-system/README.md#sidebar-composition), [Porcelain panel-toggle](./design-system/README.md#panel-toggles), and [sidebar-scrolling](./design-system/README.md#sidebar-scrolling) contracts. Files keeps its existing UI structure; alignment changes only its spacing. Outline uses a dedicated command wrapper beside the title, then its own summary row. Shared PanelHeader, Popup, and Settings keep their current contracts. Existing Theme/Edit/navigation and Save/Copy colors are preserved through semantic theme tokens in both direct and detail controls.

`useDocumentActionsLayout` observes the allocated command wrapper, excluding the title, and reads the actual control/divider spacing from CSS. Expanded rows use width; collapsed rails use height. The collapsed rail aligns its first action with the Show/Hide toggle independently of expanded panel width or the adjacent Files state. Keep menus/dialogs mounted independently of responsive trigger placement and preserve list scroll/focus restoration.

Both lists mount the same ViewerScrollbar with `variant="sidebar"`, the existing visibility preference, and their virtual-content selector/version. The overlay portals to `.mdp-root`; observing virtual content handles loading, scans, and folder expansion without requiring the viewport itself to resize. Collapsed lists remove the scrollbar and its listeners/observers. The standalone HTML reference uses a native-scrollbar simulation, while runtime integration and lifecycle behavior are exercised by component tests.

## Add a standard action

1. Add one descriptor in createDocumentActions: stable id, group, order, visible condition, label, icon and onClick. Optional fields include tooltip, disabled, busy, pressed, className, and buttonRef. Keep explicit order gaps for future commands. Do not reorder from usage history.
2. Bind its handler through FloatingActions; put I/O in the appropriate action service/controller, not the catalog or toolbar. A button that opens a dialog can supply buttonRef; overflow assigns a visible menu trigger as the return target before invoking it.
3. Add focused catalog/capability/handler tests. No toolbar branch, separate overflow list, breakpoint table or selector is needed for a standard icon action. Current group definitions determine menu labels and divider placement automatically.

Example descriptor:

```js
{ id: 'document-info', group: 'document', order: 60,
  visible: c.hasDocumentInfo, label: 'Document information', icon: 'info',
  disabled: c.isLoading, onClick: c.onDocumentInfoClick }
```

An action with format/choice items uses items; child ids, labels, icons and callbacks are reused for its direct menu and flattened overflow. Custom control entries are exceptional stateful owners (currently Watch and Review), not an alternative standard-button path. They are pinned and own their own popover/dialog semantics. Keep stateful dialogs mounted independently of responsive trigger placement, as ChangeReview.renderTrigger does; do not rebuild or duplicate a pinned comparison inside More.

## Focus and interaction

The direct row is a group of native buttons with natural Tab order, not a partially implemented roving-focus toolbar. Menus link triggers with aria-controls, support arrows/Home/End/Escape, and let native Tab continue from the trigger. Toggle menu items use menuitemcheckbox/aria-checked. Activating an overflow action closes its menu and establishes a visible return target before opening dialogs; the shared menu does not steal that dialog's focus back.

Resize/orientation changes close menus and the Watch popover, keep menu focus on a surviving trigger, and migrate lost command focus to More or a surviving control. Menu positioning is relative to its wrapper but clamped in viewport coordinates, including under backdrop-filter surfaces; low-height menus scroll. Watch also dismisses when keyboard focus leaves its status layer, so keyboard activation of another action does not leave competing popovers open. Native modal and editor protections are unchanged.

## Verification

Catalog tests exercise priority, capability visibility, busy/disabled state, flat format expansion, width/height budgets, and adding a command without presentation changes. Composition tests cover group/divider markup and touch overflow; hook tests cover geometry and observer cleanup; shared menu tests cover keyboard and dialog focus behavior. Run `npm test` and `npm run build` after runtime changes. Sidebar lifecycle tests cover virtual-content measurement and collapse cleanup. Check the unpacked extension for:

- Mirrored first/second rows, stable Files details/tree composition, loading/count text, long labels, and independently resized panels.
- Porcelain toggles on both sides, expanded and collapsed: outer borders, mirrored chevrons/dots, keyboard focus/return, Light/Dark/custom themes, touch targets, and reduced motion.
- Command overflow excluding the title, touch panels at and around 280px, vertical collapsed budgets, and existing mobile/editor layouts including a 320px viewport.
- Sidebar auto-hide/always-visible behavior, drag/track/keyboard interaction, long/short lists, scans, folder expansion/collapse, heading loading, and hide/restore without stale interactive overlays.
- Pending/history review, capability-specific commands, dirty/saving sessions, and dialog focus after overflow or resize.
