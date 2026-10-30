# Mục 5 — Privacy, permissions và file-access onboarding

Kiểm tra và sửa source ngày **2026-10-30**, Node `20.19.5` / npm `10.8.2`. Đây là hồ sơ chuẩn bị release; chưa phải xác nhận Store submission hoặc chứng nhận ZIP candidate.

## Phần đã hoàn tất trong repository

- Policy được sửa từ `scripts/site/locales/{en,vi,zh-CN}.json` và shared privacy template, rồi sinh lại cả ba trang bằng `python3 -B scripts/localize-site.py`. Ngày hiệu lực mới là 2026-10-30; test ngày và website guide được cập nhật cùng nguồn.
- `downloads` chỉ giải thích HTML/Word-compatible/Mermaid SVG/PNG exports. Editor Save dùng file handle của tệp gốc đã được người dùng kết nối; không có download fallback (`src/viewer/editor/file-io.js`).
- Policy mô tả ảnh nền device-local trong IndexedDB, Sync chỉ mang tham chiếu và presentation settings; thay thế/chuyển sang nền không dùng ảnh sau save thành công sẽ dọn asset cũ, xóa theme sẽ dọn ảnh và reset settings sẽ clear store. Cleanup có thể thất bại; policy ghi cách xử lý ảnh không còn dùng và giữ nguyên tài liệu gốc/exports. Đã đối chiếu `useSettingsForm.js`, `theme-asset-service.js`, `message-router.js`.
- Disclosure giữ giải thích Sync index/theme records, local verified recovery cache và không fallback khi Sync write bị từ chối. Inventory phân biệt dữ liệu được xử lý với dữ liệu gửi cho developer; không dùng local-only làm lý do bỏ disclosure. Policy bổ sung Limited Use và nói rõ Chrome-managed preference sync.
- Manifest source `0.1.0.1`: `storage`, `offscreen`, `downloads`; host/content-script/web-accessible-resource matches chỉ `file:///*`, không `<all_urls>`. Không sửa manifest trong task này.
- [Store listing copy](./store-listing.md) có description, one-time setup và reviewer test steps. [Disclosure](./privacy-disclosure.md) có single purpose, permission justifications và remote-code declaration để nhập vào dashboard.
- Screenshot 05 được render lại từ composition/source capture có sẵn, sửa riêng crop sang hàng **File URL access**. Đã xem PNG đầu ra, đủ kích thước 1280 × 800, thấy lời hướng dẫn và Allowed badge. Bốn screenshot khác không thay đổi; chưa xác nhận cả bộ trên candidate cuối.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| `npm test` | **195 files / 1.456 tests pass**. | Worktree có các thay đổi sẵn của người dùng; đây không phải clean-source/candidate test. Chỉ thêm 4 lifecycle regression tests, không sửa runtime. |
| File-access lifecycle trong jsdom | Blocked ban đầu, focus cập nhật allowed rồi blocked, visibility refresh, phục hồi sau lỗi API, bỏ listeners sau unmount đều pass. | Mock Chrome API; không xác nhận Chrome toggle hoặc profile cài mới. |
| Website checker tests | 8 tests pass. | Kiểm tra static local assets/links, không fetch external links. |
| Website localization tests | 6 tests pass; sáu trang sinh ra current. | Không chứng minh bản deploy đã cập nhật. |
| `scripts/check-site.py` | 6 HTML pages hợp lệ về local links/assets/anchors và GitHub Pages project paths. | Không thay thế kiểm tra deployment. |
| `node --check site/assets/site.js` | Pass. | Website JS không đổi trong task này. |
| Local policy trong Chrome | Xem nội dung VI và phần user controls trong dark mode; ngày mới và các nội dung sửa hiển thị, không thấy clipping ở phần được xem. | Không phải full responsive/three-language visual matrix. |
| Policy công khai | HTTP 200 tại [URL privacy](https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/); đã có Sync cache và ảnh nền device-local. | Bản kiểm tra vẫn có Save fallback và chưa có image-deletion clarification mới. |
| Chrome Web Store dashboard | Mở bằng Chrome, chuyển tới `/webstore/devconsole/register`. | Chưa có item form; cần người dùng chấp nhận thỏa thuận và trả phí đăng ký **5 USD**. Không chấp nhận điều khoản hoặc thanh toán trong task này. |

Không chạy production build vì thay đổi runtime chỉ nằm trong test; policy/site copy và PNG không được bundle vào extension. Cần build/package và smoke-test chính ZIP ở mục 6.

## Các bước để đóng mục 5

1. Deploy policy source qua workflow GitHub Pages hiện có. Task này không commit/push vì repository yêu cầu chỉ thực hiện khi được yêu cầu rõ ràng. Sau deploy, kiểm tra ngày 2026-10-30 và nội dung mới: Editor Save không download fallback, ảnh được dọn khi thay thế/xóa/reset, Limited Use. Kiểm tra EN/VI/中文; không dùng HTTP 200 làm bằng chứng duy nhất.
2. Người dùng hoàn tất đăng ký Chrome Web Store trên tab dashboard đang mở. Sau đó tạo/mở item, đối chiếu live category definitions với inventory, nhập single purpose, permission justifications, remote-code declaration, policy URL và description/screenshots; lưu và ghi lại kết quả. Không tick các checkbox dữ liệu chỉ dựa vào phỏng đoán khi chưa có form.
3. Thực hiện reviewer steps trong [store-listing.md](./store-listing.md) trên clean Chrome profile với release candidate: blocked ban đầu → Details đúng extension → người dùng bật file URL access → Settings focus cập nhật allowed → mở/reload fixture Markdown và có Viewer → thu hồi quyền và trở về blocked. Ghi Chrome/OS, ZIP/SHA-256, kết quả từng bước và so sánh cả bộ screenshot. File URL permission do Chrome quản lý; không chỉnh trực tiếp profile preferences để giả lập kết quả onboarding.

Khi cả ba bước có bằng chứng, cập nhật checkbox tương ứng ở [release-checklist.md](./release-checklist.md#5-hoàn-tất-privacy-permissions-và-file-access-onboarding). Các bước ngoài repository chưa được đánh dấu hoàn tất.

Nguồn chính sách đã đối chiếu: [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).
