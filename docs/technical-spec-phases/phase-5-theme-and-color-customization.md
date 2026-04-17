# Phase 5 - Theme & Color Customization

**Trạng thái implement:** Hoàn thành — preset + CSS variables trong `src/theme/index.js` (không có `theme/themes/*.js` hay `style-generator.js` riêng như spec).

> **Note:** Phase design doc — implementation may differ from listed paths. For **current** architecture and file layout, see [`docs/project-overview-for-ai.md`](../project-overview-for-ai.md) and `src/`.

## Trạng thái
✅ Completed

## Mục tiêu
Cho phép tùy biến sâu hơn về màu sắc với 2 theme `light`/`dark` (GitHub-style) mà không cần full re-render cho hầu hết trường hợp.

## Deliverable
- Có 2 preset theme: `light`, `dark`
- Có custom color cho các nhóm UI chính
- Có live preview qua CSS variables
- Settings drawer hỗ trợ chỉnh màu

## Files cần implement
```text
src/theme/themes/light.js
src/theme/themes/dark.js
src/viewer/core/style-generator.js
src/theme/theme-service.js
src/viewer/shell/settings-drawer.js
src/settings/default-settings.js
```
