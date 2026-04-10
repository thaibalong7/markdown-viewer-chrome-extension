# Phase 8 - Optional Advanced Plugins

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

## Files cần implement
```text
src/plugins/optional/mermaid.plugin.js
src/plugins/optional/math.plugin.js
src/plugins/optional/footnote.plugin.js
src/plugins/optional/emoji.plugin.js
src/viewer/shell/settings-drawer.js
```

## Follow-up đề xuất (sau DONE)
- Bổ sung action `Export` cho từng Mermaid block.
- Định dạng MVP: `SVG` (nhanh, giữ chất lượng vector).
- Pha mở rộng: `PNG` cho nhu cầu chia sẻ trong tài liệu/chat.
