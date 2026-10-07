# Markdown Plus — Ý tưởng phát triển sản phẩm

> Trạng thái: Định hướng sản phẩm, không phải tài liệu mô tả runtime hiện tại
> Ngày nghiên cứu thị trường gần nhất: 2026-10-01

## Mục đích

Tài liệu này tổng hợp các cơ hội để phát triển Markdown Plus vượt ra ngoài phạm vi một trình hiển thị Markdown đẹp. Nội dung kết hợp năng lực hiện có của repository với nghiên cứu thị trường ở mức tổng quan, từ đó đề xuất một roadmap có thứ tự ưu tiên. Các mục được đánh dấu đã triển khai phản ánh runtime hiện tại; những mục còn lại vẫn chỉ là đề xuất cho đến khi được xác định phạm vi, kiểm chứng nhu cầu và phê duyệt để triển khai.

## Định hướng sản phẩm

Markdown Plus nên được định vị là một **không gian làm việc tài liệu local-first ngay trong Chrome**, thay vì chỉ là một Markdown viewer khác trên thị trường.

Lời hứa sản phẩm phù hợp nhất có thể là:

> Mở tài liệu cục bộ tức thì, tự theo kịp các thay đổi bên ngoài, điều hướng toàn bộ workspace và kiểm tra tính toàn vẹn của tài liệu—mà không cần tải nội dung lên máy chủ.

Hướng đi này duy trì thế mạnh xử lý cục bộ và quyền riêng tư của extension, đồng thời tận dụng viewer đa định dạng, workspace explorer, điều hướng nội bộ, editor, hệ plugin, tính năng export, lịch sử file gần đây và hệ theme đang có.

## Tổng quan thị trường

Các tính năng render cơ bản hiện đã trở thành tiêu chuẩn tối thiểu. Những Chrome extension lâu năm đã kết hợp GitHub-flavored Markdown, theme, mục lục, syntax highlighting, Mermaid, công thức toán, chế độ raw/rendered và tự động làm mới.

- [Markdown Viewer](https://chromewebstore.google.com/detail/markdown-viewer/ckkdlimhmcjmikdlpkmbgfkaikojcbjk) hỗ trợ tự động reload, ghi nhớ vị trí đọc, raw/rendered view, Mermaid, MathJax, custom theme và hơn 30 theme.
- [Markdown Reader](https://chromewebstore.google.com/detail/markdown-reader/medapdbncneneejhbgcjceippjlfkmkg) hỗ trợ cập nhật theo thời gian thực, nhiều cú pháp mở rộng, raw preview, phím tắt và giao diện đa ngôn ngữ.
- [ReadMD](https://chromewebstore.google.com/detail/readmd/iklflaghlojldinnechndadollfpkkhf) tạo khác biệt bằng duyệt thư mục, điều hướng giữa các file và xem hai tài liệu song song.
- [Markside](https://chromewebstore.google.com/detail/markside-%E2%80%94-review-edit-an/ccokohfaicfjkilcakhnlckbbkhhknhj) tập trung vào quick switcher, tìm theo tên và nội dung file, bảo vệ xung đột và quy trình review tài liệu.
- [Markdown Toolset](https://chromewebstore.google.com/detail/markdown-toolset/omkendmnamimhfnjhepgdojbamboipio) bổ sung chế độ trình chiếu, công cụ định dạng, lưu trực tiếp vào file, batch export và xuất DOCX.

Các công cụ Markdown rộng hơn cho thấy giá trị bền vững thường nằm ở workflow cấp workspace, không chỉ ở khả năng render.

- [Visual Studio Code](https://code.visualstudio.com/docs/languages/markdown) hỗ trợ tìm heading trong workspace, kiểm tra link và cập nhật link khi file được di chuyển.
- [Typora](https://support.typora.io/Quick-Start/) hỗ trợ fuzzy search cho file, điều hướng cây thư mục và tìm kiếm toàn cục bên cạnh editor và các workflow export.
- [Obsidian](https://obsidian.md/help/plugins/backlinks) dùng backlinks như một công cụ điều hướng chính; các tính năng [Properties](https://obsidian.md/help/properties) và [Search](https://obsidian.md/help/Plugins/Search) biến thư mục Markdown cục bộ thành một knowledge base có cấu trúc.

Điều này cho thấy Markdown Plus không nên dẫn đầu bằng cách bổ sung thêm theme hoặc các plugin cú pháp rời rạc. Cơ hội tốt nhất là giúp người dùng theo dõi, tìm kiếm, kiểm tra, review và chia sẻ tài liệu cục bộ dễ dàng hơn.

## Các cơ hội theo thứ tự ưu tiên

| Cơ hội | Giá trị với người dùng | Công sức tương đối | Ưu tiên |
| --- | --- | --- | --- |
| Watch mode kèm review thay đổi | Rất cao | Trung bình | Đã triển khai (A + B) |
| Quick Open và tìm kiếm workspace | Rất cao | Trung bình–cao | P0 |
| Chuyển đổi raw/rendered cho Markdown | Cao | Thấp | P0 |
| Ghi nhớ vị trí đọc | Cao | Thấp–trung bình | P0 |
| Kiểm tra link và backlinks | Rất cao | Cao | P1 |
| Frontmatter, callout và wikilink | Cao | Trung bình | P1 |
| Rich copy và export tốt hơn | Trung bình–cao | Trung bình | P2 |
| So sánh song song và annotation | Cao với nhóm thường xuyên review | Cao | P2 |
| Viewer cho JSON, YAML, CSV và diff | Trung bình | Trung bình | P2 |

## 1. Watch mode và review thay đổi

> Trạng thái: Đã triển khai Watch và Change Review. Hành vi hiện tại nằm trong [docs Document Updates và Change Review](../../docs/document-updates-and-change-review.md); các ca nghiệm thu Chrome còn lại nằm trong [checklist kiểm chứng](./document-updates-manual-test.md).

File Markdown đang mở được theo dõi bằng Ask (mặc định), Auto hoặc Off; chỉ kiểm tra khi tab hiển thị và dùng fresh read khi áp dụng revision. Update tại chỗ giữ vị trí đọc, độc lập với Refresh file list, bảo vệ editor/draft và không bỏ qua Save conflict guard.

Change Review đã có source-line diff, số dòng, thống kê thêm/xóa, affected sections từ parser, điều hướng vùng thay đổi và cặp review cố định cho đến khi chọn Review latest. Auto vẫn có thể áp dụng source mới sau input idle khi review đang mở; diff đã pin giữ nguyên. Source chỉ ở memory của tab, có giới hạn diff và fallback cho file lớn.

Không còn mốc triển khai A/B trong roadmap. Kiểm chứng UI/browser vẫn chưa hoàn tất; whole-workspace watch, draft-versus-disk diff, merge, lịch sử dài hạn và annotation là các phạm vi riêng chưa triển khai.

## 2. Quick Open và tìm kiếm workspace

### Vấn đề

Files explorer phù hợp khi người dùng biết file nằm ở đâu, nhưng mở rộng từng thư mục trong một repository tài liệu lớn sẽ chậm. Người dùng ngày càng quen với cách truy cập file và heading bằng `Cmd/Ctrl+P`.

### Trải nghiệm đề xuất

- Mở command palette bằng `Cmd/Ctrl+P`.
- Tìm filename và relative path bằng fuzzy matching.
- Tìm heading trong toàn bộ tài liệu Markdown.
- Hiển thị file gần đây và heading vừa truy cập trước khi người dùng nhập từ khóa.
- Hỗ trợ hoàn chỉnh keyboard navigation và thông báo kết quả phù hợp cho công nghệ hỗ trợ.
- Ở giai đoạn hai, bổ sung full-text search với đoạn trích và ngữ cảnh xung quanh kết quả.
- Cho phép lọc theo thư mục, loại file, frontmatter property hoặc tag.
- Tôn trọng `.gitignore`, giới hạn scan, giới hạn kích thước file, thao tác hủy và thay đổi workspace.

### Cách triển khai đề xuất

Bắt đầu bằng tìm kiếm filename, path, heading và recent item trên một index trong memory. Sau đó bổ sung content index theo kiểu incremental. Việc lưu index lâu dài nên là tùy chọn và chỉ thực hiện trên thiết bị.

### Lý do phù hợp với kiến trúc hiện tại

Explorer đã sở hữu recursive scan, cancellation, workspace handle, virtual file, `.gitignore` matching và navigation. Một workspace index dùng chung có thể xây trên các service này, đồng thời phục vụ backlinks và link validation về sau.

## 3. Hiểu liên kết và kiểm tra chất lượng tài liệu

### Vấn đề

Repository tài liệu thường xuống cấp âm thầm khi file được di chuyển, heading thay đổi hoặc asset bị xóa. Viewer có thể đi theo một link hợp lệ, nhưng người dùng cũng cần biết link nào đã hỏng và tài liệu nào đang trỏ về file hiện tại.

### Trải nghiệm đề xuất

- Hiển thị outgoing links của tài liệu hiện tại.
- Hiển thị backlinks từ những tài liệu khác trong workspace.
- Phát hiện link trỏ tới file cục bộ không tồn tại.
- Phát hiện link trỏ tới heading không tồn tại.
- Phát hiện ảnh và asset bị thiếu khi quyền truy cập workspace cho phép.
- Tạo báo cáo toàn workspace như “12 link hỏng trong 5 file”.
- Mở issue tại đúng tài liệu và dòng source liên quan.
- Export báo cáo Markdown hoặc JSON cho script, CI hay coding agent.
- Thêm chế độ tương thích tùy chọn cho wiki-style link.

### Cách triển khai đề xuất

Nên xây workspace index dùng chung trước tính năng này. Bắt đầu bằng link giữa các file Markdown và heading fragment, sau đó mở rộng sang asset và wikilink tùy chọn. Chỉ nên làm graph view sau khi backlinks và validation đã chứng minh được giá trị.

### Lý do phù hợp với kiến trúc hiện tại

Markdown Plus đã tập trung hóa việc phân loại local link, workspace link, external link, hash link và link không được hỗ trợ. Tái sử dụng resolver này cho một công cụ audit workspace offline sẽ tạo khác biệt thực tế hơn một graph chỉ mang tính trực quan.

## 4. Chế độ raw/rendered cho Markdown

Markdown hiện chỉ có chế độ đọc đã render, trừ khi người dùng bật và kết nối experimental editor. Một source view chỉ đọc sẽ cho phép kiểm tra cú pháp mà không cần cấp quyền ghi hoặc bắt đầu edit session.

Chế độ này nên dùng cùng capability-driven view-mode model đang áp dụng cho tài liệu Mermaid độc lập. Có thể hỗ trợ syntax highlighting, tùy chọn số dòng, copy source và ghi nhớ chế độ trong từng tab.

## 5. Ghi nhớ vị trí đọc lâu dài

Ghi nhớ vị trí của người dùng trong các tài liệu gần đây và khôi phục khi họ mở lại file. Nên lưu heading id gần nhất cùng offset và scroll ratio dự phòng thay vì chỉ dựa vào số pixel tuyệt đối.

Dữ liệu vị trí đọc phải nằm trong storage cục bộ trên thiết bị, tuân theo chính sách quyền riêng tư của recent files, có giới hạn lưu trữ và cho phép người dùng xóa hoặc tắt.

## 6. Frontmatter và khả năng tương thích knowledge base

### Frontmatter

- Phát hiện YAML frontmatter ở đầu tài liệu Markdown.
- Cung cấp ba chế độ hiển thị: `Ẩn`, `Properties` và `Raw`.
- Render an toàn các giá trị phổ biến như text, number, date, boolean, array, tag và link.
- Cho phép tìm kiếm workspace lọc theo các field như `status`, `author`, `date` hoặc `tags`.

### Plugin tương thích tùy chọn

- Callout hoặc admonition theo phong cách GitHub và Obsidian.
- Wiki-style link như `[[Architecture]]` và tham chiếu tới heading.
- Embed note cục bộ khi có thể resolve rõ ràng và an toàn.
- Gắn nhãn trực quan rõ ràng khi cú pháp phụ thuộc một công cụ cụ thể và không phải Markdown portable.

Nhóm tính năng này nên là tùy chọn để parser mặc định vẫn dễ dự đoán và gọn nhẹ.

## 7. Workflow review và so sánh

Các tính năng review tiềm năng gồm:

- Mở hai tài liệu trong workspace cạnh nhau.
- So sánh file hiện tại với một file khác hoặc với phiên bản vừa được load trước đó.
- Thêm comment hoặc highlight cục bộ, neo vào source range và text fingerprint.
- Tự gắn lại annotation khi đoạn văn dịch chuyển nhẹ và đánh dấu unresolved khi anchor không còn rõ ràng.
- Export review comment thành Markdown hoặc JSON có cấu trúc thay vì tự động sửa tài liệu.

Annotation có giá trị nhưng tồn tại nhiều bài toán khó về lưu trữ và anchor drift. Tính năng này nên đến sau change review và so sánh song song an toàn.

## 8. Cải thiện chia sẻ và export

### Rich copy

- Copy phần đang chọn dưới dạng Markdown.
- Copy dưới dạng rich text để dán vào email, tài liệu văn phòng và ứng dụng chat.
- Copy HTML đã sanitize hoặc plain text.
- Giữ nguyên hành vi copy riêng cho từng code block hiện tại.

### Export

- Tạo standalone HTML có tùy chọn nhúng ảnh cục bộ, Mermaid đã render và style.
- Cân nhắc xuất DOCX thực thay vì HTML mang phần mở rộng `.doc`.
- Hỗ trợ lặp lại thao tác export tới đích gần nhất khi browser API cho phép.
- Chỉ bổ sung batch export cho workspace sau khi output của từng tài liệu đã ổn định và được giới hạn kích thước an toàn.

Các đường export phải duy trì sanitization và không được tải hoặc nhúng tài nguyên remote khi chưa có chủ đích rõ ràng từ người dùng.

## 9. Các document renderer bổ sung

Nếu tiếp tục mở rộng hỗ trợ đa định dạng, nên ưu tiên những loại file thường xuất hiện cạnh tài liệu kỹ thuật:

1. JSON với chế độ cây có thể thu gọn và raw mode.
2. YAML với chế độ structured và raw.
3. Diff và patch với cách trình bày rõ dòng thêm và dòng xóa.
4. CSV/TSV với bảng virtualized cho file nằm trong giới hạn kích thước.
5. Log file với word wrapping, filtering và severity highlighting.

Mỗi định dạng phải được thêm thông qua file-type registry, loader strategy, renderer registry, capability model và các test tập trung. Không nên thêm định dạng chỉ để tăng số lượng format được hỗ trợ.

## Thứ tự release đề xuất

### v0.2 — Tính liên tục khi đọc

- Chuyển đổi raw/rendered cho Markdown.
- Ghi nhớ vị trí đọc.
- Watch mode. **Đã triển khai.**
- Reload an toàn với dirty-editor protection và position preservation. **Đã triển khai.**

### v0.3 — Trí tuệ workspace

- Quick Open bằng `Cmd/Ctrl+P`.
- Tìm filename, path và heading.
- Full-text search theo kiểu incremental.
- Frontmatter property card và filter.

### v0.4 — Kiểm tra chất lượng tài liệu

- Outgoing links và backlinks.
- Phát hiện link hỏng tới file, heading và asset.
- Báo cáo link health cho toàn workspace.
- Tùy chọn tương thích wikilink và callout.

### v0.5 — Review và chia sẻ

- Review thay đổi bên ngoài dưới dạng diff. **Đã triển khai Change Review; chưa có lịch sử dài hạn, merge hoặc annotation.**
- So sánh hai tài liệu song song.
- Comment và highlight cục bộ.
- Standalone HTML có asset, Word export tốt hơn và batch export được giới hạn cẩn thận.

## Những tính năng chưa nên ưu tiên trong ngắn hạn

- **Thêm nhiều theme:** Hệ custom theme và syntax theme hiện tại đã là một thế mạnh; thêm theme mới khó tạo ra khác biệt đáng kể.
- **WYSIWYG editor hoàn chỉnh:** Hướng này sẽ đưa Markdown Plus vào cạnh tranh trực tiếp với editor chuyên dụng, đồng thời làm tăng đáng kể độ phức tạp và rủi ro khi ghi file.
- **Graph view trước backlinks:** Graph hấp dẫn về mặt hình ảnh nhưng ít hành động được hơn backlinks và broken-link detection.
- **Cloud AI mặc định:** Điều này xung đột với thông điệp local-first và phát sinh vấn đề về API key, chi phí, permission, disclosure và xử lý dữ liệu.
- **Quyền truy cập website diện rộng:** Render Markdown qua HTTP và HTTPS đòi hỏi mô hình permission và security phức tạp hơn. Nếu triển khai, nên dùng optional host permission có phạm vi hẹp.
- **Bộ sưu tập định dạng quá lớn:** Renderer mới phải phục vụ workflow tài liệu cục bộ, không biến extension thành một file viewer đa năng thiếu trọng tâm.

## Lựa chọn nên đặt cược đầu tiên

Khoản cược đầu tiên **Watch mode kèm Change Review** đã được triển khai. So với auto-refresh đơn thuần, phát hiện thay đổi bên ngoài an toàn kết hợp với giữ vị trí đọc, bảo vệ editor đang dirty và diff dễ đọc tạo cho Markdown Plus một bản sắc rõ ràng hơn trong workflow của developer và tài liệu được hỗ trợ bởi AI.

Bước tiếp theo có rủi ro thấp và thời gian mang lại giá trị nhanh có thể kết hợp **Markdown raw view** với **ghi nhớ vị trí đọc lâu dài**; hai mục này bổ sung cho vị trí đọc chỉ được giữ trong lúc áp dụng revision hiện tại.

## Các câu hỏi cần kiểm chứng

Trước khi cam kết với roadmap lớn hơn, cần kiểm chứng các câu hỏi sau với nhóm người dùng sớm:

1. Họ có thường giữ một tài liệu đã render mở trong khi công cụ khác đang chỉnh sửa file đó không?
2. Họ điều hướng tài liệu chủ yếu bằng thư mục, filename, heading hay full-text query?
3. Broken-link report có thể thay thế một script hoặc workflow trong editor hiện tại của họ không?
4. Họ dùng Markdown link tiêu chuẩn, wikilink hay cả hai?
5. Output chính của họ là đọc, review, in, chia sẻ HTML hay tài liệu Word?
6. Họ có chấp nhận một search index cục bộ được lưu lâu dài không, hay muốn tạo lại index trong mỗi session?
7. Những dữ liệu nào có thể được giữ cục bộ: recent path, vị trí đọc, search index, annotation và diff baseline?

Câu trả lời sẽ quyết định roadmap nên nghiêng trước về đọc liên tục, điều hướng knowledge base, kiểm tra chất lượng tài liệu hay review và chia sẻ.
