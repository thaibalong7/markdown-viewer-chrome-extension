# Phase 10 - Hardening, Performance & Polish

## Mục tiêu
Nâng chất lượng sản phẩm để gần mức production-ready: ổn định hơn, mượt hơn, ít edge-case hơn.

## Deliverable
- render ổn định hơn với file lớn
- plugin lỗi không phá toàn app
- settings migration có mặt
- logging/debug tốt hơn
- QA checklist đầy đủ
- code block có language label bên trái và copy button bên phải, nhất quán toàn viewer

## Files nên implement / rà soát
```text
src/viewer/utils/debounce.js
src/viewer/utils/throttle.js
src/settings/settings.migrations.js
src/shared/helpers/logger.js
src/viewer/core/renderer.js
src/plugins/registry/plugin-manager.js
src/content/page-detector.js
src/content/raw-content-extractor.js
src/viewer/styles/content.scss
src/viewer/core/renderer.js
src/plugins/core/code-highlight.plugin.js
```
