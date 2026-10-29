# Chrome Web Store Release Checklist

Tài liệu này theo dõi các việc cần hoàn thành trước khi phát hành Markdown Plus lên Chrome Web Store. Cập nhật theo review ngày **2026-10-29**: nền tảng và quy trình đóng gói đã khá đầy đủ, nhưng **chưa nên submit bản hiện tại** vì còn vấn đề dependency, sanitizer, Chrome Sync quota và tương thích Chrome. Ưu tiên xử lý P0 trước khi thêm tính năng lớn.

## Kết quả review ngày 2026-10-29

Đây là kết quả của worktree được kiểm tra trong phiên review, không phải chứng nhận cho release candidate sau các thay đổi tiếp theo. Chạy lại kiểm tra liên quan sau khi sửa lỗi và trên artifact cuối cùng.

| Kiểm tra | Kết quả đã xác minh | Giới hạn |
| --- | --- | --- |
| Node.js | Dùng bản pin `20.19.5` trong `.nvmrc`. | Chưa xác minh lại bằng clean install `npm ci`. |
| `npm test` | 183 test files, 1.361 tests pass. | Không thay thế kiểm thử extension trong Chrome. |
| `npm run build` | Production build thành công. | Có cảnh báo chunk lớn hơn 500 kB và tùy chọn Rollup/Rolldown từ CRXJS. |
| `npm run size:report` | `dist` khoảng 12 MB, tổng JavaScript khoảng 11 MB theo `du`; chunk lớn nhất khoảng 1,53 MB trước gzip. | Chưa profile cold-start hoặc máy cấu hình thấp. |
| `npm audit --omit=dev` | 5 package production bị cảnh báo: 1 critical, 1 high, 3 low theo npm. | Cần đánh giá điều kiện ảnh hưởng; mức cảnh báo package không chứng minh extension có thể bị khai thác. |
| Permissions | `storage`, `offscreen`, `downloads`, host `file:///*`; không còn `<all_urls>`. | Chưa xác minh khai báo trong Store dashboard. |
| Privacy policy | [URL công khai](https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/) trả HTTP 200. | Cần bổ sung disclosure cho ảnh nền custom theme và xác minh bản deploy sau cập nhật. |
| ZIP trong `releases/` | Hai artifact `0.1.0-20261029T144358823Z` và `0.1.0-20261029T144613793Z` có manifest ở root, archive hợp lệ và SHA-256 khớp metadata. | Cả hai ghi nhận dirty worktree; chưa smoke-test chính ZIP trên clean Chrome profile. |
| Store assets | Có bộ 8 PNG đã duyệt; Store icon khớp từng byte với icon 128 px đóng gói. | Chưa xác minh việc upload/listing trong dashboard. |

Các vấn đề đã tái hiện trong review:

- Qua chính `renderDocument()` và `renderIntoElement()` trong jsdom, CSS từ raw HTML vẫn có thể đặt `#mdp-viewer-root { display:none!important }`, khiến toàn bộ Viewer bị ẩn. Inline style tạo lớp phủ toàn màn hình cũng được giữ lại.
- Settings với 18 custom themes mặc định hợp lệ có kích thước khoảng 8.589 byte; 32 themes khoảng 14.511 byte. Cả hai vượt quota 8.192 byte mỗi item của Chrome Sync. Mô phỏng quota qua settings service xác nhận save bị từ chối và không chuyển sang local.
- Build target thực tế resolve thành Chrome 111, trong khi manifest khai báo Chrome 109; CSS dùng `color-mix()` vốn cần Chrome 111.
- `dist.zip` cũ đặt manifest dưới `dist/manifest.json` và chứa `__MACOSX`; không dùng archive này để upload.

## P0 — Phải hoàn thành trước khi submit

### 1. Cập nhật dependency và đánh giá advisory hiện tại

Kết quả audit cũ ngày 2026-09-20 không còn đủ để kết luận an toàn. Lockfile được review đang dùng `markdown-it@14.3.2`, `dompurify@3.4.15`, `katex@0.16.47`, `mermaid@11.17.2` và `@mdit/plugin-katex@0.25.2`.

| Package/chuỗi dependency | Đánh giá từ review | Việc cần làm |
| --- | --- | --- |
| `markdown-it` | Bản 14.3.2 bị ảnh hưởng bởi lỗi render theo thời gian bình phương, có thể làm treo tab với đầu vào đặc biệt; extension sử dụng đường render này. | Nâng ít nhất lên 14.3.3 trong nhánh 14 và kiểm tra lại advisory mới tại thời điểm release. |
| `dompurify` | Audit npm gắn mức critical cho package; các advisory đã đọc yêu cầu những chế độ như `IN_PLACE` hoặc `SAFE_FOR_TEMPLATES` kết hợp DOM output mà cấu hình sanitizer hiện tại không dùng. Chưa chứng minh XSS trong extension từ các advisory này. | Nâng tối thiểu lên 3.4.17 cho các advisory đã kiểm tra, đồng thời ghi rõ phân tích điều kiện ảnh hưởng. |
| `katex` qua `mermaid` và `@mdit/plugin-katex` | Audit báo low liên quan trust restrictions khi đã có prototype pollution; ba package trong chuỗi không tương đương ba exploit độc lập. | Đánh giá đường gọi, bản vá và khả năng nâng tương thích; ghi quyết định cho advisory còn lại. |

- [ ] Cập nhật dependency và `package-lock.json` có chủ đích; không chạy `npm audit fix --force` máy móc hoặc downgrade Mermaid chỉ theo gợi ý tự động.
- [ ] Với mỗi advisory còn lại, ghi package/version, điều kiện khai thác, đường runtime liên quan và quyết định xử lý/chấp nhận cùng lý do.
- [ ] Chạy clean install bằng Node pin và kiểm tra cảnh báo engine/dependency.
- [ ] Chạy lại full tests, production build, size report và production audit sau cập nhật.
- [ ] Smoke-test Markdown, Shiki, Mermaid official/beautiful, Math và export sau nâng dependency.

```bash
nvm use
npm ci
npm audit --omit=dev
npm test
npm run build
npm run size:report
```

Tiêu chí hoàn thành: không còn advisory runtime chưa được đánh giá; lỗi Markdown gây treo tab đã được vá; advisory được chấp nhận phải có phân tích cụ thể, không dựa riêng vào việc tests pass hoặc package đã từng được cập nhật.

Nguồn: [markdown-it DoS và bản vá 14.3.3](https://github.com/markdown-it/markdown-it/security/advisories/GHSA-gfr2-rv44-r23c), [DOMPurify SAFE_FOR_TEMPLATES](https://github.com/cure53/DOMPurify/security/advisories/GHSA-cg2g-xh64-v4q7), [DOMPurify IN_PLACE](https://github.com/cure53/DOMPurify/security/advisories/GHSA-mrv2-3pqr-j5jr).

### 2. Siết sanitizer và bổ sung DOM security tests

Source liên quan: [`renderer.js`](../../src/viewer/core/renderer.js), [`mermaid-sanitizer.js`](../../src/viewer/mermaid/mermaid-sanitizer.js), [`renderer.test.js`](../../src/viewer/core/__tests__/renderer.test.js) và [`mermaid-sanitizer.test.js`](../../src/viewer/mermaid/__tests__/mermaid-sanitizer.test.js).

`sanitizeHtml()` hiện trả nguyên HTML khi purifier không khởi tạo được. Khi có DOM, sanitizer loại bỏ script/event handler trong fixture cơ bản đã thử nhưng vẫn giữ raw `<style>` và inline style có thể ảnh hưởng toàn Viewer. Sanitizer SVG giữ global CSS và không loại bỏ dạng `@import "https://…"`. Đây là vấn đề CSS isolation đã tái hiện tại sanitizer boundary; không coi đó là bằng chứng thực thi JavaScript hoặc khai thác được qua mọi đầu vào Mermaid.

Repo đã có jsdom cho một số tests, nhưng renderer tests chạy mặc định trong Node; Mermaid sanitizer test chỉ kiểm tra trường hợp không có purifier, còn render-service tests mock sanitizer. Vì vậy bộ test xanh hiện tại chưa chứng minh đầy đủ DOMPurify production xử lý malicious HTML/SVG đúng cách.

- [ ] Đổi HTML sanitizer thành fail-closed: báo lỗi an toàn hoặc trả nội dung an toàn khi purifier không khả dụng, không trả nguyên HTML đầu vào.
- [ ] Chặn stylesheet từ raw HTML không tin cậy và giới hạn inline style có thể tạo overlay/che UI; bảo toàn style cần thiết của Shiki và KaTeX.
- [ ] Kiểm soát CSS trong SVG Mermaid, gồm selector ảnh hưởng ngoài diagram, `@import` và URL từ xa; không dựa vào hai regex hiện tại như một CSS sanitizer hoàn chỉnh.
- [ ] Thêm tests chạy sanitizer thật trong jsdom hoặc browser, không mock purifier/sanitizer tại security boundary.
- [ ] Test `<script>`, inline event handlers, `javascript:`, unsafe `data:` và malicious SVG.
- [ ] Test global `<style>`, inline fixed overlay, CSS remote resources và cả dạng `@import url(...)` lẫn `@import "..."`.
- [ ] Test Mermaid `classDef`, state diagram và CSS injection regression qua đường render thực tế.
- [ ] Test Shiki colors, KaTeX HTML/MathML và diagram hợp lệ vẫn render sau khi siết sanitizer.
- [ ] Kiểm tra fixtures trong Chrome, gồm việc document không thể ẩn/che Viewer chrome bằng CSS đã bị cấm.

Tiêu chí hoàn thành: test fail nếu sanitizer bị bypass/không khởi tạo; document không điều khiển CSS ngoài phạm vi được cho phép; script/event handler/unsafe URL bị loại bỏ và nội dung hợp lệ vẫn hiển thị đúng.

### 3. Sửa Chrome Sync quota cho custom themes

[`settings-service.js`](../../src/settings/settings-service.js) lưu toàn bộ settings trong key `mdViewer.settings`. [`theme/index.js`](../../src/theme/index.js) cho phép tối đa 32 custom themes, nhưng dữ liệu hợp lệ có thể vượt quota mỗi item trước khi đạt giới hạn này. `chrome.storage.sync || chrome.storage.local` chỉ fallback khi API sync không tồn tại, không xử lý lỗi quota từ `sync.set()`.

- [ ] Chọn cách lưu settings/themes phù hợp: chia thành các key có giới hạn dung lượng hoặc lưu local với chính sách sync/fallback rõ ràng.
- [ ] Tính cả dung lượng JSON và key trước save/import; không chỉ giới hạn số themes.
- [ ] Xử lý lỗi quota bằng thông báo dễ hiểu, không báo save thành công hoặc làm mất settings cũ.
- [ ] Nếu có fallback sang local, bảo đảm lần đọc tiếp theo dùng đúng bản mới nhất và hành vi giữa các thiết bị được giải thích rõ.
- [ ] Thêm tests sát ngưỡng 8.192 byte, đủ 32 themes, tên Unicode và background descriptors; kiểm tra import, update, delete và reset.
- [ ] Cập nhật architecture/theme docs và privacy disclosure nếu thay đổi ownership hoặc chính sách lưu/sync.

Tiêu chí hoàn thành: mọi cấu hình UI/schema cho phép đều lưu được theo chính sách đã chọn hoặc bị từ chối trước khi ghi bằng lỗi rõ ràng; lỗi quota không làm mất bản đã lưu. Xác minh thêm với Chrome Storage thật.

Nguồn: [Chrome storage.sync quota](https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync-QUOTA_BYTES_PER_ITEM).

### 4. Đồng bộ mức Chrome tối thiểu với build và runtime

[`manifest.json`](../../manifest.json) khai báo Chrome 109 vì Offscreen API có từ phiên bản đó, nhưng đây chưa phải bằng chứng toàn extension hỗ trợ 109. [`vite.config.mjs`](../../vite.config.mjs) chưa đặt build target riêng, nên Vite 8 resolve về Chrome 111. Các token trong [`_tokens.scss`](../../src/shared/styles/_tokens.scss) và nhiều surface dùng `color-mix()` cần Chrome 111.

- [ ] Rà soát browser APIs, JavaScript từ dependency và CSS thực tế để chốt mức Chrome hỗ trợ.
- [ ] Nếu giữ Chrome 109: đặt build target phù hợp, bổ sung CSS/runtime fallback cần thiết và kiểm thử trên 109; chỉ đổi `build.target` không đủ.
- [ ] Nếu nâng minimum: cập nhật manifest và tài liệu sau khi hoàn thành compatibility audit; không mặc định rằng 111 đủ cho mọi dependency.
- [ ] Kiểm thử trên phiên bản Chrome tối thiểu đã chốt và latest stable, gồm Popup, Settings, Theme Studio, Viewer, editor và lazy imports.

Tiêu chí hoàn thành: manifest, build target, CSS/runtime và thông tin hỗ trợ người dùng thống nhất; có kết quả chạy trên phiên bản tối thiểu thực sự hỗ trợ.

Nguồn: [Vite 8 build target](https://v8.vite.dev/config/build-options), [Chrome color-mix() support](https://developer.chrome.com/docs/css-ui/css-color-mix).

### 5. Hoàn tất privacy, permissions và file-access onboarding

- [x] Privacy policy công khai trả HTTP 200 tại thời điểm review.
- [x] Có policy source trong `site/privacy/` và workflow GitHub Pages.
- [x] Policy mô tả xử lý document local, recent file paths trong local storage, preferences qua Chrome Sync và file handles trong IndexedDB.
- [x] Policy nêu nội dung document không được gửi đến server do Markdown Plus vận hành và không hứa “zero network requests”.
- [ ] Bổ sung ảnh nền custom theme: Blob được giữ trong IndexedDB trên thiết bị, settings đồng bộ chỉ mang descriptor/reference; mô tả cách thay thế/xóa/reset asset.
- [ ] Kiểm tra lại disclosure sau quyết định xử lý Chrome Sync quota.
- [ ] Deploy policy cập nhật, kiểm tra URL công khai và nội dung mới thực sự hiển thị.
- [ ] Điền Privacy practices và single purpose trong Store dashboard nhất quán với policy/runtime; xử lý local không miễn nghĩa vụ disclosure.
- [ ] Rà soát [`privacy-disclosure.md`](./privacy-disclosure.md) theo cách định nghĩa dữ liệu trong form hiện tại; không suy ra “không cần khai báo” chỉ vì không upload lên server của developer.
- [x] Manifest giới hạn activation/host/resources matches về `file:///*`, không còn `<all_urls>`.
- [ ] Nhập justification cho từng permission trong dashboard và đối chiếu manifest của release candidate.
- [x] Popup/Settings có kiểm tra file-scheme access, trạng thái allowed/blocked/unavailable, hướng dẫn bật quyền, nút mở Details và re-check khi focus lại.
- [ ] Kiểm thử onboarding trên clean Chrome profile, với quyền file URL ban đầu đang tắt.
- [ ] Đưa one-time setup vào Store description và xác nhận bộ screenshot trình bày đúng hành vi hiện tại.

Justification cần đối chiếu khi submit:

| Permission | Tính năng sử dụng |
| --- | --- |
| `storage` | Reader/editor/explorer/theme/plugin preferences và recent-file history lưu local riêng. |
| `offscreen` | Đọc local documents và directory listings cho Files explorer. |
| `downloads` | Lưu HTML, Word-compatible và Mermaid image exports; không mô tả Save của editor là download fallback. |
| `file:///*` | Nhận diện Markdown local và đọc supported documents/resources cho Viewer. |

Single-purpose statement gợi ý: “A private local Markdown workspace for reading, navigating, editing, and exporting documents in Chrome.”

Tiêu chí hoàn thành: policy đã deploy, Store disclosures, manifest và runtime không mâu thuẫn; người dùng mới có thể bật file access theo hướng dẫn trong extension.

Nguồn: [Chrome User Data FAQ, gồm dữ liệu chỉ xử lý local](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

### 6. Tạo release candidate cuối cùng bằng release script

Không upload `dist.zip` cũ: manifest nằm dưới thư mục `dist/` và archive chứa metadata `__MACOSX`. Hai ZIP trong `releases/` đã qua kiểm tra cấu trúc/archive/checksum, nhưng chưa phải bản được duyệt để phát hành sau các sửa lỗi P0.

Quy trình chuẩn nằm trong [`docs/releasing.md`](../../docs/releasing.md). `npm run release` kiểm tra version đồng bộ, chạy tests, build production riêng với development `dist/`, tạo ZIP có manifest ở root, kiểm tra archive và xuất SHA-256 cùng `release.json`. Script không tự audit dependency, xác minh Store dashboard hoặc thực hiện Chrome smoke tests.

- [x] Có release script và integration tests cho quy trình đóng gói.
- [x] Đã kiểm tra cấu trúc, archive integrity và checksum của hai artifact hiện có.
- [ ] Hoàn thành P0 mục 1–5, chốt source/version public và ghi release notes trước khi tạo candidate cuối cùng.
- [ ] Dùng `npm ci` trên Node pin rồi chạy release script; không dùng `--skip-tests` cho candidate nếu chưa có kiểm tra tương đương được ghi nhận.
- [ ] Ghi source commit, numeric/display version và trạng thái worktree; review mọi thay đổi local được đóng gói. Script cho phép dirty worktree nên build thành công không chứng minh source đã được chốt.
- [ ] Giải nén chính ZIP candidate sang thư mục riêng và Load unpacked từ thư mục đó trên clean Chrome profile.
- [ ] Kiểm tra manifest, icons, Popup, Settings, offscreen document, lazy chunks, fonts và runtime assets.
- [ ] Hoàn thành manual QA bên dưới và ghi kết quả gắn với ZIP/SHA-256 cụ thể.

```bash
nvm use
npm ci
npm run release
```

Có thể dùng `npm run release -- --bump none` để tạo candidate cùng numeric version với `version_name`/tên ZIP có timestamp. Nếu đã có bản trên Store, update bắt buộc tăng numeric `version`; timestamp không thay thế version bump. Bản phát hành đầu có thể giữ `0.1.0` nếu đó là version public đã chọn. Xem hướng dẫn release để chọn patch/minor/major khi cần.

Tiêu chí hoàn thành: manifest ở root ZIP; đủ icons 16/32/48/128 và runtime assets; không có `.DS_Store`, `__MACOSX`, source-only files hoặc `stats.html`; checksum khớp và chính ZIP cuối cùng đã được kiểm thử.

## P1 — Hoàn thiện vận hành release đầu

### CI và hồ sơ phát hành

Repo hiện có workflow deploy website; chưa có CI test/build cho extension.

- [ ] Thêm CI dùng Node pin, `npm ci`, `npm test` và `npm run build`.
- [ ] Chạy production audit khi chuẩn bị release, lưu kết quả cùng phân tích advisory còn lại; không tự động sửa dependency trong bước kiểm tra.
- [ ] Viết release notes cho version public: tính năng chính, yêu cầu setup, mức Chrome hỗ trợ và known limitations.
- [ ] Ghi kết quả clean install, QA, nền tảng/Chrome version và artifact checksum cho từng candidate.

### Known limitations và Math export

[`document-actions.js`](../../src/viewer/actions/document-actions.js) hiện tham chiếu KaTeX CSS trên jsDelivr trong HTML/Word export. Viewer dùng assets đã bundle, nhưng exported Math có thể cần mạng và liên hệ host bên thứ ba khi mở.

- [x] Privacy policy đã mô tả network behavior này.
- [ ] Ghi limitation rõ trong thông tin export/known limitations trước launch; không hứa toàn bộ Math export hoạt động offline.
- [ ] Kiểm tra export khi online và offline, ghi lại phần hiển thị bị ảnh hưởng.
- [ ] Đối chiếu version stylesheet export với renderer KaTeX sau dependency update.

Việc nhúng đầy đủ CSS/fonts để Math export tự chứa có thể làm sau launch nếu limitation đã được công bố và không trái cam kết sản phẩm.

## Các phần đã có trong runtime — cần regression QA trên candidate

Các mục này không còn là yêu cầu thêm tính năng mới; checkbox dưới đây ghi nhận implementation đã có, không thay thế manual QA.

- [x] Empty/whitespace-only Markdown mount Viewer, có empty state và giữ edit capabilities.
- [x] Editor yêu cầu kết nối file gốc do người dùng chọn, xác minh tên/nội dung và kiểm tra external-change conflict trước Save; không tự fallback sang tải bản sao.
- [x] Plugin import/hook/cleanup failure được cô lập, có warning và tests.
- [x] Reinjection/HMR cleanup và `destroy()` idempotent đã có coverage.
- [x] Document Updates có Ask/Automatic/Off và Change Review; không còn đưa auto-reload cơ bản vào backlog tính năng chưa làm.

## Chrome Web Store listing

### Metadata và nội dung

- [ ] Chọn numeric version public và định vị beta/stable; số version tự nó không chứng minh độ ổn định.
- [ ] Review native manifest descriptions trong các locale để nêu rõ giá trị local Markdown.
- [ ] Hoàn thiện detailed description, category, ngôn ngữ listing và thông tin hỗ trợ.
- [ ] Ghi one-time “Allow access to file URLs” setup và minimum Chrome đã chốt.
- [ ] Mô tả xử lý chính trên thiết bị cùng network/export limitations; không hứa “zero network requests”.
- [ ] Xác nhận support URL/contact email, homepage/source URL và privacy URL trong dashboard.
- [ ] Thêm reviewer test instructions: bật file access, mở local Markdown và thao tác kiểm tra chính.
- [ ] Đối chiếu listing/screenshots với tính năng của ZIP candidate; không coi checklist repo là bằng chứng dashboard đã hoàn tất.

Description ngắn gợi ý: “Read, browse, edit, and export local Markdown files in a private workspace.”

### Graphic assets

Bộ upload đã duyệt nằm tại [`assets/chrome-web-store/`](../../assets/chrome-web-store/); dùng tên file, kích thước và thứ tự trong README của folder đó.

- [x] Store icon 128 × 128 khớp icon đóng gói.
- [x] Năm screenshot 1280 × 800 Editorial Frost đã duyệt.
- [x] Small promo tile 440 × 280 và optional marquee 1400 × 560 đã có.
- [x] Screenshots dùng demo data/path.
- [ ] Xác nhận ảnh còn phản ánh đúng UI/setup sau các sửa lỗi và đã upload vào đúng field Store.

## Manual release QA matrix

Chạy trên clean Chrome profile bằng thư mục giải nén từ **chính ZIP cuối cùng**. Ghi numeric/display version, SHA-256, OS, Chrome version, người kiểm tra và ngày kiểm tra. Tại review 2026-10-29, các mục dưới đây chưa được xác minh trong Chrome; không đánh dấu hoàn thành chỉ từ unit tests/jsdom/build.

### Install, permissions và lifecycle

- [ ] Install khi file access đang off; Popup hướng dẫn đúng và mở được Extension Details.
- [ ] Bật file access, mở lại local Markdown và xác nhận trạng thái Popup/Settings cập nhật.
- [ ] Disable/enable Viewer trong settings trên tab đang mở.
- [ ] Reload extension khi Viewer còn mở; không duplicate UI/listeners hoặc mất đường phục hồi.
- [ ] Browser restart, service-worker cold start và nhiều Viewer tabs cùng hoạt động.

### Documents và navigation

- [ ] `.md`, `.markdown`, `.mdown`, `.mdc` direct activation; empty và whitespace-only Markdown.
- [ ] Unicode, spaces, encoded paths, parent-directory links và Windows file URLs.
- [ ] `.txt`, `.sql`, `.dbml`, `.mermaid`, raster images và SVG từ explorer.
- [ ] Invalid/missing/oversized files có error state rõ ràng.
- [ ] Sibling listing và workspace scan với/không `.gitignore`; progress, cancel, limits và errors.
- [ ] Internal links, heading navigation, Back/Forward và reload restoration.
- [ ] Virtual workspace navigation giữ entry URL và yêu cầu chọn lại workspace khi cần.

### Rendering, security, themes và languages

- [ ] Raw HTML script/event handlers, unsafe URLs, global CSS và fixed-overlay fixtures.
- [ ] Mermaid official/beautiful, invalid syntax, nhiều charts, malicious class/style và CSS imports.
- [ ] Shiki languages chính; KaTeX, footnote, emoji, GitHub Alerts và color preview on/off.
- [ ] Light/dark/custom themes, syntax-theme preview và live settings updates.
- [ ] Custom theme image upload/replace/delete/reset, missing asset và giới hạn dung lượng.
- [ ] Custom themes/settings save và import sát quota, Unicode names và lỗi storage; kiểm tra lại sau reload.
- [ ] English, Vietnamese, Simplified Chinese, browser-language fallback và live language switching.
- [ ] Narrow layouts, keyboard/focus, reduced motion và lightbox/resolution controls.

### Editor, document updates và change review

- [ ] Enter/exit Edit, kết nối file gốc, permission denied/cancel, tên/nội dung không khớp.
- [ ] Dirty-state confirmation, Ctrl/Cmd+S, Save và conflict khi file đổi ngoài editor.
- [ ] Save thất bại không mất draft, không âm thầm ghi đè hoặc tải bản sao.
- [ ] Search/replace, focus/split modes, scroll sync và draft/undo khi đổi settings/language.
- [ ] Ask/Automatic/Off, pending update, stable-change detection và giữ reading position.
- [ ] Watch không ghi đè dirty draft hoặc chạy sai khi Save đang diễn ra.
- [ ] Change Review: pinned comparison, Review latest, diff limits/fallback, section navigation và keyboard/modal behavior.

### Export và print

- [ ] Print các document formats có capability.
- [ ] HTML và Word export; không lẫn Viewer controls hoặc nội dung soạn dở ngoài chính sách export.
- [ ] Mermaid SVG và PNG 1x–4x.
- [ ] Export online/offline; Math limitation khớp disclosure.
- [ ] Double-click export và export errors không tạo trạng thái hỏng hoặc tác vụ ngoài ý muốn.

### Compatibility và performance

- [ ] Latest stable Chrome trên macOS.
- [ ] Latest stable Chrome trên Windows, đặc biệt file URL/path handling và Save.
- [ ] Phiên bản Chrome tối thiểu đã chốt sau compatibility audit.
- [ ] Cold-start, Markdown lớn/nhiều code blocks và máy cấu hình thấp hoặc CPU throttling không có blocker rõ ràng.

## Release gate cuối cùng

Chỉ submit khi tất cả điều kiện sau đạt trên candidate cuối cùng:

- [ ] Dependency audit mới không còn advisory chưa được đánh giá; lỗi Markdown DoS đã được vá.
- [ ] HTML sanitizer fail-closed; CSS isolation được xử lý và có DOM/browser security coverage.
- [ ] Settings/custom themes xử lý đúng quota thực tế; save/import/error/reload không mất dữ liệu.
- [ ] Minimum Chrome, build target và runtime tương thích đã được xác minh.
- [ ] Manifest giữ permissions cần thiết; justification/dashboard disclosures hoàn chỉnh.
- [ ] File-access onboarding pass trên clean Chrome profile.
- [ ] Privacy policy cập nhật đã deploy và khớp storage/network behavior.
- [ ] Clean install, full tests và production build pass sau các sửa lỗi.
- [ ] Manual QA trên chính ZIP cuối cùng không còn blocker; có kết quả OS/Chrome version và checksum.
- [ ] ZIP đúng cấu trúc, integrity/SHA-256 hợp lệ, runtime assets đầy đủ.
- [ ] Numeric/display version, release notes, source commit và mọi thay đổi được đóng gói đã được ghi lại.
- [ ] Listing, Store assets, support/contact và reviewer instructions hoàn tất.

## Backlog sau launch

Không mở rộng scope release đầu bằng các tính năng này trong khi P0 còn chưa xong:

- Làm Math export tự chứa CSS/fonts để hoạt động offline đầy đủ.
- Profile cold-start, Markdown 1 MB/5 MB/nhiều fenced blocks và chunk lớn nhất trước khi tối ưu bundle; cân nhắc warning/limit cho Markdown cực lớn theo kết quả.
- Đánh giá bounded concurrency, throttle progress và allocations trong workspace scanning dựa trên đo đạc.
- Giảm settings broadcasts tới tab không liên quan và bổ sung export in-flight guard nếu QA/profile cho thấy cần thiết.
- Workspace filename/content search, thêm theme hoặc Markdown extensions.
- Remote raw Markdown URLs chỉ sau review riêng về permissions/privacy và thiết kế.
