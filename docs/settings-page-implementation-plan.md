# Kế hoạch trang Settings cho Markdown Plus

## 1. Mục tiêu

Tạo một trang Settings đầy đủ tại entry `options_page` hiện có, dành cho các cấu hình quyết định **extension vận hành như thế nào**. Trang này không thay thế vai trò thao tác nhanh của Popup và không trở thành một bản sao lớn hơn của Popup.

Trong tài liệu này, “số cấp folder” được hiểu là `explorer.maxScanDepth`.

## 2. Kết luận từ code hiện tại

Ba giới hạn scan đã có trong settings schema và đã được explorer đọc ở runtime:

| Setting | Default hiện tại | Nơi dùng |
| --- | ---: | --- |
| `explorer.maxScanDepth` | `4` | Giới hạn độ sâu quét folder |
| `explorer.maxFiles` | `2000` | Giới hạn số file được index |
| `explorer.maxFolders` | `500` | Giới hạn số folder được duyệt |

Nguồn default nằm ở `src/shared/constants/explorer.js`, được đưa vào `DEFAULT_SETTINGS.explorer` trong `src/settings/default-settings.js`. `useExplorer()` lấy ba giá trị này qua `bridge.getSettings()` và truyền chúng cho mọi đường scan chính.

Vì vậy, `maxFiles` không còn bị hard-code hoàn toàn ở runtime: người dùng đã có thể đổi nó bằng JSON trong Options hiện tại. Phần còn thiếu là UI thân thiện, validation rõ ràng và mô hình Settings/Popup nhất quán.

Options hiện tại (`src/options/index.html` + `src/options/index.js`) chỉ là textarea sửa JSON. Đây là entry phù hợp để nâng cấp thành Settings page; không cần thêm permission hay thêm một page mới vào manifest.

## 3. Ranh giới Settings và Popup

### Popup

Popup dành cho những thứ người dùng muốn xem hoặc đổi nhanh trong lúc đọc:

- Recent files và mở lại file.
- Reader UI: theme, font, font size, line height, content width, Outline.
- Editor preferences.
- Plugin render toggles.
- Một link rõ ràng: **Open Settings**.

### Settings page

Settings dành cho chính sách vận hành dài hạn:

- Extension có được bật hay không.
- Cách Files Explorer scan workspace.
- Giới hạn tài nguyên và hành vi khôi phục workspace.
- Quyền riêng tư, history và dữ liệu lưu trữ.
- Reset, import/export cấu hình và thông tin chẩn đoán cơ bản.

Sau khi Settings page hoàn thiện, tab “Extension settings” hiện chỉ có toggle `enabled` nên được bỏ khỏi Popup; toggle này chuyển sang Settings page. Popup vẫn là lối vào nhanh đến Settings.

## 4. Phạm vi đề xuất

### 4.1 MVP — nên làm trước

#### General

- **Enable Markdown Plus** — `enabled`.
- **File URL access** — trạng thái chỉ đọc: Allowed/Not allowed, kèm hướng dẫn mở trang Details của extension. Đây là permission do Chrome quản lý, extension không được giả vờ rằng một toggle trong Settings có thể tự cấp quyền.

#### Files & Workspace

- **Folder scan depth** — `explorer.maxScanDepth`.
  - Range đề xuất: `0–20`.
  - `0` nghĩa là chỉ scan folder gốc.
  - Default: `4`.
- **Maximum indexed files** — `explorer.maxFiles`.
  - Range đề xuất: `10–20,000`.
  - Default: `2,000`.
- **Maximum scanned folders** — `explorer.maxFolders`.
  - Range đề xuất: `1–5,000`.
  - Default: `500`.
- Help text giải thích tăng giới hạn có thể làm scan chậm và dùng nhiều bộ nhớ hơn.
- Nút **Reset section to defaults** chỉ reset nhóm `explorer`.

Ba field này dùng schema đã có, nên MVP không cần migration settings.

#### Advanced

- **Export settings**: tải JSON đã normalize.
- **Import settings**: chọn JSON, validate rồi mới lưu; không cho sửa raw JSON trực tiếp như UI chính.
- **Reset all settings**: destructive action có confirm và hiển thị rõ phạm vi.

### 4.2 Nên thêm ở vòng tiếp theo

#### Tôn trọng `.gitignore`

- Setting mới: `explorer.respectGitignore`, default `true`.
- Scanner hiện đã hỗ trợ option này nhưng các workflow luôn dùng default `true`; wiring tương đối nhỏ.
- Đây là setting vận hành tốt vì ảnh hưởng lượng dữ liệu scan, tốc độ và file nào xuất hiện trong explorer.

#### Khôi phục workspace gần nhất

- Setting mới: `explorer.restoreLastWorkspace`, default `true`.
- Hiện workspace `file:` được tự restore từ session state khi viewer mount.
- Khi tắt, viewer khởi động ở sibling mode; không tự scan workspace cũ.
- Thay đổi chỉ áp dụng ở lần mở viewer tiếp theo, không tự thoát workspace đang dùng.

#### Privacy & recent files

- Setting mới: `history.enabled`, default `true`.
- Setting mới: `history.maxEntries`, default `12`, range đề xuất `1–50`.
- Action **Clear recent files now**.
- File history chứa đường dẫn file local, nên việc cho người dùng tắt và xóa history có giá trị riêng tư rõ ràng.

### 4.3 Chỉ nên làm sau khi có nhu cầu thực tế

- `documents.maxStandaloneTextFileSizeMiB`: giới hạn hiện tại là `5 MiB` cho `.txt` và `.mermaid` mở qua document loader. Tên setting phải nói rõ không áp dụng cho mọi Markdown entry.
- `explorer.includeHiddenFiles`: hiện dotfiles/dotfolders bị bỏ qua. Nếu thêm phải có cảnh báo về hiệu năng và tránh tự động bật.
- Preset scan “Small / Balanced / Large” để người dùng không cần hiểu từng con số.
- Per-workspace settings. Không nên đưa vào V1 vì cần định danh folder, lưu permission/handle và giải quyết sync/privacy phức tạp hơn nhiều.

## 5. Cấu trúc giao diện

Desktop Settings nên là page rộng, yên tĩnh, dùng sidebar navigation và form card; không dùng layout chật của Popup.

```text
+------------------------------------------------------------------+
| Markdown Plus                                      Saved / Error  |
+------------------+-----------------------------------------------+
| General          | Files & Workspace                             |
| Files & Workspace|                                               |
| Privacy & Data   | Folder scan depth        [ 4     ]            |
| Advanced         | Scan from root; 0 means root only.            |
|                  |                                               |
|                  | Maximum indexed files    [ 2000  ]            |
|                  | Maximum scanned folders  [ 500   ]            |
|                  |                                               |
|                  | Higher limits can make large scans slower.    |
|                  |                                               |
|                  | [Reset section]          [Save changes]       |
+------------------+-----------------------------------------------+
```

Nguyên tắc UX:

- Dùng label thật, không lộ tên key kỹ thuật như `maxScanDepth` cho người dùng phổ thông.
- Number input có min/max/step, nhưng validation service vẫn là nguồn bảo vệ cuối cùng.
- Dùng **Save changes** cho form số thay vì autosave mỗi phím gõ. Điều này tránh lưu trạng thái tạm như chuỗi rỗng hoặc dấu `-`.
- Toggle đơn có thể save ngay; form số dùng local draft và save theo section.
- Hiển thị lỗi cạnh field và một status vùng `aria-live` ở header.
- Disable Save khi không dirty hoặc đang lưu.
- Có focus ring rõ, label liên kết bằng `htmlFor`, target tối thiểu 44px và hỗ trợ `prefers-reduced-motion` theo design system hiện có.
- Settings scan mới áp dụng cho **lần scan/refresh tiếp theo**. Không tự hủy rồi khởi động lại một scan đang chạy và không thay tree đang hiển thị.
- Responsive: dưới `768px`, sidebar chuyển thành select/tab ngang và form về một cột.

## 6. Data contract và validation

### MVP

Giữ shape hiện tại:

```js
explorer: {
  maxScanDepth: 4,
  maxFiles: 2000,
  maxFolders: 500
}
```

Thêm một normalizer/validator dùng chung ở settings boundary:

- Chuyển numeric string hợp lệ thành integer.
- Từ chối `NaN`, `Infinity`, số âm và số ngoài range.
- Không để UI là lớp duy nhất bảo vệ schema vì import JSON và các caller khác vẫn có thể gửi payload xấu.
- `settings-service` tiếp tục deep-merge với defaults, sau đó normalize trước khi persist/trả về.
- Không log toàn bộ settings object nếu sau này settings chứa path hoặc dữ liệu nhạy cảm.

Các setting mới ở vòng sau là additive và được default-safe merge. Chỉ bump `settings.version` và viết migration nếu thay đổi trở nên không tương thích; không bump version chỉ vì thêm field có default.

## 7. Kiến trúc và file mapping

### 7.1 Settings UI

- `src/options/index.html`
  - Giữ làm entry của `options_page`, thay mount target cho React app.
- `src/options/index.jsx`
  - Mount `OptionsApp` bằng React 19 và import SCSS.
- `src/options/OptionsApp.jsx`
  - Page shell, section navigation, save status và route section đơn giản.
- `src/options/options.scss`
  - Style riêng cho full-page Settings; dùng token/phong cách từ Viewer-first design system, không import CSS của Popup như một dependency ngược.
- `src/options/sections/GeneralSettings.jsx`
- `src/options/sections/ExplorerSettings.jsx`
- `src/options/sections/PrivacySettings.jsx` — tạo khi làm phase privacy.
- `src/options/sections/AdvancedSettings.jsx`
- `src/options/hooks/useSettingsForm.js`
  - Local draft, dirty state, field errors, save/reset/import flow.

`src/options/index.js` cũ được thay bằng `index.jsx`; cập nhật script path trong HTML cùng change.

### 7.2 Shared settings boundary

- `src/settings/settings-client.js`
  - Wrapper `getSettings`, `saveSettings`, `resetSettings` dựa trên `sendMessage()` để Popup và Options không lặp request/envelope handling.
- `src/settings/settings-schema.js`
  - Pure normalization/validation và range constants.
- `src/settings/settings-service.js`
  - Normalize tại persistence boundary; vẫn sở hữu `chrome.storage` và default-safe merge.
- `src/settings/default-settings.js`
  - Chỉ thêm defaults khi triển khai các setting mới.

Popup hook hiện tại có thể chuyển sang dùng `settings-client.js`; không để Options import ngược từ `src/popup/hooks/useSettingsPersistence.js`.

### 7.3 Popup entry đến Settings

- `src/popup/PopupApp.jsx`
  - Thêm “Open Settings”, sau đó bỏ tab General một-field khi Settings MVP đã hoạt động.
- `src/popup/settings-constants.js`
  - Bỏ tab id/metadata không còn dùng.
- `src/popup/panels/GeneralPanel.jsx`
  - Xóa sau khi toggle `enabled` đã được chuyển.
- `src/popup/actions/open-options-page.js`
  - Cô lập side effect mở `chrome.runtime.openOptionsPage()` khỏi React component.

### 7.4 Runtime wiring cho phase sau

- `src/viewer/react/hooks/useExplorer.js`
  - Mở rộng getter từ scan limits thành explorer behavior, gồm `respectGitignore`.
- `src/viewer/explorer/explorer-workspace-session.js`
  - Truyền `respectGitignore` vào cả `scanFolderRecursive`, directory-handle và webkitdirectory scanners.
- `src/viewer/react/hooks/useExplorer.js`
  - Kiểm tra `restoreLastWorkspace` trước nhánh restore khi mount.
- `src/background/file-history-service.js` và `src/shared/file-history.js`
  - Áp dụng `history.enabled`/`history.maxEntries`; giữ history ở `chrome.storage.local`, không đưa đường dẫn file vào sync settings.
- `src/viewer/documents/document-loader.js`
  - Chỉ thay giới hạn 5 MiB khi phase document limit được duyệt; truyền setting qua document-session boundary thay vì import settings service vào loader.

Không cần thêm message type cho MVP vì `GET_SETTINGS`, `SAVE_SETTINGS`, `RESET_SETTINGS` và broadcast `SETTINGS_UPDATED` đã tồn tại.

## 8. Thứ tự triển khai

### Phase 1 — Settings MVP

1. Viết pure schema normalization và test range cho ba explorer limits.
2. Tạo shared settings client dùng message API hiện tại.
3. Chuyển Options page sang React + SCSS.
4. Xây General, Files & Workspace, Advanced import/export/reset.
5. Thêm entry “Open Settings” ở Popup và chuyển `enabled` khỏi Popup.
6. Bảo đảm Settings save phát broadcast hiện có, nhưng explorer chỉ dùng giới hạn mới từ lần refresh/scan kế tiếp.
7. Cập nhật `docs/project-overview-for-ai.md` vì vai trò Popup/Options thay đổi đáng kể.

### Phase 2 — Explorer behavior

1. Thêm `explorer.respectGitignore`.
2. Thêm `explorer.restoreLastWorkspace`.
3. Wire cả ba scan path và mount/restore path.
4. Thêm test cho mỗi path, đặc biệt bảo đảm tắt restore không xóa hoặc mở sai document hiện tại.

### Phase 3 — Privacy & data

1. Thêm `history.enabled` và `history.maxEntries`.
2. Cho file-history service đọc policy mà không trộn dữ liệu path vào sync storage.
3. Thêm clear action và UI giải thích local paths được lưu ở đâu.

### Phase 4 — Advanced resource limits (tùy chọn)

1. Đánh giá telemetry/bug reports trước khi expose giới hạn file text 5 MiB.
2. Nếu làm, thêm field chính xác theo loại tài liệu và test byte limit cho file URL lẫn virtual workspace file.

## 9. Test và verification

Unit tests cần có:

- Default-safe merge vẫn giữ ba explorer defaults.
- Normalize integer/range cho value từ UI và import JSON.
- Save partial không xóa các settings không liên quan.
- Reset section chỉ reset `explorer`; reset all khôi phục toàn bộ defaults.
- Import từ chối JSON sai hoặc field sai type/range mà không persist một phần.
- `respectGitignore` được truyền qua cả file-listing, directory-handle và webkitdirectory path khi triển khai Phase 2.
- `restoreLastWorkspace = false` bỏ qua restore nhưng sibling scan vẫn chạy.
- History disabled không record local path; max entries được áp dụng sau Phase 3.

Verification cho mỗi behavior phase:

```bash
npm test
npm run build
```

Manual smoke test:

1. Mở Settings từ Popup và từ Chrome extension details.
2. Đổi ba scan limits, reload Settings và xác nhận persist.
3. Mở workspace lớn, xác nhận stats dừng đúng file/folder/depth limit.
4. Đổi settings khi một viewer tab đang mở; xác nhận viewer không bị reset bất ngờ.
5. Refresh explorer và xác nhận giới hạn mới được áp dụng.
6. Test keyboard-only, invalid values, loading/saving/error và viewport nhỏ.

## 10. Acceptance criteria cho MVP

- Người dùng không cần sửa JSON để cấu hình folder depth, max files và max folders.
- Mỗi numeric field có label, helper text, range và lỗi cụ thể.
- Payload sai không thể đưa scanner vào trạng thái âm, `NaN`, vô hạn hoặc quá lớn ngoài hard safety cap.
- Save/Reset đi qua message layer hiện có và giữ response envelope chuẩn.
- Popup và Settings không chứa hai control có cùng ownership cho `enabled`.
- Không thêm Chrome permission mới.
- Không tự restart scan đang chạy khi settings thay đổi.
- `npm test` và `npm run build` pass.

## 11. Ngoài phạm vi MVP

- Bookmark folder và recent folders.
- Tự động cấp quyền đọc folder/file; quyền “Allow access to file URLs” vẫn do Chrome/user quyết định.
- Lưu folder path hoặc directory handle vào `chrome.storage.sync`.
- Per-folder profiles.
- Thay đổi thiết kế Viewer/Reader cùng lúc với Settings page.
