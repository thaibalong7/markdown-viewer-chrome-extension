# Đánh giá vấn đề hiệu năng - Markdown Plus Extension

Ngày kiểm tra: 2026-03-30  
Phạm vi: `src/**` (kèm `manifest.json`, `vite.config.mjs` để lấy bối cảnh runtime)

## Tổng quan

Rủi ro lớn nhất về hiệu năng hiện tại tập trung ở:

1. Content script khởi động chạy trên mọi trang, có nhiều việc nặng xảy ra quá sớm.
2. Lượng extract markdown và render toàn bộ tài liệu có thể tạo spike CPU/RAM trên trang lớn.
3. Scroll spy tính toán active heading theo cách O(N) mỗi lần cập nhật khi scroll.

---

## Danh sách issue theo mức độ ưu tiên

## Issue #1 [HIGH] Chuỗi CSS viewer nằm trong bundle content script (mọi trang)

- **Vị trí:** `src/content/index.js` (import `../viewer/styles/*.scss?inline`)
- **Hiện trạng (cập nhật):** Không còn `fetch` nhiều file CSS; Vite biên dịch SCSS và gộp vào bundle content script. Vẫn: mỗi lần content script chạy trên `<all_urls>`, engine parse/eval bundle (kèm chuỗi CSS lớn) trước khi biết có phải markdown hay không.
- **Tác động CPU/RAM:** Bỏ được I/O fetch runtime; vẫn có chi phí parse JS + giữ chuỗi style trong memory trên trang không mount viewer.
- **Khuyến nghị fix tiếp:**
  - `import()` động sau khi detect markdown thành công (code-split chunk chứa SCSS `?inline`).
  - Hoặc tách nhánh “light” detect trước, chỉ load viewer khi cần.

## Issue #2 [HIGH] Trích xuất `innerText` toàn trang có thể rất nặng

- **Vị trí:** `src/content/raw-content-extractor.js` (`extractRawMarkdown()`)
- **Trạng thái:** Đã fix (2026-03-30)
- **Hiện trạng (cũ):** Ở full mode, lấy nội dung bằng `body.innerText`.
- **Đã triển khai:** Chuyển full mode sang TreeWalker có hard cap (`FULL_MAX_CHARS = 500_000`) và thêm warning khi bị truncate.
- **Tác động CPU/RAM:** `innerText` có thể kích hoạt work liên quan layout/style và tạo chuỗi rất lớn trên tài liệu dài. Sau đó chuỗi tiếp tục bị normalize/parse/sanitize, làm tăng peak RAM và GC pressure.
- **Khuyến nghị fix:**
  - Chuyển sang extraction theo chunk/TreeWalker và có giới hạn kích thước.
  - Cân nhắc dùng `textContent` nếu chấp nhận được khả năng khác biệt format.
  - Đặt hard cap kích thước markdown input + thông báo truncate.

## Issue #3 [MEDIUM-HIGH] Scroll spy O(N headings) với các lần đọc layout liên tục

- **Vị trí:** `src/viewer/core/scroll-spy.js` (`computeActiveId()`)
- **Hiện trạng:** Mỗi lần update khi scroll đều duyệt toàn bộ headings và gọi `getBoundingClientRect()`.
- **Tác động CPU:** Truy vấn layout lặp lại trên nhiều heading có thể gây drop frame, tăng CPU rõ rệt trên tài liệu lớn.
- **Khuyến nghị fix:**
  - Ưu tiên `IntersectionObserver` để xác định active heading.
  - Hoặc precompute offsets + binary search, cập nhật lại khi resize/content thay đổi.

## Issue #4 [MEDIUM] Regex scan lặp lại trên sample text lớn

- **Vị trí:** `src/content/page-detector.js`, `src/content/bootstrap.js`
- **Hiện trạng:** Nhiều regex pass trên mẫu text lớn (20k-50k) trong detect/fallback.
- **Tác động CPU:** Tăng chi phí startup, đặc biệt do content script chạy rộng.
- **Khuyến nghị fix:**
  - Gom heuristic thành single-pass scoring.
  - Tái sử dụng kết quả detect thay vì scan lại cùng dữ liệu.

## Issue #5 [MEDIUM] Full rerender khi cập nhật settings

- **Vị trí:** `src/viewer/app.js` (`updateSettings()` -> `render()`)
- **Hiện trạng:** Mỗi lần settings update đều parse markdown + sanitize + gán lại `innerHTML`.
- **Tác động CPU/RAM:** Tài liệu lớn dễ bị jank khi đổi setting giao diện.
- **Khuyến nghị fix:**
  - Tách `style-only settings` (chỉ update CSS/DOM).
  - Chỉ full rerender khi setting ảnh hưởng đến nội dung parse/render.
  - Có thể cache rendered HTML nếu markdown và parser-options không đổi.

## Issue #6 [LOW-MEDIUM] TOC click listeners tăng theo số heading

- **Vị trí:** `src/viewer/actions/rebuild-toc.js`
- **Hiện trạng:** Gắn listener riêng cho mỗi link TOC.
- **Tác động RAM/CPU:** Số closure/listener tăng theo kích thước document.
- **Khuyến nghị fix:** Dùng event delegation trên TOC container.

## Issue #7 [LOW] Chuỗi copy churn trong normalize pipeline

- **Vị trí:** `src/content/raw-content-extractor.js` (`normalizeMarkdown()`)
- **Hiện trạng:** Chained `replace()` trên chuỗi lớn.
- **Tác động RAM:** Tạo nhiều bản sao tạm thời.
- **Khuyến nghị fix:** Giữ giới hạn input, chỉ normalize khi cần.

## Issue #8 [LOW] Ghi log payload settings đầy đủ

- **Vị trí:** `src/settings/settings.service.js`
- **Hiện trạng:** Có log object settings lớn.
- **Tác động:** Overhead console/serialization khi debug.
- **Khuyến nghị fix:** Log metadata gọn (keys changed) thay vì full payload.

---

## Quick wins nên làm trước

1. Fix Issue #1: Cân nhắc defer / dynamic import chunk chứa viewer CSS sau detect markdown.
2. Fix Issue #2: Thêm giới hạn kích thước extraction trong `extractRawMarkdown`.
3. Fix Issue #5: Tối ưu `updateSettings` để tránh full rerender với style-only changes.
4. Fix Issue #6: Chuyển TOC click handler sang event delegation.

## Deeper refactors để đạt hiệu quả bền vững

1. Thay scroll-spy bằng `IntersectionObserver`.
2. Hợp nhất pipeline detect/extract để giảm scan lặp lại.
3. Cân nhắc incremental/lazy rendering cho markdown rất lớn.

---

## Đề xuất theo dõi sau khi fix

- Đo thời gian startup content script trên trang không phải markdown.
- Đo FPS/CPU khi scroll tài liệu có >200 headings.
- So sánh peak heap trước/sau với tài liệu markdown rất lớn.
- Theo dõi số lần rerender toàn bộ document khi đổi settings UI.
