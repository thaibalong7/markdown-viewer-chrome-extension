# Phase 6 - Plugin Architecture

**Trạng thái implement:** Hoàn thành — `src/plugins/plugin-manager.js` + `plugin-types.js` (flat `plugins/core` / `plugins/optional`, không có `plugins/registry/`).

> **Note:** Phase design doc — implementation may differ from listed paths. For **current** architecture and file layout, see [`docs/project-overview-for-ai.md`](../project-overview-for-ai.md) and `src/`.

## Mục tiêu
Thiết kế hệ thống plugin để mở rộng khả năng render mà không làm lõi viewer bị phình và phụ thuộc cứng.

## Deliverable
- Có plugin registry
- Có plugin manager
- Có lifecycle hooks
- Có config enable/disable plugin
- Renderer hỗ trợ plugin pipeline

## Files cần implement
```text
src/plugins/registry/plugin-hooks.js
src/plugins/registry/plugin-registry.js
src/plugins/registry/plugin-manager.js
src/plugins/shared/plugin-types.js
src/plugins/shared/plugin-defaults.js
src/viewer/state/plugin-state.js
src/viewer/core/renderer.js
src/viewer/shell/settings-drawer.js
```
