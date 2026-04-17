# Phase 4 - Settings Drawer & Runtime Customization

> **Note:** Phase design doc — implementation may differ from listed paths. For **current** architecture and file layout, see [`docs/project-overview-for-ai.md`](../project-overview-for-ai.md) and `src/`.

## Trạng thái
✅ **Customization hoàn thành** qua **extension popup (React)** + `SETTINGS_UPDATED`. **Không** có settings drawer trong viewer như spec gốc; xem Phase 4-R trong [`react-migration-plan.md`](../react-migration-plan.md).

## Mục tiêu
*(Spec gốc / deferred)*: Biến nút Settings trong viewer thành điểm truy cập cấu hình trực tiếp.  
**Triển khai hiện tại**: runtime settings đi qua popup extension, đồng bộ về viewer bằng `SETTINGS_UPDATED`.

## Deliverable
- (Spec gốc) Nút Settings mở được drawer/panel trong viewer
- User chỉnh được các config nền tảng
- Settings được lưu vào storage
- Viewer tự update sau khi đổi setting

## Files cần implement
```text
src/viewer/shell/settings-drawer.js
src/viewer/actions/open-settings.js
src/viewer/actions/update-settings.js
src/viewer/state/settings-state.js
src/viewer/styles/settings.scss
src/theme/theme-service.js
src/theme/css-vars.js
src/settings/settings.service.js
src/viewer/app.js
```
