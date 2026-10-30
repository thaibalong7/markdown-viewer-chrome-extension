# Chrome Web Store Release Checklist

Tài liệu này theo dõi các việc cần hoàn thành trước khi phát hành Markdown Plus lên Chrome Web Store. Cập nhật theo review ngày **2026-10-29**: nền tảng và quy trình đóng gói đã khá đầy đủ, nhưng **chưa nên submit bản hiện tại** vì còn vấn đề dependency, sanitizer, Chrome Sync quota và tương thích Chrome. Ưu tiên xử lý P0 trước khi thêm tính năng lớn.

Cập nhật sau xử lý mục 1 ngày **2026-10-29**: đã vá Markdown DoS và các advisory DOMPurify, clean install/tests/build/browser dependency smoke pass. Production audit còn 3 low từ một advisory KaTeX đã được đánh giá và chấp nhận có điều kiện tại mục 1. Bảng review ban đầu bên dưới được giữ làm baseline; P0 mục 2–5 và QA trên ZIP candidate vẫn chưa hoàn tất.

Cập nhật sau xử lý mục 2 ngày **2026-10-29**: HTML sanitizer fail-closed, CSS HTML/SVG đã bị giới hạn và có DOM/browser security coverage; chi tiết implementation, kết quả và cách chạy lại nằm ở mục 2. P0 mục 3–5 và manual QA trên ZIP candidate vẫn chưa hoàn tất.

Cập nhật sau triển khai mục 3 ngày **2026-10-30**: settings dùng index nhỏ và các theme records trong Chrome Sync, có byte budgeting, migration/cache và lỗi quota rõ ràng. Regression trên Chrome Storage thật và sau restart đã pass; kết quả cùng giới hạn kiểm chứng nằm ở mục 3. Mục 4–5, kiểm tra Sync giữa hai profile và manual QA trên ZIP candidate vẫn còn mở.

Các nhận xét về cấu hình sanitizer/Math trong hồ sơ mục 1 phản ánh snapshot trước thay đổi mục 2; dùng mục 2 và runtime source để đối chiếu chính sách hiện tại.

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

Đã thực hiện ngày **2026-10-29**, dùng Node `20.19.5` / npm `10.8.2`. Lockfile hiện dùng `markdown-it@14.3.3`, `dompurify@3.4.17`, `katex@0.16.47`, `mermaid@11.17.2` và `@mdit/plugin-katex@0.25.2`; dependency gián tiếp `@ungap/structured-clone` được nâng từ `1.3.0` lên `1.4.0` trong dải `^1.0.0` của `mdast-util-to-hast` qua Shiki để xử lý cảnh báo CWE-502 khi clean install. CSS KaTeX của HTML/Word export được đồng bộ từ CDN `0.16.44` lên `0.16.47`. Kết quả dưới đây gắn với worktree đã kiểm tra; cần audit lại sau thay đổi dependency và trên candidate cuối cùng.

| Package/chuỗi dependency | Đánh giá sau cập nhật | Quyết định |
| --- | --- | --- |
| `markdown-it@14.3.3` | Đã vá cả link reference nhiều dòng và inline HTML DoS; cả hai đường đều có thể tới parser của extension ở bản cũ. | Giữ nhánh 14, nâng minimum lên bản vá. |
| `dompurify@3.4.17` | Không còn trong production audit. Các advisory cũ cần `IN_PLACE`, template/DOM output hoặc XHTML/SMIL mà hai sanitizer hiện tại không bật. | Đã vá; không coi việc nâng thư viện là hoàn tất CSS isolation/fail-closed ở mục 2. |
| `katex@0.16.47` qua `mermaid@11.17.2` và `@mdit/plugin-katex@0.25.2` | Còn một advisory low cần prototype pollution từ trước; npm đếm ba package cùng chuỗi. HTML/SVG có sanitizer độc lập, chưa chứng minh exploit trong extension; chưa audit toàn ứng dụng về prototype pollution. | Chấp nhận có điều kiện như phân tích dưới đây; bản vá `0.18.2` ngoài dải hỗ trợ của cả hai package cha. Đánh giá lại trước submit và khi upstream có bản tương thích; không downgrade Mermaid/ép override chỉ để audit xanh. |

Advisory còn lại là [GHSA-238p-pmpm-9mq7](https://github.com/KaTeX/KaTeX/security/advisories/GHSA-238p-pmpm-9mq7), ảnh hưởng KaTeX `>=0.11.0 <0.18.2`. Attacker phải pollute `Object.prototype` hoặc ảnh hưởng prototype của renderer options từ trước rồi cung cấp biểu thức Math; KaTeX không tự tạo pollution. Inherited settings có thể đổi `trust`, namespace hoặc giới hạn render; theo upstream, XSS/resource injection còn phụ thuộc việc chèn output không có sanitizer độc lập. Ba package npm báo low là `katex@0.16.47`, `@mdit/plugin-katex@0.25.2` và `mermaid@11.17.2`, dùng chung một bản KaTeX dedupe.

Đường runtime: `math.plugin.js` → plugin KaTeX → HTML/MathML → `renderDocument()` → `sanitizeHtml()` → article; Mermaid official đi qua `mermaid-render-service.js` → `sanitizeMermaidSvg()` → SVG. Options Math do code kiểm soát (`throwOnError: false`, `mathFence: true`), không lấy renderer options từ JSON của document, nhưng không đặt explicit `trust: false` nên default trust không đủ chống inherited properties. Mermaid official dùng `securityLevel: 'strict'`, `htmlLabels: false`; beautiful dùng renderer riêng. Chưa chứng minh exploit trong các đường gọi đã rà soát, nhưng tests và sanitizer không chứng minh mọi biến thể pollution đều an toàn. CSS isolation/fail-closed vẫn là blocker ở mục 2.

Quyết định chấp nhận low có điều kiện cho vòng chuẩn bị release này: plugin hiện yêu cầu KaTeX `^0.16.44`, Mermaid yêu cầu `^0.16.47`, nên bản vá `0.18.2` nằm ngoài cả hai dải. Npm đề xuất nâng plugin lên `1.1.4` hoặc downgrade Mermaid xuống `10.8.0`; nâng riêng plugin vẫn để lại KaTeX cũ qua Mermaid. Đánh giá lại trước submit, khi cấu hình/advisory thay đổi hoặc upstream có bản tương thích/backport. Nếu tìm thấy prototype pollution có thể tới realm render, phải vá nguồn pollution hoặc nâng renderer tương thích trước release; quyết định này không miễn hoàn thành mục 2.

- [x] Cập nhật dependency và `package-lock.json` có chủ đích; không chạy `npm audit fix --force` máy móc hoặc downgrade Mermaid chỉ theo gợi ý tự động.
- [x] Với mỗi advisory còn lại, ghi package/version, điều kiện khai thác, đường runtime liên quan và quyết định xử lý/chấp nhận cùng lý do.
- [x] Chạy clean install bằng Node pin và kiểm tra cảnh báo engine/dependency: `npm ci` pass, không `EBADENGINE`; chỉ còn deprecated `whatwg-encoding` trong jsdom dev/test.
- [x] Chạy lại full tests (185 files, 1.380 tests), production build, size report và production audit sau cập nhật. Audit còn 3 low đã đánh giá, exit code 1; không còn high/critical. JS tăng 2.843 bytes, chunk lớn nhất không đổi.
- [x] Smoke-test Markdown, Shiki, Mermaid official/beautiful, Math và HTML/Word/SVG/PNG export bằng module runtime thật trong Chrome 156 trên macOS qua localhost. Kiểm tra extension/`chrome.downloads` từ ZIP candidate trên clean profile vẫn thuộc manual release QA.

Chi tiết xác minh: `npm ci --no-audit --no-fund` cài 366 packages; `npm ls` các dependency liên quan không có invalid/extraneous. Ba integration tests mới dùng renderer/Shiki/KaTeX/DOMPurify thật, chỉ mock download boundary. Production build vẫn có cảnh báo CRXJS Rollup/Rolldown và chunk >500 kB như baseline. `size:report` giữ 12 MB `dist` / 11 MB JS theo `du`; JS chính xác tăng 11.188.490 → 11.191.333 bytes (~0,025%), chunk lớn nhất giữ 1.525.521 bytes. Production audit không còn critical/high/moderate; exit code 1 phản ánh 3 low đã đánh giá, không phải zero-vulnerability pass.

Browser smoke có 16 assertions pass: Unicode/duplicate heading IDs, local links chứa space, Shiki colors, inline/display Math và MathML, loại script/event handler; HTML/Word giữ Math/Shiki và CSS đúng version; cả hai renderer Mermaid tạo flowchart/state diagram, serialize SVG và tạo PNG 2x khác rỗng. Math-label input trong Mermaid hiện hiển thị literal, chưa kiểm chứng typesetting Math ở Mermaid. Harness dùng module runtime qua Vite và bắt Blob tại anchor download, không thay settings extension. Chưa xác minh ZIP trên clean profile, `chrome.downloads`, Chrome minimum, Word desktop, offline fonts hoặc toàn bộ scale export 1x–4x.

```bash
nvm use
npm ci
npm audit --omit=dev
npm test
npm run build
npm run size:report
```

Tiêu chí hoàn thành: không còn advisory runtime chưa được đánh giá; lỗi Markdown gây treo tab đã được vá; advisory được chấp nhận phải có phân tích cụ thể, không dựa riêng vào việc tests pass hoặc package đã từng được cập nhật.

Nguồn đã đối chiếu: [markdown-it link-reference DoS](https://github.com/markdown-it/markdown-it/security/advisories/GHSA-gfr2-rv44-r23c), [markdown-it inline-HTML DoS](https://github.com/markdown-it/markdown-it/security/advisories/GHSA-vfgh-jcmw-g37q); DOMPurify [hook gỡ node](https://github.com/cure53/DOMPurify/security/advisories/GHSA-p98j-92pf-mc4p), [rawtext root](https://github.com/cure53/DOMPurify/security/advisories/GHSA-6688-9rhm-gjv2), [SAFE_FOR_TEMPLATES](https://github.com/cure53/DOMPurify/security/advisories/GHSA-cg2g-xh64-v4q7), [hook gỡ parent/sibling](https://github.com/cure53/DOMPurify/security/advisories/GHSA-mrv2-3pqr-j5jr), [XHTML/SMIL](https://github.com/cure53/DOMPurify/security/advisories/GHSA-c6gr-qvv4-5v3f). Hai sanitizer nhận/trả chuỗi, không dùng các mode `IN_PLACE`, template/DOM output hoặc XHTML/SMIL liên quan; hook HTML chỉ sửa thuộc tính link. DOMPurify đã được nâng bản vá dù chưa chứng minh các exploit này trong cấu hình hiện tại.

### 2. Siết sanitizer và bổ sung DOM security tests

Source liên quan: [`renderer.js`](../../src/viewer/core/renderer.js), [`content-css.js`](../../src/viewer/core/content-css.js), [`math.plugin.js`](../../src/plugins/optional/math.plugin.js), [`mermaid-sanitizer.js`](../../src/viewer/mermaid/mermaid-sanitizer.js) và [`mermaid-render-service.js`](../../src/viewer/mermaid/mermaid-render-service.js).

Vấn đề trước khi sửa: `sanitizeHtml()` trả nguyên HTML khi thiếu purifier; raw `<style>`, inline overlay styles và global CSS trong SVG còn được giữ, trong đó có dạng `@import "https://…"`. Đây là vấn đề đã tái hiện tại sanitizer boundary, không phải bằng chứng thực thi JavaScript qua mọi đầu vào Mermaid.

Implementation hiện tại trả rỗng khi DOMPurify không khả dụng/không hỗ trợ DOM; chặn stylesheet HTML, chỉ giữ CSS cosmetic cho raw HTML và bỏ các class có thể mượn style Viewer chrome. KaTeX dùng `trust: false` và marker nội bộ chỉ cho output Math do renderer tạo để giữ bounded geometry; marker bị xóa trước khi xuất HTML. Shiki giữ syntax colors.

SVG được DOMPurify parse thành fragment inert rồi lọc CSS bằng AST allowlist: bỏ mọi at-rule, URL không phải fragment nội bộ, thuộc tính positioning/resource loading và selector không hỗ trợ; giới hạn mọi selector còn lại trong SVG tương ứng, namespace IDs cùng local/ARIA references và clip nội dung vào viewport diagram. Official Mermaid khóa document override của `themeCSS`, fonts, theme variables và security options ở giai đoạn đo layout trước sanitizer. Custom stylesheet/positioning từ document không còn là tính năng được hỗ trợ.

- [x] Đổi HTML sanitizer thành fail-closed: báo lỗi an toàn hoặc trả nội dung an toàn khi purifier không khả dụng, không trả nguyên HTML đầu vào.
- [x] Chặn stylesheet từ raw HTML không tin cậy và giới hạn inline style có thể tạo overlay/che UI; bảo toàn style cần thiết của Shiki và KaTeX.
- [x] Kiểm soát CSS trong SVG Mermaid, gồm selector ảnh hưởng ngoài diagram, `@import` và URL từ xa; không dựa vào hai regex hiện tại như một CSS sanitizer hoàn chỉnh.
- [x] Thêm tests chạy sanitizer thật trong jsdom hoặc browser, không mock purifier/sanitizer tại security boundary.
- [x] Test `<script>`, inline event handlers, `javascript:`, unsafe `data:` và malicious SVG.
- [x] Test global `<style>`, inline fixed overlay, CSS remote resources và cả dạng `@import url(...)` lẫn `@import "..."`.
- [x] Test Mermaid `classDef`, state diagram và CSS injection regression qua đường render thực tế.
- [x] Test Shiki colors, KaTeX HTML/MathML và diagram hợp lệ vẫn render sau khi siết sanitizer.
- [x] Kiểm tra fixtures trong Chrome, gồm việc document không thể ẩn/che Viewer chrome bằng CSS đã bị cấm.

DOM coverage dùng DOMPurify thật ở [`renderer.security.test.js`](../../src/viewer/core/__tests__/renderer.security.test.js) và [`mermaid-sanitizer.security.test.js`](../../src/viewer/mermaid/__tests__/mermaid-sanitizer.security.test.js), cùng Node fail-closed coverage ở [`sanitizer-unavailable.test.js`](../../src/viewer/core/__tests__/sanitizer-unavailable.test.js). Các renderer tests liên quan đã chuyển sang jsdom để không vô tình dựa vào fallback không sanitize. Render-service unit tests vẫn mock dependency cho lifecycle; browser fixture dưới đây kiểm tra đường renderer/sanitizer thật.

Xác minh trên Node pin `20.19.5`: `npm test` pass **188 files / 1.403 tests**; production build pass, vẫn có cảnh báo CRXJS Rollup/Rolldown và chunks >500 kB đã có trước. `size:report` giữ 12 MB `dist` / 11 MB JS theo `du`; JS chính xác tăng 11.191.333 → 11.276.791 bytes (+85.458 bytes, khoảng 0,76%), chunk lớn nhất giữ 1.525.521 bytes. Thêm `css-tree@3.2.1` cho parser/generator/walker, không bundle toàn bộ CSS grammar lexer; nâng transitive `source-map-js` 1.2.1 → 1.2.2 để vá advisory DoS khi dependency này trở thành production dependency. `npm audit --omit=dev` sau cùng còn đúng 3 low KaTeX đã đánh giá tại mục 1, không high/critical/moderate; audit exit code 1 do các low còn lại.

Browser fixture [`sanitizer-security.html`](../../test/browser/sanitizer-security.html) pass **38 assertions trên Chrome 156.0.0.0 / macOS**: CSS không ẩn/che control sentinel nằm ngoài article/diagram, scoped SVG CSS vẫn áp dụng bên trong, Shiki/KaTeX còn màu/MathML/geometry, flowchart/state/classDef hợp lệ của cả official và beautiful vẫn render, SVG/PNG export pass; negative CSS/remote classDef được lọc hoặc từ chối an toàn. Fixture không ghi nhận resource fetch từ CSS bị cấm. Chạy lại bằng `source ~/.nvm/nvm.sh && nvm use && node scripts/security-smoke.mjs`, rồi mở URL localhost được in ra. Harness dùng module runtime và CSS Viewer thật, bắt download ở anchor boundary; đây chưa phải chứng nhận extension/Chrome minimum/ZIP candidate, và không thay thế manual release QA cuối cùng.

Tiêu chí hoàn thành: test fail nếu sanitizer bị bypass/không khởi tạo; document không điều khiển CSS ngoài phạm vi được cho phép; script/event handler/unsafe URL bị loại bỏ và nội dung hợp lệ vẫn hiển thị đúng.

### 3. Sửa Chrome Sync quota cho custom themes

Đã triển khai ngày **2026-10-30** theo [hồ sơ xử lý Sync quota](./sync-quota-plan.md). [`settings-storage-format.js`](../../src/settings/settings-storage-format.js) tách index `mdViewer.settings.index.v1` và theme records `mdViewer.theme.<sha256>`, kiểm tra refs/hash, byte/item, tổng bytes và số items. [`settings-storage.js`](../../src/settings/settings-storage.js) giữ current/previous refs, migrate legacy sau commit/readback, cache snapshot hoàn chỉnh ở local và chặn save/reset dựa trên dữ liệu sync còn thiếu. Không tự fallback khi quota/throttling; chỉ dùng local backend nếu API sync không tồn tại. Public settings/export schema vẫn version 2; ảnh nền tiếp tục ở IndexedDB.

Lỗi baseline: trước thay đổi, [`settings-service.js`](../../src/settings/settings-service.js) ghi toàn bộ settings trong key `mdViewer.settings`; library hợp lệ vượt 8 KB trước giới hạn 32 themes, khiến cả partial saves khác thất bại. Key cũ nay chỉ là nguồn legacy đến lần commit format mới đầu tiên thành công.

- [x] Chọn cách lưu settings/themes phù hợp: giữ Sync, tách index và theme records có giới hạn dung lượng.
- [x] Tính cả JSON, UTF-8, key/envelope, escaping Chromium và dự phòng số trước save/import; tính cả legacy/orphan/foreign items đang chiếm dung lượng.
- [x] Quota/throttling có thông báo đã dịch; không báo thành công trước persistence. Cache/cleanup/notification lỗi sau commit không báo lỗi save giả hoặc rollback ảnh đã được dùng.
- [x] Không fallback sau lỗi sync; local backend khi API không tồn tại và verified local cache có vai trò riêng, đã mô tả trong docs/privacy.
- [x] Tests sát 8.192 byte, tổng 102.400 byte, 512 items, 32 themes Unicode/background, import/update/delete/reset, migration/reload, incomplete sync, mutation queue và image cleanup.
- [x] Cập nhật architecture/theme docs, privacy disclosure và source public policy. Chưa deploy public policy trong task này.
- [ ] Release QA: hai Chrome profile đăng nhập cùng tài khoản với Sync bật; kiểm tra truyền settings/theme refs, thay đổi đồng thời, image fallback và UI trên ZIP candidate. Mock concurrency và Chrome storage local-profile không thay thế bước này.

Project checks sau Chrome UI QA ngày **2026-10-30**, Node `20.19.5`: `npm test` pass **194 files / 1.449 tests**; `npm run build` pass. Build vẫn có cảnh báo CRXJS Rollup/Rolldown và chunks lớn như baseline; không thay đổi dependency hoặc manifest trong mục này.

Browser regression [`settings-storage.html`](../../test/browser/settings-storage.html) chạy runtime modules thật trong một extension/profile thử nghiệm riêng, trên **Chrome 156.0.0.0 / macOS**: **50 assertions storage + 1 assertion sau đóng/mở lại Chrome** pass. Chrome chấp nhận item 8.191/8.192 B, reject 8.193 B; estimator bao phủ Unicode/escaping và số trong fixture; 32 theme với tên CJK/ID/image descriptors dài dùng **35.761 B tổng**, index **3.793 B**. Save/import/error/update/delete/reset, legacy migration và restart giữ settings đúng. Chạy lại bằng `source ~/.nvm/nvm.sh && nvm use && node scripts/settings-storage-smoke.mjs` (có thể đặt `CHROME_BIN`); runner không sử dụng profile hoặc extension đang cài của người dùng. Đây chưa phải smoke toàn bộ extension/Chrome minimum/ZIP candidate hoặc xác minh Sync qua mạng.

Packaged UI QA bằng runner tạm đã kiểm tra bản build `dist/` đầy đủ trong profile riêng trên **Chrome 156.0.8078.74 / macOS**, **22 assertions pass**: Theme Studio tạo theme Unicode với ảnh PNG thực, Viewer decode ảnh sau bật file access qua Chrome UI, Popup nhận theme; đầy Sync giữ draft/settings/ảnh cũ, retry thay ảnh và retire ảnh cũ đúng; import 32 themes, partial save qua Popup cập nhật Viewer, reload Options và terminate/restart MV3 worker vẫn giữ library; xóa active theme chọn fallback; snapshot thiếu hiển thị warning, chặn ghi và phục hồi; export JSON tải xuống đầy đủ, reset library/IndexedDB và không có uncaught exceptions ở các surface được kiểm tra. Runner và helper Chrome tạm đã được gỡ sau QA; giữ kết quả này cùng các regression tests Vitest trong repo. Đây là smoke unpacked build, chưa phải clean ZIP hoặc hai profile có Google Sync.

Chrome UI QA đã phát hiện và sửa lỗi native form validation trong [`ThemeBackgroundFields.jsx`](../../src/options/sections/ThemeBackgroundFields.jsx): dimming mặc định `0.08` không khớp `step=0.05`, nên Chrome chặn submit khi dùng solid/image/gradient background mà không gọi save handler. Dimming và angle nay dùng `step="any"` đúng schema; ba regression cases solid/image/default dimming và gradient có angle/opacity thập phân fail trước fix, pass sau fix. Luồng tạo/lưu ảnh trong Chrome đã được chạy lại thành công sau sửa.

Tiêu chí phần persistence: cấu hình UI/schema lưu được theo budget hoặc bị từ chối rõ trước khi ghi khi có thể; lỗi API thật vẫn giữ bản đã lưu. Snapshot thiếu không làm mất library hoặc tự ghi defaults; không coi `sync.set()` resolve là xác nhận thiết bị khác đã nhận đủ dữ liệu. Mục release QA phía trên vẫn phải hoàn thành trước submit.

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
- [x] Đối chiếu version stylesheet export với renderer KaTeX sau dependency update: cùng `0.16.47`, có integration tests HTML/Word để phát hiện lệch version.

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
