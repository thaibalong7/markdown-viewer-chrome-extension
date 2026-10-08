# Document Updates và Change Review — kiểm chứng Chrome còn lại

Ngày rà soát: 2026-10-07. Các tính năng mốc A/B đã có implementation và kiểm thử tự động; checklist này giữ phần nghiệm thu browser chưa có bằng chứng hoàn tất. Lượt rà soát này không chạy Chrome và không đánh dấu các ca dưới đây là pass. Hành vi hiện tại nằm trong [docs Document Updates và Change Review](../../docs/document-updates-and-change-review.md).

## Kết quả đối chiếu implementation

| Nhóm yêu cầu | Bằng chứng hiện tại |
| --- | --- |
| Ask/Auto/Off, visible-tab polling, xác nhận source, đọc tuần tự, retry/backoff và stale-result cancellation | `watchSessionController.js` và test lifecycle/race |
| Baseline độc lập với draft, workspace reader, Save và dirty protection | `documentSessionController.js`, `editorSessionController.js` và test tương ứng |
| Giữ heading/offset/ratio, hủy restore khi người dùng điều hướng, giữ Outline khi render | `reading-position.js`, `renderController.js` và test tương ứng |
| Refresh danh sách độc lập với document/draft/route | `explorer-list-refresh.js` và test workspace list-only |
| Line diff, newline/Unicode/empty, parser-based sections, heading trùng/xóa và giới hạn | `review/` và test diff, parser, navigation |
| Pin comparison, lazy review, safe text, keyboard, editor confirmation và modal lifecycle | `ChangeReview*`, `useModalDialog.js` và test component/helper; UI Chrome còn cần kiểm chứng |

Lượt kiểm tra 2026-10-07: `npm test` pass **791 tests / 131 files**, `npm run build` pass, `npm run size:report` khoảng **11 MiB** cho `dist/` và JavaScript. Build vẫn cảnh báo native config loader và chunk lớn. Không thay runtime, dependency hoặc permission trong lượt rà soát này.

Plan ban đầu hoãn Auto khi còn selection/focus hoặc mở panel. Commit `e2d88fd` đã chủ động bỏ các lock kéo dài này để tránh pending vô hạn; code và test hiện chờ input idle 1,5 giây hoặc pointer được thả. Mở Document Updates hoặc Change Review không tự chặn Auto. Diff đang review vẫn giữ cặp đã pin. Đây là thay đổi hành vi sau plan; checklist dưới đây theo runtime hiện tại.

## Watch — các ca browser còn cần xác minh

- Workspace File System Access handle và fallback `webkitdirectory`; thay workspace/reader khi I/O chưa hoàn tất.
- Git checkout thực tế, điều hướng khi I/O đang chạy, mở lại cùng URL và xác nhận tab ẩn không còn polling bằng quan sát I/O.
- Gõ tiếp trong lúc Save chưa hoàn tất: baseline nhận đúng source đã ghi, phần gõ tiếp vẫn dirty.
- Heading trùng/đổi tên/xóa, ảnh/Mermaid đổi layout trễ và cuộn trong lúc render chậm.
- Auto với selection/focus còn giữ hoặc panel đang mở: sau input idle, bản stable vẫn được apply; pointer đang giữ tiếp tục hoãn. Ask giữ article cho đến thao tác cập nhật.
- Refresh danh sách workspace file URL, scan lỗi và file đang đọc bị mất khỏi cây: giữ article, route và vị trí đọc; không fallback về entry document. Editor hiện ẩn Files nên ca refresh khi dirty dựa trên test orchestration, chưa có manual pass.

## Lỗi cold-start cần tái hiện

Biên bản Chrome ngày 2026-10-01/02 ghi nhận lần đầu sau reload extension có thể báo không đọc được file, kèm `Could not establish connection. Receiving end does not exist.`; Try again hoặc lượt kiểm tra sau phục hồi. Chưa xác định nguồn hoặc chứng minh lỗi đã được sửa trên build hiện tại. Cần tái hiện bằng fixture riêng, ghi nguồn lỗi và phân biệt lỗi reload extension với lỗi quyền truy cập; không coi đây là lỗi đang tái hiện ở lượt rà soát 2026-10-07.

Biên bản cũ đã xác nhận nhiều luồng file URL: Ask/Auto/Off, atomic save, edit clean/dirty và Save conflict, discard/cancel, Save nội bộ, file rỗng/mất/quá lớn, chuyển tài liệu, quay lại tab và refresh danh sách độc lập với article. Các kết quả đó thuộc build cũ, không thay thế checklist regression hiện tại.

## Chuẩn bị

1. Mở `chrome://extensions`, Reload extension đang dùng `dist/`. Bật **Allow access to file URLs** nếu chưa bật.
2. Tạo file riêng `/tmp/mdp-change-review-manual.md` bằng fixture bên dưới rồi mở `file:///tmp/mdp-change-review-manual.md` trong Chrome. Sửa file bằng VS Code/editor bên ngoài. Tránh dùng tài liệu quan trọng cho ca xóa nội dung hoặc Save conflict.
3. Trong Settings → General → Document updates, chọn **Ask before updating**. Với ca edit mode, bật experimental editor và kết nối đúng file bằng picker.
4. Khôi phục fixture và reload tab trước mỗi ca độc lập. Watch chỉ kiểm tra khi tab hiển thị; sau khi sửa file bên ngoài, quay lại tab và chờ khoảng 2–3 giây hoặc dùng Check now.

~~~markdown
# Change Review manual

Dòng mở đầu: Tiếng Việt 😀.

## Alpha

Alpha original.

Dòng giữ nguyên 1.
Dòng giữ nguyên 2.
Dòng giữ nguyên 3.
Dòng giữ nguyên 4.
Dòng giữ nguyên 5.
Dòng giữ nguyên 6.
Dòng giữ nguyên 7.
Dòng giữ nguyên 8.

## Duplicate

Duplicate first original.

## Duplicate

Duplicate second original.

## Remove me

Deleted section original.

## Code sample

```md
# Not a real heading
Code original.
```

Setext section
--------------

Setext original.
~~~

## 1. Ask: diff, số dòng và nhiều vùng thay đổi

1. Đổi `Alpha original.` thành `Alpha changed.` và `Duplicate second original.` thành `Duplicate second changed.`, rồi Save từ editor ngoài.
2. Article trong Chrome phải giữ bản cũ. Khi đã phát hiện update, toolbar có nút icon **View changes** (tài liệu có dấu +/−), nằm cạnh Document updates. Click icon View changes; đừng click Update document trước nếu muốn review pending.
3. Panel hiện ba ô Added, Removed, Areas; hai vùng thay đổi; hai gutter số dòng cũ/mới; dòng xóa/thêm có dấu −/+ và màu khác nhau. Sidebar Affected sections có Alpha và Duplicate thứ hai.
4. Previous area/Next area và Alt+↑/↓ chuyển focus giữa các changed area trong cùng comparison. Chúng không chuyển qua revision hoặc lịch sử update. Tab/Shift+Tab ở trong dialog. Escape, Close hoặc click vùng nền ngoài dialog đóng panel và trả focus về icon review.
5. Open document không xuất hiện khi bản mới chưa được load. Mở lại panel, bấm **Update document**. Article đổi sang bản mới; diff đang mở giữ nguyên. Bấm Open document của Duplicate: panel đóng và article cuộn tới Duplicate thứ hai.

## 2. Cặp review cố định và disk đổi tiếp

1. Trong Ask, sửa `Alpha original.` thành `Alpha first.`; mở View changes.
2. Giữ panel mở, sửa tiếp thành `Alpha latest.` từ editor ngoài, rồi quay lại Chrome. Nếu cần bấm Check latest trong review panel.
3. Diff vẫn hiển thị `Alpha first.`; panel báo comparison có thay đổi. Bấm **Review latest** mới chuyển diff sang `Alpha latest.`.
4. Sửa thêm một lần nhưng chưa refresh review, rồi bấm Update document: article phải lấy bản disk mới nhất qua fresh read, còn diff vẫn là cặp đã pin.
5. Trong một lượt riêng, cho disk trở về đúng baseline khi panel pending đang mở: dấu pending biến mất, diff đã pin vẫn giữ nguyên và có thông báo comparison không còn current. Đóng panel thì không còn review pending đó.

## 3. Auto: trước và sau lần cập nhật gần nhất

1. Chọn Watch = Auto, panel đang đóng. Sửa `Alpha original.` thành `Alpha first.`, quay lại tab và ngừng tương tác; chờ khoảng 4–6 giây.
2. Khi article đã đổi, mở View changes: diff so sánh original → first.
3. Đóng panel, chờ thêm 5 giây, sửa thành `Alpha second.`, quay lại tab và chờ apply. Mở review: diff phải là first → second, không phải original → second.
4. Giữ panel mở rồi sửa thành `Alpha third.`: disk vẫn được phát hiện, cặp review vẫn first → second. Ngừng tương tác và chờ stability/idle/cooldown: Auto có thể apply third phía sau dialog dù review còn mở. Bấm Review latest mới đổi cặp diff sang comparison hiện tại; không đòi hỏi đóng panel để Auto tiếp tục. Kiểm tra lại section links vì bản đang render có thể đã khác source mới của cặp đã pin.

## 4. Edit: loại trừ draft và bảo vệ Save conflict

1. Bật editor, kết nối đúng fixture file và vào edit mode. Gõ draft riêng trong Alpha nhưng chưa Save.
2. Dùng editor ngoài sửa `Alpha original.` thành `Alpha disk.` trên disk. Quay lại Chrome và mở View changes.
3. Diff so sánh baseline original → disk; không có dòng draft. Draft và dirty status vẫn giữ nguyên; không có Open document trong preview draft.
4. Khi draft dirty, review phải hiện warning card nổi bật `Your unsaved draft will be discarded`; nút action ghi `Load disk version…`. Bấm nút này phải mở alert dialog với action nguy hiểm `Discard draft and load disk version`. Chọn `Keep editing`: draft vẫn giữ nguyên. Thử Save: conflict guard phải từ chối ghi đè disk đã đổi.
5. Bấm `Load disk version…` lần nữa và xác nhận discard: thoát edit mode, article lấy disk mới, draft bị bỏ; cặp review vẫn giữ nguyên. Lặp lại với editor sạch: warning phải nói rõ edit mode sẽ đóng và vẫn yêu cầu xác nhận bằng `Exit edit mode and load disk version`.
6. Trong ca độc lập, Save nội bộ thành công không tạo thông báo external update hoặc review mới. Sửa tiếp trên disk sau Save: baseline review phải là đúng source vừa Save.

## 5. Heading, source an toàn và newline

1. Xóa cả heading `## Remove me` và body của nó: review hiển thị `Remove me` với badge Deleted, không có Open document cho section đó.
2. Sửa `Code original.` trong fence: affected section là Code sample, không có section Not a real heading. Thử tương tự với code thụt vào bốn spaces.
3. Sửa body của Setext section: section này được nhận diện. Đổi tên heading: review giữ tên heading cũ ở phần deleted và tên mới ở phần thêm.
4. Thêm section phía trên Duplicate rồi sửa body Duplicate thứ hai: sau khi load đúng phiên bản, Open document phải đi đúng heading mới, không dựa vào thứ tự heading cũ.
5. Thêm `<script>alert(1)</script>` hoặc `<img src=x onerror=alert(1)>` vào source: trong diff phải thấy chữ source nguyên văn, không chạy script hoặc tạo ảnh từ source diff. Thử dòng tiếng Việt và emoji để kiểm tra ký tự.
6. Xóa toàn bộ file: review hiển thị các dòng deleted; sau khi load, empty document vẫn hợp lệ. Thử từ file rỗng thêm một dòng và review lại.
7. Đổi LF ↔ CRLF hoặc bỏ/thêm newline cuối file bằng editor: diff phải nhận ra thay đổi và có nhãn CRLF/No newline at end of file khi thích hợp.

## 6. Off, workspace, navigation và giới hạn

1. Chọn Watch = Off, sửa disk: không polling. Dùng Document updates → Check now để phát hiện; sau đó View changes vẫn dùng được.
2. Mở workspace bằng File System Access handle và lặp lại ca Ask: review hoạt động với file đang mở. Workspace snapshot-only qua `webkitdirectory` vẫn báo cần chọn lại folder, không giả vờ đọc được live revision.
3. Mở review rồi dùng browser Back/Forward để chuyển tài liệu: panel cũ phải đóng, không mang diff sang document session mới. Với Files, đóng modal trước khi chọn tài liệu khác vì background đang inert; thử mở lại cùng URL và xác nhận comparison của session cũ không quay lại.
4. Dùng fixture riêng lớn hơn 512 Ki UTF-16 code units nhưng nhỏ hơn giới hạn Watch 5 MiB, rồi sửa một dòng: View changes hiển thị fallback rõ ràng; article/draft vẫn được giữ. Tương tự với hơn 20.000 dòng hoặc diff có hơn 2.000 dòng output. Không có diff bị cắt mà bị trình bày như kết quả đầy đủ.
5. Thử light/dark, cửa sổ hẹp và Outline collapsed: icon review dùng được, dialog nằm trong viewport, source dài có scroll ngang, không tràn action rail. Bật reduced motion; keyboard/focus vẫn hoạt động. Các flow UI này chưa được xác minh trong Chrome bởi agent.
