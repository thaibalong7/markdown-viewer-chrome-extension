# Phase 3 - Table of Contents Left Sidebar

**Trạng thái implement:** Hoàn thành — `OutlinePanel.jsx`, `useScrollSpy.js`, `toc-builder.js` (không còn `toc-sidebar.js` / `rebuild-toc.js` imperative).

> **Note:** Phase design doc — implementation may differ from listed paths. For **current** architecture and file layout, see [`docs/project-overview-for-ai.md`](../project-overview-for-ai.md) and `src/`.

## Mục tiêu
Hoàn thiện Table of Contents ở sidebar bên trái, có thể click để điều hướng và highlight section đang active khi scroll.

## Deliverable
- TOC hiển thị ở sidebar trái
- Sinh tự động từ headings
- Click item → scroll tới heading
- Highlight active section
- Sticky sidebar
- Có option show/hide TOC

## Files cần implement
```text
src/viewer/core/toc-builder.js
src/viewer/core/scroll-spy.js
src/viewer/shell/toc-sidebar.js
src/viewer/actions/rebuild-toc.js
src/viewer/styles/toc.scss
src/viewer/app.js
src/viewer/shell/viewer-shell.js
```
