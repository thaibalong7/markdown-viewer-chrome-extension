# Markdown Plus 1.0.0

Version public đã chốt: **1.0.0**. Đây là nội dung chuẩn bị cho lần phát hành đầu; manual QA và xác nhận phát hành của người dùng còn chờ. Ngày publish sẽ được ghi khi Store thực sự phát hành.

## Release notes — nội dung public

Markdown Plus brings a local Markdown workspace to Chrome.

- Read Markdown with an outline, syntax highlighting, tables, math, footnotes, and Mermaid diagrams.
- Browse related documents, text files, diagrams, and images in the Files explorer.
- Choose light, dark, or custom themes, including device-local background images.
- Use the experimental Markdown editor with live preview, explicitly connect the original file for saving, and review external changes.
- Export HTML, Word-compatible documents, and Mermaid SVG/PNG images, or print supported documents.
- Use the interface in English, Vietnamese, or Simplified Chinese.

Requires **Chrome 116 or later**. After installation, open the extension's Details page and enable **Allow access to file URLs**, then open or reload a local Markdown file.

Documents are processed in your browser. Preferences may sync through Chrome; recent-file paths, connected file handles, and background-image binaries stay on the current device. Documents may load remote resources, and exported math may need external CSS/fonts when opened. See the [privacy policy](https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/) for details.

## Giới hạn cần công bố

- Editor là tính năng experimental, cần người dùng chọn file gốc và cấp quyền ghi. Save không tải bản sao thay thế nếu không ghi được file gốc.
- Ảnh nền custom theme không Sync sang thiết bị khác; chọn lại ảnh trên thiết bị đó khi cần.
- HTML/Word-compatible export có Math chưa tự chứa đầy đủ CSS/fonts; hiển thị Math offline có thể bị ảnh hưởng. Word-compatible export không phải định dạng DOCX native.
- Extension không tự bật quyền file URL; cần setup một lần trong Chrome.

## Trạng thái phát hành

- Numeric version trong package, lockfile và manifest: `1.0.0`.
- Kết quả candidate và checksum: [release-candidate-1.0.0.md](./release-candidate-1.0.0.md).
- Manual QA trên ZIP, Sync hai profile và xác nhận của người dùng: **chờ**.
- Store item, disclosure selections và submission: **chưa xác minh/chưa thực hiện trong task này**.
