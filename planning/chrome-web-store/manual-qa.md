# Post-launch browser verification

These checks were left unrecorded in the first-release preparation. The extension is now published; an unchecked item means missing verification evidence, not a known failure or a pending first-launch gate. Keep the list until results are recorded.

For installed-product checks, record Store version, OS, Chrome version, date, and tester. For candidate checks, unpack the exact ZIP and also record its numeric/display version and SHA-256. See [release workflow](../../docs/releasing.md) and [1.0.0 evidence](../../docs/chrome-web-store/release-1.0.0.md). Prior unpacked smoke checks do not certify the final ZIP.

## Install, permissions và lifecycle

- [ ] Install khi file access đang off; Popup hướng dẫn đúng và mở được Extension Details.
- [ ] Bật file access, mở lại local Markdown và xác nhận trạng thái Popup/Settings cập nhật.
- [ ] Disable/enable Viewer trong settings trên tab đang mở.
- [ ] Reload extension khi Viewer còn mở; không duplicate UI/listeners hoặc mất đường phục hồi.
- [ ] Browser restart, service-worker cold start và nhiều Viewer tabs cùng hoạt động.

## Documents và navigation

- [ ] `.md`, `.markdown`, `.mdown`, `.mdc` direct activation; empty và whitespace-only Markdown.
- [ ] Unicode, spaces, encoded paths, parent-directory links và Windows file URLs.
- [ ] `.txt`, `.sql`, `.dbml`, `.mermaid`, raster images và SVG từ explorer.
- [ ] Invalid/missing/oversized files có error state rõ ràng.
- [ ] Sibling listing và workspace scan với/không `.gitignore`; progress, cancel, limits và errors.
- [ ] Internal links, heading navigation, Back/Forward và reload restoration.
- [ ] Virtual workspace navigation giữ entry URL và yêu cầu chọn lại workspace khi cần.

## Rendering, security, themes và languages

- [ ] Raw HTML script/event handlers, unsafe URLs, global CSS và fixed-overlay fixtures.
- [ ] Mermaid official/beautiful, invalid syntax, nhiều charts, malicious class/style và CSS imports.
- [ ] Shiki languages chính; KaTeX, footnote, emoji, GitHub Alerts và color preview on/off.
- [ ] Light/dark/custom themes, syntax-theme preview và live settings updates.
- [ ] Custom theme image upload/replace/delete/reset, missing asset và giới hạn dung lượng.
- [ ] Custom themes/settings save và import sát quota, Unicode names và lỗi storage; kiểm tra lại sau reload.
- [ ] English, Vietnamese, Simplified Chinese, browser-language fallback và live language switching.
- [ ] Narrow layouts, keyboard/focus, reduced motion và lightbox/resolution controls.

## Editor, document updates và change review

- [ ] Enter/exit Edit, kết nối file gốc, permission denied/cancel, tên/nội dung không khớp.
- [ ] Dirty-state confirmation, Ctrl/Cmd+S, Save và conflict khi file đổi ngoài editor.
- [ ] Save thất bại không mất draft, không âm thầm ghi đè hoặc tải bản sao.
- [ ] Search/replace, focus/split modes, scroll sync và draft/undo khi đổi settings/language.
- [ ] Ask/Automatic/Off, pending update, stable-change detection và giữ reading position.
- [ ] Watch không ghi đè dirty draft hoặc chạy sai khi Save đang diễn ra.
- [ ] Change Review: pinned comparison, Review latest, diff limits/fallback, section navigation và keyboard/modal behavior.

## Export và print

- [ ] Print các document formats có capability.
- [ ] HTML và Word export; không lẫn Viewer controls hoặc nội dung soạn dở ngoài chính sách export.
- [ ] Mermaid SVG và PNG 1x–4x.
- [ ] Export online/offline; Math limitation khớp disclosure.
- [ ] Double-click export và export errors không tạo trạng thái hỏng hoặc tác vụ ngoài ý muốn.

## Compatibility và performance

- [ ] Latest stable Chrome trên macOS.
- [ ] Latest stable Chrome trên Windows, đặc biệt file URL/path handling và Save.
- [ ] Phiên bản Chrome tối thiểu đã chốt sau compatibility audit.
- [ ] Cold-start, Markdown lớn/nhiều code blocks và máy cấu hình thấp hoặc CPU throttling không có blocker rõ ràng.

## Chrome Sync across devices/profiles

- [ ] Hai Chrome profiles đăng nhập cùng tài khoản với Sync bật: kiểm tra index/theme records truyền thực tế, chỉnh sửa đồng thời, late deletion và incomplete-snapshot recovery.
- [ ] Kiểm tra theme image fallback trên thiết bị không có ảnh, UI warning và khả năng lưu lại sau recovery. Mock concurrency và một Chrome storage profile không chứng minh hội tụ qua mạng.
