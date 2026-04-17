# Phase 2 - Core Markdown Rendering MVP

**Trạng thái implement:** Hoàn thành — shell là React (`src/viewer/react/`); sanitize trong `src/viewer/core/renderer.js` (không có file `sanitize-html.js` / `dom-renderer.js` tách riêng như spec).

> **Note:** Phase design doc — implementation may differ from listed paths. For **current** architecture and file layout, see [`docs/project-overview-for-ai.md`](../project-overview-for-ai.md) and `src/`.

## Mục tiêu
Biến raw markdown thành HTML dễ đọc, có layout viewer cơ bản, có nút Settings placeholder ở góc trên bên phải.

## Deliverable
- Markdown cơ bản render được thành HTML đẹp
- Có shell layout ban đầu
- Có content pane
- Có header toolbar
- Có settings button placeholder
- Có sanitize output

## Files cần implement
```text
src/viewer/app.js
src/viewer/core/markdown-engine.js
src/viewer/core/renderer.js
src/viewer/core/sanitize-html.js
src/viewer/core/dom-renderer.js
src/viewer/shell/viewer-shell.js
src/viewer/shell/header-toolbar.js
src/viewer/shell/content-pane.js
src/viewer/styles/base.scss
src/viewer/styles/layout.scss
src/viewer/styles/content.scss
```

## Definition of done
- user mở markdown và thấy HTML dễ đọc
- có layout viewer usable
- có settings button placeholder ở góc trên bên phải
- output được sanitize
