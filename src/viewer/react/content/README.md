# Content UI

This directory contains React application UI displayed around or inside rendered documents. Start with [Viewer content UI ownership](../../../../docs/viewer-content-ui.md) for the source map and lifecycle contract.

- `colors/`: declarative inspector and source-copy feedback.
- `toolbars/`: code/Mermaid controls and the copy-presentation hook.
- `media/`: lightbox and resolution views; no file reads, rasterization or gesture geometry.
- `states/`: document loading, empty/error/skeleton and Mermaid error views.
- `mount-content-ui.jsx`: the sole imperative portal/root adapter. Controllers register exclusive empty slots here; no roots are created per control.
- `__tests__/`: real-DOM interaction and ownership tests, plus a small DOM/event helper that simulates only geometry and browser-only resources.

Document HTML, source text, Shiki spans and chart SVG stay outside React reconciliation. The only imperative media child region is the empty lightbox canvas declared by `MediaLightbox`.
