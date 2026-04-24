# Phase 8 - Optional Advanced Plugins

**Trạng thái implement:** Hoàn thành — `src/plugins/optional/` (Mermaid + `mermaid-actions.js` / `mermaid-lightbox.js` / `mermaid-export.js`).

> **Note:** Phase design doc — implementation may differ from listed paths. For **current** architecture and file layout, see [`docs/project-overview-for-ai.md`](../project-overview-for-ai.md) and `src/`.

## Status
- DONE

## Mục tiêu
Bổ sung các plugin mạnh hơn cho tài liệu kỹ thuật/phức tạp: Mermaid, Math, Footnote, Emoji.

## Deliverable
- [x] Mermaid render được
- [x] Math render được nếu bật plugin
- [x] Footnote và Emoji hỗ trợ nếu cần
- [x] Plugin failure có fallback graceful
- [x] Follow-up: export Mermaid chart ra image (ưu tiên SVG, mở rộng PNG)
- [x] Follow-up: Mermaid lightbox với pan/zoom, re-center, keyboard shortcuts, theme-aware overlay

## Files cần implement
```text
src/plugins/optional/mermaid.plugin.js
src/plugins/optional/math.plugin.js
src/plugins/optional/footnote.plugin.js
src/plugins/optional/emoji.plugin.js
src/viewer/shell/settings-drawer.js
```

## Follow-up đã triển khai
- Action `Export` cho từng Mermaid block (`SVG` + `PNG 1x-4x`)
- Mermaid lightbox toàn màn hình:
  - mở từ chart hoặc nút expand
  - pan/zoom toàn màn hình
  - re-center
  - `Esc` / `+` / `-` / `0`
  - overlay follow theme
  - clone SVG mật độ cao hơn trong lightbox để zoom sắc nét hơn
