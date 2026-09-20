# Chrome Web Store Release Checklist

Tài liệu này ghi lại các việc cần hoàn thành trước khi phát hành Markdown Plus
lên Chrome Web Store. Thực hiện theo thứ tự ưu tiên bên dưới; không cần thêm
tính năng lớn trước khi hoàn thành các blocker.

## Trạng thái review ban đầu

- [x] `npm test`: 87 test files, 485 tests pass.
- [x] `npm run build`: production build thành công trên Node 20.19.5.
- [x] Kích thước `dist`: khoảng 11 MB; tổng JavaScript khoảng 9.4 MB.
- [x] Production dependency audit sạch hoặc mọi advisory còn lại đã được đánh
  giá và ghi rõ lý do chấp nhận.
- [x] Manifest chỉ yêu cầu các quyền thực sự cần thiết.
- [x] Có onboarding rõ ràng cho quyền `file://`.
- [ ] Có privacy policy và đầy đủ nội dung Chrome Web Store listing.
- [ ] ZIP phát hành mới có `manifest.json` ở root.
- [ ] Hoàn thành manual smoke test bằng chính ZIP sẽ upload.

## P0 — Blocker trước khi submit

### 1. Cập nhật dependency có advisory bảo mật

Audit ngày 2026-09-20 báo 6 production vulnerabilities: 2 high và 4 moderate.
Các package bị ảnh hưởng gồm `dompurify`, `markdown-it`, `linkify-it`,
`mermaid`, `lodash-es` và `uuid`.

- [x] Tạo branch/changelog riêng cho dependency security update.
- [x] Nâng các dependency trực tiếp và cập nhật `package-lock.json`.
- [x] Xác nhận ít nhất các phiên bản an toàn được đề xuất bởi audit:
  - `dompurify` >= 3.4.15
  - `markdown-it` >= 14.3.2
  - `linkify-it` >= 5.0.2
  - `mermaid` >= 11.17.2
- [x] Kiểm tra các thay đổi transitive đối với `lodash-es` và `uuid`.
- [x] Xác nhận clean install trên Node 20 không còn cảnh báo engine từ
  `chevrotain@12`.
- [x] Chạy toàn bộ test, build và size report.
- [x] Chạy lại production audit.

```bash
nvm use 20.19.5
npm install
npm audit --omit=dev
npm test
npm run build
npm run size:report
```

Tiêu chí hoàn thành:

- `npm audit --omit=dev` không còn advisory tác động đến runtime, hoặc advisory
  còn lại có phân tích exploitability và quyết định chấp nhận rõ ràng.
- Markdown, Mermaid, Math, Shiki và export vẫn hoạt động sau update.
- Không có regression trong 485 test hiện tại và các test mới.

### 2. Thu hẹp manifest permissions

`manifest.json` trước đây dùng `<all_urls>` dù sản phẩm chỉ trực tiếp kích hoạt
trên local `file:` Markdown.

- [x] Đổi `content_scripts.matches` từ `<all_urls>` sang `file:///*`.
- [x] Loại `<all_urls>` khỏi `host_permissions`; giữ phạm vi local nhỏ nhất cần
  thiết.
- [x] Thu hẹp `web_accessible_resources.matches` xuống `file:///*` nếu build và
  dynamic imports vẫn hoạt động.
- [ ] Giữ `storage`, `offscreen`, `downloads` chỉ khi mỗi quyền có justification
  cụ thể trong Store dashboard.
- [x] Thêm `"minimum_chrome_version": "109"` vì `chrome.offscreen` yêu cầu
  Chrome 109+.
- [x] Build lại và kiểm tra manifest sinh ra trong `dist/manifest.json`.

Justification gợi ý:

- `storage`: lưu reader/editor/plugin preferences; recent file paths được giữ
  riêng trong local storage.
- `offscreen`: đọc local `file:` documents và directory listing cho Files
  explorer.
- `downloads`: lưu HTML, Word, Mermaid images và download fallback khi thao tác
  từ trang `file:`.
- `file:///*`: nhận diện, đọc và hiển thị local Markdown documents.

Đã xác nhận các quyền trên còn được runtime sử dụng. Các justification này vẫn
cần được nhập vào Store dashboard khi tạo submission.

Tiêu chí hoàn thành:

- Source manifest và built manifest không còn `<all_urls>`.
- Viewer, lazy chunks, KaTeX fonts, Shiki, Mermaid và editor vẫn load được trên
  `file:` pages.
- Extension không yêu cầu quyền đọc/thay đổi dữ liệu trên mọi website.

### 3. Thêm onboarding cho file URL access

Chrome không tự bật “Allow access to file URLs”. Nếu quyền này bị tắt, content
script không thể chạy trên local Markdown và người dùng hiện không nhận được
hướng dẫn ngay trong popup.

- [x] Kiểm tra `chrome.extension.isAllowedFileSchemeAccess()` trong popup.
- [x] Hiển thị banner/callout khi file access chưa được bật.
- [x] Thêm hướng dẫn ngắn:
  1. Mở `chrome://extensions`.
  2. Chọn Markdown Plus → Details.
  3. Bật “Allow access to file URLs”.
- [x] Nếu khả thi, thêm nút mở Extension Details.
- [x] Re-check trạng thái khi popup/options được focus lại.
- [x] Giữ diagnostic hiện có trong Settings.
- [ ] Đưa one-time setup này vào Store description và screenshot đầu tiên.

Tiêu chí hoàn thành:

- Người dùng mới có thể tự hoàn tất setup mà không cần đọc README.
- Popup phân biệt rõ trạng thái allowed, blocked và unavailable.
- Khi permission được bật, UI cập nhật mà không gây hiểu nhầm.

### 4. Privacy policy và data disclosure

- [ ] Xác nhận privacy policy đã deploy thành công tại
  `https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/` sau
  khi merge workflow vào `main` và chọn GitHub Actions làm Pages source.
- [x] Thêm privacy policy và GitHub Pages deployment workflow vào repo.
- [x] Mô tả nội dung file được xử lý local trong browser.
- [x] Mô tả recent file URLs/path được lưu trong `chrome.storage.local`.
- [x] Mô tả preferences có thể đi qua Chrome Sync khi `storage.sync` khả dụng.
- [x] Mô tả file handles có thể được lưu trong IndexedDB để hỗ trợ Save.
- [x] Khẳng định nội dung file không được gửi đến server do Markdown Plus vận
  hành.
- [x] Không tuyên bố “zero network requests” một cách tuyệt đối:
  - Markdown có thể tham chiếu remote images/resources.
  - HTML/Word export có Math hiện tham chiếu KaTeX CSS trên jsDelivr.
- [ ] Điền Chrome Web Store Privacy practices nhất quán với policy và runtime.
- [x] Chuẩn bị single-purpose statement, data-use declaration và permission
  justifications trong `docs/chrome-web-store-privacy-disclosure.md`.

Single-purpose statement gợi ý:

> A private local Markdown workspace for reading, navigating, editing, and
> exporting documents in Chrome.

Tiêu chí hoàn thành:

- Store disclosures, privacy policy, manifest và hành vi runtime không mâu
  thuẫn nhau.
- Có justification cho từng permission.

### 5. Tạo package phát hành đúng cấu trúc

Không sử dụng `markdown-plus.zip` hiện tại. Artifact này cũ và đặt toàn bộ
extension dưới thư mục `dist/`, khiến `manifest.json` không nằm ở root ZIP.

- [ ] Build sạch từ commit/tag sẽ phát hành.
- [ ] Kiểm tra `dist/manifest.json`, icons, popup, options và runtime assets.
- [ ] ZIP nội dung bên trong `dist/`, không ZIP chính thư mục `dist`.
- [ ] Đặt tên có version, ví dụ `markdown-plus-0.1.0.zip`.
- [ ] Kiểm tra archive có `manifest.json` ở root.
- [ ] Load unpacked từ `dist/` và smoke-test trước.
- [ ] Nếu có thể, giải nén ZIP sang thư mục tạm và load chính thư mục giải nén
  để xác nhận package upload hoạt động độc lập.

Ví dụ đóng gói:

```bash
nvm use 20.19.5
npm run build
cd dist
zip -r ../markdown-plus-0.1.0.zip .
cd ..
unzip -l markdown-plus-0.1.0.zip | head
```

Tiêu chí hoàn thành:

- `manifest.json` xuất hiện ở root ZIP.
- ZIP chứa `icons/icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`.
- Không chứa source-only files, `.DS_Store`, old ZIP hoặc `stats.html` không cần
  thiết.

## P1 — Hardening nên hoàn thành trong release đầu

### 6. Test sanitizer trong môi trường có DOM thật

Vitest hiện dùng Node environment. Trong môi trường đó DOMPurify không có
`window`, nên các test hiện tại chưa chứng minh sanitizer production loại bỏ
malicious HTML/SVG đúng cách.

- [ ] Đổi sanitizer thành fail-closed nếu purifier không khởi tạo được.
- [ ] Thêm jsdom/happy-dom hoặc browser test riêng cho sanitizer.
- [ ] Test loại bỏ `<script>` và inline event handlers.
- [ ] Test chặn `javascript:`, unsafe `data:` và malicious SVG.
- [ ] Test CSS/style payload có thể che toàn viewer hoặc tham chiếu remote URL.
- [ ] Test Mermaid `classDef`, state diagram và CSS injection regression.
- [ ] Giữ Shiki inline colors và KaTeX output cần thiết sau khi siết sanitizer.

Tiêu chí hoàn thành:

- Test thực sự chạy DOMPurify với một `window` implementation.
- Malicious fixture không thể tạo script/event handler/unsafe URL trong output.
- Security tests fail nếu sanitizer bị bypass hoặc không khởi tạo.

### 7. Hỗ trợ empty Markdown document

Hiện empty `.md` không mount viewer; linked empty Markdown cũng bị từ chối.
Điều này không phù hợp với inline editor vì người dùng không thể mở một note
mới trống để bắt đầu viết.

- [ ] Mount viewer cho empty direct-activation Markdown.
- [ ] Hiển thị empty state rõ ràng thay vì blank/raw page.
- [ ] Cho phép vào Edit mode và save nội dung mới.
- [ ] Cho phép mở empty Markdown từ Files explorer.
- [ ] Update characterization tests đang khóa behavior “empty file unmounted”.

Tiêu chí hoàn thành:

- Mở một file `.md` 0 byte vẫn thấy viewer và nút Edit.
- Save hoạt động với File System Access và download fallback.

### 8. Làm HTML/Word Math export hoạt động offline

- [ ] Loại dependency runtime của exported document vào jsDelivr.
- [ ] Chọn một trong các hướng:
  - inline phần KaTeX CSS/fonts cần thiết;
  - bundle stylesheet vào export;
  - hoặc ghi rõ limitation và network behavior trong UX/privacy policy.
- [ ] Test mở HTML/Word export khi offline.

### 9. Tăng khả năng chịu lỗi của plugin

- [ ] Optional plugin import failure không được làm hỏng toàn viewer.
- [ ] Một plugin hook throw không được ngăn Markdown cơ bản render.
- [ ] Cleanup của plugin này throw không được ngăn cleanup của plugin khác.
- [ ] Surface warning/toast phù hợp và log không chứa nội dung document.
- [ ] Thêm tests cho dynamic import/hook failure.

### 10. Reinjection/HMR cleanup

- [ ] Destroy app cũ trước khi `mountTarget.innerHTML = ''`.
- [ ] Bảo đảm `SETTINGS_UPDATED` listener không bị duplicate khi reinject.
- [ ] Test `destroy()` idempotent và không còn window/document listeners.

## P2 — Performance và polish, có thể làm sau launch

- [ ] Profile tài liệu Markdown 1 MB, 5 MB và nhiều fenced code blocks.
- [ ] Cân nhắc giới hạn hoặc warning cho Markdown cực lớn.
- [ ] Thêm bounded concurrency cho folder scanning.
- [ ] Throttle workspace scan progress updates.
- [ ] Giảm multi-pass allocation trong workspace picker.
- [ ] Tránh broadcast settings tới mọi tab không liên quan.
- [ ] Thêm in-flight guard cho export double-click.
- [ ] Đánh giá bundle lớn nhất (~1.53 MB) và cold-start trên máy yếu.
- [ ] Theo dõi các issue còn mở trong `docs/performance-issues-audit.md` dựa
  trên profile thực tế, không tối ưu chỉ vì kích thước code.

## Chrome Web Store listing

### Metadata

- [ ] Chọn version public: giữ `0.1.0` cho beta hoặc chuyển `1.0.0` nếu định vị
  là stable release.
- [ ] Cập nhật manifest description để nói rõ local Markdown value proposition.
- [ ] Viết detailed description, tránh keyword stuffing.
- [ ] Chọn category phù hợp, có thể là Developer Tools hoặc Productivity.
- [ ] Ghi rõ one-time file access setup.
- [ ] Ghi rõ mọi processing chính diễn ra local.
- [ ] Có support URL và email hỗ trợ.
- [ ] Có homepage/source URL nếu muốn tăng độ tin cậy.

Description ngắn gợi ý:

> Read, browse, edit, and export local Markdown files in a private workspace.

### Graphic assets

- [ ] Store icon 128x128 đã kiểm tra hiển thị rõ ở kích thước nhỏ.
- [ ] Ít nhất một screenshot 1280x800; nên chuẩn bị 4–5 ảnh.
- [ ] Small promo tile 440x280.
- [ ] Optional marquee image 1400x560.
- [ ] Không dùng screenshot chứa dữ liệu/path cá nhân.

Screenshot gợi ý:

1. Viewer tổng thể với Files explorer và Outline.
2. Split editor + live preview.
3. Workspace tree với nhiều định dạng.
4. Mermaid/Math/code highlighting.
5. Popup hoặc Settings với privacy/file-access messaging.

## Manual release QA matrix

Thực hiện trên clean Chrome profile bằng đúng `dist/`/ZIP release candidate.

### Install và permissions

- [ ] Install khi file access đang off.
- [ ] Popup hướng dẫn setup chính xác.
- [ ] Bật file access và xác nhận viewer bắt đầu hoạt động.
- [ ] Disable/enable extension settings trên tab đang mở.
- [ ] Reload extension khi viewer tab còn mở; không duplicate UI/listeners.

### Documents

- [ ] `.md`, `.markdown`, `.mdown`, `.mdc` direct activation.
- [ ] Empty Markdown và whitespace-only Markdown.
- [ ] Unicode, spaces, encoded paths và parent-directory links.
- [ ] `.txt`, `.sql`, `.mermaid` từ explorer.
- [ ] Raster images và SVG từ explorer.
- [ ] Invalid/missing/oversized linked files có error state dễ hiểu.

### Rendering và security

- [ ] Raw HTML with script/event-handler fixtures.
- [ ] `javascript:`/unsafe URL fixtures.
- [ ] Code blocks cho các Shiki languages chính.
- [ ] Mermaid official và beautiful renderer.
- [ ] Mermaid invalid syntax, nhiều charts và malicious class/style fixtures.
- [ ] KaTeX, footnote, emoji on/off.
- [ ] Light/dark theme và theme persistence.

### Explorer và navigation

- [ ] Sibling listing.
- [ ] Workspace scan với/không `.gitignore`.
- [ ] Progress, cancel, limits và error paths.
- [ ] Internal link navigation, Back/Forward và reload restoration.
- [ ] Virtual workspace navigation không làm hỏng entry URL.

### Editor và save

- [ ] Enter/exit Edit mode.
- [ ] Dirty-state confirmation.
- [ ] Ctrl/Cmd+S.
- [ ] File System Access save.
- [ ] Permission denied/cancel/file mismatch.
- [ ] Download fallback.
- [ ] Search/replace, focus/split modes và scroll sync.

### Export và print

- [ ] Print từng document capability.
- [ ] HTML export.
- [ ] Word export.
- [ ] Mermaid SVG và PNG 1x–4x.
- [ ] Offline export check.
- [ ] Double-click export không tạo duplicate operations.

### Compatibility

- [ ] Latest stable Chrome trên macOS.
- [ ] Latest stable Chrome trên Windows, đặc biệt file URL/path handling.
- [ ] Một máy cấu hình thấp hoặc CPU throttling.
- [ ] Browser restart và service-worker cold start.

## Release gate cuối cùng

Chỉ submit khi tất cả điều kiện sau đạt:

- [ ] Không còn production security advisory chưa được đánh giá.
- [x] Manifest không còn `<all_urls>`.
- [ ] File-access onboarding đã hoạt động.
- [ ] Sanitizer có browser/DOM security tests.
- [ ] Privacy policy và Store disclosures hoàn chỉnh.
- [ ] Store icon, screenshot và promo tile sẵn sàng.
- [ ] Test và production build pass trên clean install.
- [ ] Manual QA matrix không còn blocker.
- [ ] ZIP release candidate có `manifest.json` ở root.
- [ ] Version trong manifest khớp tên ZIP và release notes.
- [ ] Source commit/tag của release đã được ghi lại.

## Backlog sau launch

Không đưa các mục này vào release đầu nếu chúng làm chậm hardening:

- Auto-reload khi file được sửa bởi editor bên ngoài.
- Workspace filename/content search.
- Read-only raw/render toggle độc lập với Edit mode.
- Thêm theme hoặc Markdown extensions mới.
- Remote raw Markdown URLs; tính năng này sẽ làm permission/privacy scope lớn
  hơn và cần review thiết kế riêng.
