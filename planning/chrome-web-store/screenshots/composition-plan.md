# Kế hoạch 5 ảnh giới thiệu Chrome Web Store

## Mục tiêu

Mỗi ảnh Store là một **feature composition**, không bắt buộc chỉ chứa một screenshot. Một screenshot chính kể câu chuyện trung tâm; các screenshot phụ được crop thành card và xếp lệch hoặc chồng nhẹ để cho thấy các trạng thái liên quan.

Nguyên tắc chung:

- Kích thước cuối: 1280×800 PNG.
- Một điểm nhấn chính chiếm khoảng 65–75% diện tích.
- Các card phụ chỉ bổ sung ngữ cảnh, không cạnh tranh với nội dung chính.
- Dùng cùng hệ viền, bo góc, bóng đổ và khoảng cách trên cả năm ảnh.
- Nhãn của mỗi khung nằm ngoài ảnh, cách mép trên 4 px và thẳng hàng với inset trái 16 px; chữ được căn giữa quang học trong cùng một hệ pill để không che nội dung screenshot.
- Chỉ hiển thị Chrome toolbar khi cần chứng minh đây là file local; mọi path đưa vào artwork phải được thay bằng path demo, không chứa dữ liệu cá nhân.
- Chừa vùng thoáng cho headline/copy khi thiết kế artwork hoàn chỉnh.

## Năm composition

### 1. Open local Markdown right in Chrome

Ảnh chính: Viewer light theme với Files và Outline, giữ lại browser chrome và path demo để làm rõ luồng `local file → browser reading view`.

Card phụ:

- Chế độ tập trung khi ẩn cả hai sidebar, vẫn là cùng file.

Artifact: `final/01-open-local-markdown.png`.

### 2. A theme for every focus mode

Ba viewer dùng cùng một đoạn tài liệu được xếp chồng: Aurora Studio làm ảnh chính, Light và Dark là hai card so sánh. Crop đồng nhất và tập trung vào code + Mermaid để chỉ màu sắc thay đổi, không thay nội dung.

Artifact: `final/02-themes-for-focus.png`.

### 3. Rich Markdown, ready out of the box

Ảnh chính: tài liệu có Math, syntax-highlighted code và Mermaid.

Card phụ:

- Popup Plugins ở phần task list, table, emoji và footnotes.
- Popup Plugins ở phần Math và Mermaid renderers.

Artifact: `final/03-rich-markdown.png`.

### 4. Preview, zoom, and export visuals

Ảnh chính: Mermaid zoom view.

Card phụ:

- Mermaid export SVG/PNG.
- Image lightbox.

Artifact: `final/04-preview-zoom-export.png`.

### 5. Make the workspace yours

Ảnh chính: Theme Studio với live preview.

Card phụ:

- Popup Reader controls.
- General Settings ở vùng local file access.

Artifact: `final/05-make-it-yours.png`.

## Trạng thái bộ ảnh

Năm composition Editorial Frost đã được duyệt và lưu trong `final/`. Repository chỉ version các artifact cuối cùng và demo workspace; raw captures, design explorations và generated intermediates không thuộc change set phát hành.

Checklist chất lượng đã áp dụng:

- Chụp Retina và crop từ cửa sổ Chrome thay vì phóng to ảnh cũ.
- Không có con trỏ, glow focus hoặc tooltip che nội dung.
- Popup dọc giữ đúng tỉ lệ; browser screenshot dùng viewBox riêng theo từng card.
- Menu Mermaid export hiển thị trọn các lựa chọn SVG/PNG.
- Path trong artwork được thay bằng path demo `/Users/you/Documents/...`.
