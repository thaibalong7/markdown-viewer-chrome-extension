# Quy ước bản dịch tiếng Việt

Bản dịch trong `src/i18n/locales/vi.json` được rà soát theo ngữ cảnh sử dụng ở Cài đặt, bảng tiện ích, trình xem, trình soạn thảo, cây thư mục, phần so sánh thay đổi, Git, màu sắc, ảnh và sơ đồ. Cả nhãn, mô tả, tooltip, thông báo cho trình đọc màn hình, trạng thái tải và lỗi đều cần đọc tự nhiên khi xuất hiện cùng nhau. Key phân cấp giữ nguyên khi sửa câu chữ.

Tài liệu này giữ các lựa chọn biên tập riêng của tiếng Việt. Cơ chế kỹ thuật nằm trong [Interface languages](./internationalization.md); quy trình thêm một ngôn ngữ và rà soát toàn bộ bản dịch nằm trong skill [mdp-dev-add-language](../.agents/skills/mdp-dev-add-language/SKILL.md). Không áp nguyên thuật ngữ tiếng Việt cho ngôn ngữ khác; cần tham khảo cách dùng từ của chính ngôn ngữ đó.

## Cách viết

- Viết theo việc người dùng cần làm và kết quả họ sẽ nhận được. Ưu tiên động từ cụ thể như “Mở”, “Chọn”, “Lưu”, “Sao chép”, “Thu gọn”.
- Dịch ý nghĩa theo ngữ cảnh, không bám từng từ hay thứ tự câu tiếng Anh. Đọc lại bản tiếng Việt độc lập và cùng các thành phần xung quanh để kiểm tra người dùng có hiểu ngay mình cần làm gì hay không.
- Dùng câu chủ động và từ thông dụng. Tránh bê nguyên cấu trúc tiếng Anh như “phiên bản sẽ được áp dụng”, “bề mặt nội dung”, “ngữ cảnh Chrome” khi có thể nói cụ thể hơn.
- Nút thao tác cần ngắn; phần mô tả giải thích điều kiện và hậu quả. Giữ rõ cảnh báo mất thay đổi chưa lưu, thao tác không thể hoàn tác và ảnh hưởng đến tệp gốc.
- Phân biệt xóa mục trong lịch sử với xóa tệp. “Xóa danh sách” chỉ xóa các mục đã ghi nhớ; “Ghi nhớ tệp đã mở” không có nghĩa là tạo bản sao tệp.
- Phân biệt “Hủy” (đóng thao tác đang thực hiện) với “Bỏ thay đổi” (không giữ các chỉnh sửa). Không rút ngắn cảnh báo đến mức làm mất sự khác biệt này.
- Khi nói về việc đọc lại nội dung đã được ghi vào tệp, dùng “Mở bản đã lưu”. Trong mô tả, nói rõ tệp đã được sửa bên ngoài Markdown Plus và bản nháp hiện tại có bị thay thế hay không.
- Với quyền chỉnh sửa, diễn đạt bằng việc chọn đúng tệp gốc và cấp quyền lưu. “Kết nối tệp” là mô tả kỹ thuật, không phải cách giải thích chính cho người dùng.
- Giữ nguyên tên riêng, tên phông, tên thư viện, phần mở rộng tệp, URL, phím tắt và đơn vị kỹ thuật như MiB, KiB, px. Các giá trị JSON `true`/`false` cần giữ nguyên trong lỗi kiểm tra tệp cài đặt.
- Giữ nguyên `{name}`, `{0}` và dấu `$` trong câu của CodeMirror. Đọc thử cả câu sau khi thay tham số, kể cả khi tên tệp là tiếng Anh hoặc trùng với một key ngôn ngữ.
- Thuật ngữ trong các phần khác nhau có thể khác nhau nếu ý nghĩa khác nhau. Ví dụ “Engine” trong thông tin Git là “Thư viện Git”, còn công cụ hiển thị Mermaid là “Công cụ vẽ sơ đồ”.

## Thuật ngữ đã chọn

| Khái niệm | Cách dùng trong Markdown Plus |
| --- | --- |
| Settings / General | Cài đặt / Chung |
| Theme / Base theme | Giao diện / Giao diện gốc |
| Workspace | Thư mục làm việc |
| Popup | Bảng tiện ích |
| Files / Outline | Tệp / Mục lục |
| Word count, character count, reading time | Thống kê tài liệu |
| Tree indent guides | Đường nối cây thư mục |
| Indexing files (trong cài đặt giới hạn quét) | Thêm tệp vào danh sách |
| Saved disk version | Bản đã lưu |
| Diff area | Đoạn thay đổi |
| Content surface | Nền nội dung |
| Rendered code theme | Bộ màu cú pháp |
| Replace / Replace with / Replace all | Thay thế / Thay thế bằng / Thay thế tất cả |
| Match case / Whole word | Phân biệt chữ hoa, chữ thường / Khớp toàn bộ từ |
| Zoom in / Zoom out | Phóng to / Thu nhỏ |

## Nguồn tham khảo

Các nguồn dưới đây dùng để đối chiếu thuật ngữ và cách đặt nhãn phổ biến. Câu chữ cuối cùng được biên tập theo chức năng thực tế của Markdown Plus; không sao chép cả đoạn hướng dẫn hay mặc định xem mọi bản dịch trợ giúp là chuẩn.

| Nguồn | Phần tham khảo |
| --- | --- |
| [Google Tài liệu — Tìm và sử dụng tính năng tìm và thay thế](https://support.google.com/docs/answer/62754?co=GENIE.Platform%3DDesktop&hl=vi) | Nhãn tìm kiếm, trường thay thế và thao tác thay thế toàn bộ |
| [Microsoft PowerPoint — Tìm và thay thế văn bản](https://support.microsoft.com/vi-vn/powerpoint/find-and-replace-text) | Cách phân biệt tìm, thay thế và thay thế tất cả |
| [Mozilla — Tùy chọn và cài đặt của Firefox](https://support.mozilla.org/vi/kb/tuy-chon-va-cai-dat-cua-firefox) | Cài đặt, giao diện, phông chữ, thẻ và ngôn ngữ giao diện |
| [Google Chrome — Đặt lại các chế độ cài đặt về mặc định](https://support.google.com/chrome/answer/3296214?hl=vi) | Cách nêu phạm vi của việc đưa cài đặt về mặc định |
| [Google Chrome — Xóa dữ liệu duyệt web](https://support.google.com/chrome/answer/2392709?hl=vi) | Phân biệt dữ liệu bị xóa, dữ liệu được giữ lại và các mục trong lịch sử |

## Kiểm tra khi sửa câu chữ

Rà soát hai lượt: lượt đầu đối chiếu ý nghĩa với hành vi thực tế, lượt sau đọc như một giao diện viết sẵn bằng tiếng Việt để sửa câu cứng, tối nghĩa hoặc còn mang cấu trúc tiếng Anh. Khi thêm hoặc rà soát toàn bộ một bản dịch, kiểm tra từng mục theo nhóm thành phần; không chỉ chọn vài màn hình hay vài nhãn làm mẫu. Bản dịch tự động chỉ là bản nháp cho đến khi hoàn tất cả hai lượt. Khi cân nhắc thuật ngữ mới, đối chiếu công cụ có giao diện hoặc trợ giúp tiếng Việt cùng ngữ cảnh và bổ sung nguồn đã đọc vào bảng trên.

Chạy `npm test -- src/i18n/__tests__` để bảo đảm key và tham số khớp giữa các catalog; giữ nguyên kiểm thử đổi ngôn ngữ khi đang soạn thảo hoặc hiển thị thông báo. Kiểm thử tương tác xác nhận xóa lịch sử phải thể hiện rõ không xóa tệp gốc; cảnh báo thay thế bản nháp phải nói rõ thay đổi chưa lưu sẽ mất. Khi nhãn dài hơn, kiểm tra lại độ vừa khung trong bảng tiện ích, hộp thoại và màn hình hẹp. Đối chiếu ma trận kiểm tra trong [Interface languages](./internationalization.md#translation-review-and-verification); kiểm thử tự động không thay thế việc đọc và xem giao diện thực tế.
