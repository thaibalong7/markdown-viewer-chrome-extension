# Viewer content UI ownership

This document describes the implemented boundary between React application controls and the document render pipeline. The shell and both sidebars retain their existing composition. The scoped coding contract lives in [Architecture boundaries](../.agents/rules/20-architecture-boundaries.md).

## Source map

| Responsibility | Source |
| --- | --- |
| Portal registration, batching, scope disposal and synchronous mount boundary | `src/viewer/react/content/mount-content-ui.jsx` |
| Color inspector / click-local feedback JSX | `src/viewer/react/content/colors/` |
| Color interaction, clipboard feedback lifecycle and positioning | `src/viewer/colors/color-popover-controller.js`, `color-copy-controller.js` |
| Code and Mermaid controls / copy presentation hook | `src/viewer/react/content/toolbars/` |
| Code discovery and empty toolbar slots | `src/plugins/core/code-highlight.plugin.js` |
| Mermaid control registration, export actions and menu geometry | `src/plugins/optional/mermaid-actions.js`, `mermaid-export.js` |
| Lightbox and resolution JSX | `src/viewer/react/content/media/` |
| Shared pan/zoom, native input listeners, raster-session lifecycle | `src/viewer/media/media-lightbox-controller.js` |
| Image and Mermaid entry adapters / source dimensions | `src/viewer/media/image-lightbox-controller.js`, `mermaid-lightbox-controller.js` |
| Pure density presets and bitmap limits | `src/viewer/media/resolution-model.js` |
| Resolution interaction and stale-request guards | `src/viewer/media/resolution-controller.js` |
| SVG reads, decoding, bitmap buffers and object URLs | `src/viewer/media/lightbox-raster.js` |
| Loading, skeleton, empty, error, Retry and Mermaid error/source JSX | `src/viewer/react/content/states/` |
| Shared tooltip bubble / DOM-anchor subscription adapter | `src/viewer/react/content/TooltipBubble.jsx`, `src/viewer/dom-tooltip.js` |
| Real DOM interaction, ownership and cleanup tests | `src/viewer/react/content/__tests__/` |

## DOM boundaries

React owns the shell and application controls. The document renderers own sanitized Markdown/Shiki/KaTeX markup, sanitized Mermaid SVG, plain/raw source and image resources. Plugins may apply small content decorations, including empty color swatches, heading anchors, table wrappers, disabled task checkboxes and trusted alert icons.

```text
#mdp-viewer-root
├── .mdp-react-root                       shell React root
│   └── .mdp-root                         themed shell / overlay target
│       ├── article.mdp-markdown-body     stable document host
│       │   └── .mdp-code-block           plugin-owned structural wrapper
│       │       ├── .mdp-code-block__meta  empty slot → React toolbar portal
│       │       └── pre > code            renderer-owned source/Shiki nodes
│       └── application overlays          React portals, outside article
└── .mdp-content-ui-host                  one shared content React root
```

The separate content root keeps imperative document rendering independent of shell reconciliation. All content registrations share it; a code block, swatch or tooltip never creates its own root. The registry retains unchanged React elements across commits, and independent slot registrations can be batched. React component state still updates through normal React scheduling.

A toolbar slot starts empty. After registration, its children belong exclusively to React until disposal. React never reconciles the sibling `pre` or chart SVG. A lightbox similarly declares an empty canvas host: the media controller owns its cloned image/sanitized SVG and the raster session may replace it with a decoded PNG. React owns the overlay, buttons, hints and resolution slot around that canvas. High-frequency gesture transforms update the canvas ref without document rerenders.

For a document state, the state adapter clears existing scoped portals, empties the target and transfers its children to React. This temporary ownership ends before a renderer inserts document content. Image loading uses an empty state slot beside the renderer-owned image. The article node itself stays stable.

## Registration and cleanup

`mountContentUi(target, Component, props, { scope })` returns an idempotent `update`/`destroy` handle. `target` identifies the exclusive slot or overlay parent; `scope` identifies the document or anchor that owns its lifetime. Out-of-article feedback must use the article as scope. `getContentOverlayTarget(anchor)` selects the themed shell, falling back to the viewer root for standalone hosts.

The mount adapter commits synchronously at imperative renderer/event boundaries, so refs exist when a controller measures/focuses a node and effect cleanup completes before DOM replacement. It must not be invoked during React rendering, ref callbacks or effects. React-owned state/effects handle component lifecycle work; browser side effects remain in services, controllers or focused hooks.

Render replacement aborts the old render, runs controller/plugin cleanup, closes image media, and calls `clearContentUi(article)` before any targets are removed. `renderIntoElement()` also clears scoped portals at the HTML insertion boundary; standalone renderers and Mermaid rendering clear their corresponding scope. Viewer destruction disposes renderers/media before `destroyContentUi()` unmounts the shared content root, then unmounts the shell. Removed registrations ignore stale update handles. Clipboard and raster operations additionally retain their own generation/connection guards.

Code and Mermaid copy presentation belongs to React. Their clipboard action uses the article clipboard service's inline result mode, so the service reports failures while components render successful button feedback. React code buttons carry a marker that excludes them from the legacy delegated copy path, preventing duplicate clipboard writes. Original source remains outside controls, and document export continues stripping toolbar/decorative nodes.

## Verification

The migration uses jsdom only as a development/test dependency. Tests exercise actual React portals and DOM events for hover/focus, clipboard success/failure and late completion, menu export/keyboard behavior, lightbox pan/zoom/focus, resolution limits/busy/error/reopening, and disposal before document replacement. Existing parsing, sanitization, file-type, raster-buffer/object-URL and export tests remain in their respective modules. Chrome extension integration and visual smoke checks complement these tests; jsdom does not emulate layout, image decoding, browser clipboard permissions or extension messaging.
