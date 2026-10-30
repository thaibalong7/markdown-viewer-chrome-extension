# Xử lý Chrome Sync quota cho custom themes

Nghiên cứu ngày **2026-10-29**, chốt và triển khai ngày **2026-10-30**. Runtime implementation và regression đã hoàn thành; kiểm tra Sync thực tế giữa hai profile và QA trên ZIP candidate vẫn còn mở trong [release checklist](./release-checklist.md#3-sửa-chrome-sync-quota-cho-custom-themes).

## Quyết định đã triển khai

Giữ preferences và custom theme descriptors trong Chrome Sync, tách index nhỏ và từng theme record theo hash nội dung. Giữ ảnh nền trong IndexedDB trên mỗi thiết bị. Không fallback sang local khi ghi sync bị quota/throttling; chỉ dùng local backend nếu API sync không tồn tại. Public settings/import/export vẫn dùng schema version 2.

Current-state contracts nằm trong [architecture overview](../../docs/architecture-overview.md#settings-storage-and-messaging) và [theme system](../../docs/theme-system.md#3-mô-hình-settings-được-lưu); dùng các tài liệu đó cùng runtime để xác định hành vi hiện tại.

## Nghiên cứu và lý do chọn

Trước thay đổi, service ghi toàn bộ `mdViewer.settings` vào một item; 18 themes dùng UUID có thể vượt 8 KB và 32 themes thông thường dùng khoảng 14,6 KB. Partial saves cũng ghi lại library nên typography/language có thể thất bại theo. Giới hạn số themes không thay thế byte budgeting vì tên Unicode, background descriptors và unknown fields được schema bảo toàn có thể làm payload lớn.

Theo [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync-QUOTA_BYTES_PER_ITEM), sync có giới hạn 8.192 B/item, 102.400 B tổng, 512 items và các hạn mức ghi theo phút/giờ. Offline vẫn dùng vùng sync trên máy và truyền sau; việc tắt đồng bộ tài khoản không làm API biến mất. `unlimitedStorage` không nâng quota sync.

[Mã Chromium quota enforcer](https://raw.githubusercontent.com/chromium/chromium/main/extensions/browser/api/storage/settings_storage_quota_enforcer.cc) tính key và JSON đã serialize, kiểm tra quota trước khi ghi xuống delegate. [String escaping của Chromium](https://raw.githubusercontent.com/chromium/chromium/main/base/json/string_escape.cc) còn escape `<`, U+2028 và U+2029; [JSON writer](https://raw.githubusercontent.com/chromium/chromium/main/base/json/json_writer.cc) có biểu diễn số khác JavaScript. Estimator vì thế dùng UTF-8, thêm escaping và dự phòng đến 24 byte/số; số đo Chrome thật là bằng chứng đối chiếu, không coi hai serializer giống nhau tuyệt đối.

| Phương án đã cân nhắc | Quyết định |
| --- | --- |
| Giảm số themes hoặc chỉ chặn item lớn | Byte guard là lớp bảo vệ, không dùng giới hạn số lượng làm giải pháp duy nhất. |
| Nén một item | Không bảo đảm dữ liệu khó nén vừa 8 KB; không thêm codec cho P0. |
| Chuyển settings/themes sang local | Không chọn vì thay đổi hành vi đồng bộ đã có. |
| Sync preferences, themes local | Không chọn vì mất đồng bộ custom themes và cần chính sách active theme riêng. |
| Catch lỗi sync rồi lưu local | Không chọn vì dễ đọc lại bản sync cũ và che lỗi throttling. |
| Tách index và theme records | Đã chọn; giữ hành vi sản phẩm với migration/cache/completeness rõ ràng. |

## Các boundary và bảo vệ đã có

- `settings-storage-format.js`: canonical hash, versioned index, ordered refs, kiểm tra đủ/hash của current records trước normalization; quota từng item/tổng/items tính cả overhead.
- `settings-storage.js`: Chrome adapter, verified cache, batch write, retire legacy sau readback, cleanup current/previous refs. Chỉ xóa namespace đã quan sát của adapter, không `clear()` vùng storage. Batch republish cả current records để sửa refs bị thiếu sau remote deletion; không giả định transaction giữa thiết bị.
- `settings-service.js`: migrate v1/v2 và serialize read/merge/write/reset trong worker. Legacy read cũng có cache nhưng không tự ghi migration lên sync; format mới được publish ở save/reset thành công đầu tiên.
- Recovery cache chỉ dùng cho backend sync đã xác minh. Snapshot mới thiếu refs có thể hiển thị snapshot cũ kèm warning; không save/reset dựa trên cache cũ. Máy mới không cache hợp lệ nhận lỗi tải rõ ràng. Chỉ phục hồi record đang được index tham chiếu khi cache có đúng nội dung/hash; không ghi cache cũ đè index.
- `settings-sync-observer.js`: lọc/coalesce `storage.onChanged` và chỉ broadcast snapshot đã kiểm tra. Broadcaster serialize dispatch và deduplicate echo để snapshot cũ không đến sau snapshot mới vì `tabs.query()` chậm.
- Settings client giữ warning ngoài settings object; Settings/Popup dùng shared Notice, Viewer dùng warning Toast. Quota/throttling/pending diagnostics có English, Vietnamese, Simplified Chinese và live-language coverage.
- Persistence thành công không bị đảo thành lỗi save do cache/cleanup/notification thất bại. Options hook giữ đúng asset lifecycle: xóa ảnh mới chưa dùng khi save thất bại, chỉ retire ảnh cũ sau descriptor commit.

## Bằng chứng kiểm chứng

Browser fixture [settings-storage.html](../../test/browser/settings-storage.html) chạy các runtime modules trong một extension/profile riêng trên **Chrome 156.0.0.0 / macOS**, không dùng tài khoản, profile hoặc storage extension đang cài của người dùng.

| Kiểm tra | Kết quả |
| --- | --- |
| Real per-item quota | 8.191/8.192 B được chấp nhận; 8.193 B bị Chrome từ chối. |
| Unicode/escaping | Estimator bao phủ usage thật của tiếng Việt, CJK, emoji, quote/backslash/newline, `<`, U+2028/U+2029 và lone surrogate trong fixtures. |
| 32 themes với tên CJK/ID/image descriptor dài | Save/import thành công; **35.761 B tổng**, **3.793 B index** ở lần commit đầu. Đây không phải upper bound hoặc dung lượng của hai generations. |
| Quota failure | Single-item legacy bị Chrome từ chối; import quá budget qua service không đổi settings cũ. |
| Lifecycle | Update, xóa active theme với fallback hợp lệ, reset, giữ unrelated local data và migrate legacy pass. |
| Persistence | Service instance mới và đóng/mở lại Chrome đọc đúng settings đã lưu. |
| Assertions | **50 storage + 1 browser restart** pass. |

Kiểm tra bổ sung trên unpacked build đầy đủ bằng runner tạm, **Chrome 156.0.8078.74 / macOS**, đã pass **22 assertions** qua Settings, Theme Studio, Popup 420 px và Viewer file thật: image upload/decode, quota failure giữ draft/ảnh cũ, retry/cleanup ảnh, import 32 themes, partial saves/live typography, worker restart, xóa active theme, incomplete snapshot warning/recovery, JSON export và reset. Runner và helper điều khiển Chrome tạm đã được gỡ sau QA để không duy trì thêm tooling; giữ hồ sơ kết quả và regression tests Vitest. Quá trình kiểm tra không thay manifest hoặc profile người dùng.

QA này tái hiện lỗi browser-native validation: dimming mặc định `0.08` bị `step=0.05` chặn submit trước save handler. Đã sửa dimming và gradient angle sang `step="any"` để nhận các số thập phân mà schema cho phép, thêm ba regression cases có fail-before/pass-after và chạy lại Chrome thành công. Full suite hiện **194 files / 1.449 tests**, production build pass.

Chạy lại: `source ~/.nvm/nvm.sh && nvm use && node scripts/settings-storage-smoke.mjs`. Có thể đặt `CHROME_BIN` để chọn binary Chrome hỗ trợ CDP Extensions debug API. Runner giữ artifact/profile tạm để kiểm tra và trả exit code khác 0 nếu thất bại.

Unit/DOM coverage gồm per-item và total quota boundaries, 512-item budget, previous refs, Unicode/backgrounds, unknown fields lớn, API quota/throttling lỗi sau preflight, mutation queue, two-writer simulation, cache/restart/incomplete refs/hash mismatch, migration failure, cleanup/cache failure, remote event ordering, image rollback và localized warnings. Project verification dùng `npm test`, `npm run build` và `git diff --check`; kết quả cuối cùng ghi trong checklist/task.

## Việc còn lại trước release

- Hai Chrome profiles đăng nhập cùng tài khoản với Sync bật: index/records truyền thực tế, concurrent edits, late deletion và recovery. Mock concurrency cùng một Chrome storage profile không chứng minh hội tụ qua mạng.
- Kiểm tra trên ZIP candidate sạch: unpacked build UI smoke đã pass như trên, nhưng chưa chứng nhận artifact ZIP cuối cùng hoặc mọi dạng ảnh/theme khác.
- Chrome minimum compatibility theo mục 4 của release checklist. Không đổi minimum hoặc thêm permission trong thay đổi quota này.
- Deploy public privacy policy đã cập nhật source và đối chiếu Store form theo mục 5; task này không deploy.

Application không tự merge hai lần sửa cùng theme hoặc cung cấp transaction/CAS giữa thiết bị. Chỉ áp dụng Chrome's winning index khi tất cả refs đã kiểm tra; nếu không đủ thì giữ snapshot hoàn chỉnh gần nhất hoặc báo lỗi tải, không âm thầm làm mất library.
