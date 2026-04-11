# UI Files Explorer - Detailed Feature Specification

## 1. Mục tiêu

Bổ sung tính năng **UI Files Explorer** để mở rộng trải nghiệm từ việc chỉ xem một file Markdown đơn lẻ sang việc làm việc với một **workspace folder** chứa nhiều file Markdown liên quan.

Tính năng này cho phép:

- Hiển thị các file Markdown cùng cấp với file hiện tại
- Cho phép mở một folder bất kỳ do user chọn
- Deep scan folder để tìm file Markdown
- Chỉ hiển thị các file có thể xem được
- Cho phép quay lại file gốc sau khi điều hướng sang file khác
- Cho phép bookmark folder để mở nhanh từ popup extension
- Có loading UI cho các tác vụ tốn thời gian
- Có **giới hạn số cấp scan tối đa** để tránh crash app hoặc làm app bị đơ khi folder quá lớn

---

## 2. Giá trị người dùng

Tính năng này giải quyết các nhu cầu sau:

- Khi đang đọc một file Markdown, user muốn thấy các file liên quan cùng cấp để chuyển nhanh
- User muốn mở cả một thư mục tài liệu như một workspace
- User muốn chỉ làm việc với các file Markdown, không bị lẫn file khác
- User muốn quay lại file gốc dễ dàng nếu đã mở nhiều file khác
- User muốn lưu lại các thư mục thường dùng để truy cập nhanh từ popup
- User cần phản hồi UI rõ ràng khi app đang scan dữ liệu để tránh cảm giác bị treo

---

## 3. Scope chức năng

### 3.1 Sibling Files Explorer
Khi user đang mở một file Markdown:
- Hiển thị danh sách các file Markdown cùng cấp với file đó
- Cho phép click để mở file khác trong cùng cấp
- Hiển thị file đang active
- Có nút **Back to original file** để quay lại file mở ban đầu

### 3.2 Open Folder Workspace
Cho phép user chọn một folder bất kỳ:
- Extension scan folder theo chiều sâu
- Chỉ index file Markdown hợp lệ
- Không mở folder như một file
- Không hiển thị file không hỗ trợ
- Sau khi scan xong, mở workspace ở tab mới hoặc view mới

### 3.3 Folder Bookmark
Cho phép user bookmark folder đang mở:
- Bookmark hiển thị trong popup extension
- Cho phép mở nhanh lại folder từ popup
- Có thể hiển thị thêm recent folders
- Hỗ trợ remove bookmark

### 3.4 Loading UI
Các tác vụ có thể tốn thời gian phải có loading UI, tối thiểu gồm:
- Scan folder
- Re-scan folder
- Restore bookmarked folder
- Reload workspace lớn

### 3.5 Scan Depth Limit
Deep scan folder phải có giới hạn số cấp tối đa có thể config.

Ví dụ:
- `maxScanDepth = 2` -> scan root + 2 cấp con
- `maxScanDepth = 3` -> scan root + 3 cấp con

Mục tiêu:
- tránh scan quá sâu làm nặng app
- tránh crash hoặc treo UI
- cho phép user hoặc hệ thống điều chỉnh theo nhu cầu

---

## 4. Trải nghiệm người dùng mong muốn

### 4.1 Khi mở một file Markdown bình thường
Nếu file hiện tại chưa nằm trong workspace folder đã biết:
- Viewer vẫn render file bình thường
- Explorer có thể hiện:
  - current file
  - CTA: **Open this folder**
  - CTA: **Choose another folder**
- Nếu xác định được sibling files, hiển thị danh sách file Markdown cùng cấp

### 4.2 Khi mở folder
Flow:
1. User bấm **Open Folder**
2. Trình chọn folder xuất hiện
3. User chọn folder
4. UI chuyển sang trạng thái loading
5. Extension scan folder theo config hiện tại
6. Sau khi scan xong:
   - build explorer tree
   - chọn file mặc định để mở
   - mở workspace ở tab mới hoặc khung mới

### 4.3 Khi mở file khác trong explorer
- File mới được render trong workspace hiện tại
- File active được highlight
- Nếu không còn ở file gốc ban đầu, hiện nút **Back to original file**

### 4.4 Khi bookmark folder
- User bấm **Bookmark Folder**
- Hệ thống lưu metadata + handle
- Popup extension hiển thị folder trong mục bookmark
- User có thể bấm mở lại nhanh từ popup

---

## 5. UI specification

### 5.1 Viewer Sidebar
Sidebar trái nên có 2 tab chính:
- **Files**
- **Outline**

#### Files tab
Hiển thị:
- tên workspace/folder hiện tại
- danh sách file Markdown đã index
- cây thư mục nếu scan nhiều cấp
- file active
- ô search nếu làm ở giai đoạn sau

#### Outline tab
Hiển thị TOC của file đang mở

Lý do:
- không làm mất TOC hiện có
- giữ Explorer và TOC cùng tồn tại trong một vị trí quen thuộc

### 5.2 Header / Toolbar
Nên có thêm các action sau:
- **Back to original file**
- **Open Folder**
- **Bookmark Folder**
- tên file hiện tại
- tên workspace hiện tại

### 5.3 Popup extension
Popup không nên hiển thị cây file đầy đủ.

Popup nên chỉ gồm:
- Bookmarked folders
- Recent folders
- Open Folder
- Reopen last workspace

Lý do:
- popup nhỏ
- explorer tree trong popup khó dùng
- giữ popup đơn giản, dễ maintain

### 5.4 Loading UI
Cần có loading UI rõ ràng cho các tác vụ có thể lâu.

#### Trường hợp cần loading:
- scan folder lần đầu
- re-scan folder
- mở bookmarked folder lớn
- restore workspace cũ

#### Loading UI tối thiểu:
- spinner/progress indicator
- text trạng thái, ví dụ:
  - `Scanning folder...`
  - `Loading workspace...`
  - `Restoring bookmarked folder...`

#### Nâng cao:
- hiển thị số file đã scan được
- hiển thị số folder đã duyệt
- cho phép cancel nếu scan quá lâu

---

## 6. Scan behavior

### 6.1 File types được hỗ trợ
Chỉ index các file có thể view:
- `.md`
- `.markdown`

Có thể mở rộng sau:
- `.mdx`

### 6.2 Không hiển thị
- folder như một file mở được
- file không hỗ trợ
- file nhị phân
- file hệ thống/ẩn nếu muốn UI sạch hơn

### 6.3 Deep scan
Khi user chọn folder:
- scan đệ quy cây thư mục
- nhưng chỉ index file Markdown
- giữ lại cấu trúc thư mục để hiển thị explorer

### 6.4 Max scan depth
Phải có một config cụ thể, ví dụ:
- mặc định `maxScanDepth = 4` (nguồn duy nhất: `DEFAULT_EXPLORER_MAX_SCAN_DEPTH` trong `src/shared/constants/explorer.js`, được `DEFAULT_SETTINGS.explorer` tái sử dụng)

Ý nghĩa:
- root = depth 0
- thư mục con trực tiếp = depth 1
- thư mục cháu = depth 2
- thư mục chắt = depth 3
- thư mục sâu hơn một cấp nữa = depth 4 (giới hạn mặc định)

Nếu vượt quá depth này:
- không scan sâu hơn
- có thể hiển thị nhẹ rằng explorer đã bị giới hạn bởi depth config

### 6.5 Max items safeguard
Ngoài giới hạn depth, nên cân nhắc thêm một số giới hạn an toàn:
- max files scanned
- max folders scanned
- timeout mềm cho scan lớn

Các giới hạn này giúp tránh trường hợp:
- user chọn nhầm folder rất lớn
- app đơ do scan quá nhiều node

---

## 7. Config model gợi ý

```js
{
  explorer: {
    enabled: true,
    maxScanDepth: 4,
    maxFiles: 2000,
    maxFolders: 500,
    showOnlySupportedFiles: true,
    openWorkspaceInNewTab: true
  }
}
```

### Giải thích
- `enabled`: bật/tắt Explorer
- `maxScanDepth`: số cấp scan tối đa
- `maxFiles`: giới hạn số file index
- `maxFolders`: giới hạn số folder duyệt
- `showOnlySupportedFiles`: chỉ hiện file mở được
- `openWorkspaceInNewTab`: mở workspace ở tab mới

---

## 8. Runtime state gợi ý

### 8.1 Workspace state
```js
{
  workspaceId: "workspace-001",
  rootFolderName: "docs",
  originalFilePath: "guides/intro.md",
  currentFilePath: "guides/setup.md",
  scanStatus: "idle", // idle | scanning | ready | error
  scanProgress: {
    scannedFiles: 120,
    scannedFolders: 30,
    skippedByDepth: 12
  }
}
```

### 8.2 Bookmark metadata
```js
{
  id: "bookmark-1",
  label: "Project Docs",
  rootFolderName: "docs",
  createdAt: 1712345678901,
  lastOpenedAt: 1712349999999
}
```

---

## 9. UX rules quan trọng

- Explorer chỉ hiển thị file có thể mở được
- User luôn biết đâu là:
  - file gốc
  - file hiện tại
  - workspace hiện tại
- Nếu user đã rời file gốc, phải có cách quay lại rõ ràng
- Popup chỉ dùng để mở nhanh, không ôm full explorer
- Tác vụ scan dài phải có loading UI
- Scan phải có giới hạn để tránh app bị treo

---

## 10. Edge cases cần xử lý

- Folder quá lớn
- Folder có quá nhiều cấp con
- Folder không có file Markdown
- File đã bị xóa sau khi index
- Folder bookmark còn nhưng quyền không còn
- User đổi tên file/folder sau khi bookmark
- Original file không còn tồn tại
- Scan chạm giới hạn depth
- Scan chạm giới hạn số files/folders

---

## 11. Chia giai đoạn implementation gợi ý

### Giai đoạn 1
Sibling files explorer:
- hiển thị file cùng cấp
- active file
- back to original file

### Giai đoạn 2
Open folder workspace:
- chọn folder
- scan có depth limit
- loading UI
- render tree explorer

### Giai đoạn 3
Bookmarks + recent folders:
- lưu metadata
- lưu handle
- popup open nhanh

### Giai đoạn 4
Polish:
- search trong explorer
- collapse/expand folder
- rescan
- cancel loading
- progress chi tiết hơn

---

## 12. Mô tả feature ngắn gọn kiểu spec

> UI Files Explorer cho phép người dùng duyệt các file Markdown liên quan trong cùng một workspace. Khi mở một file Markdown, extension có thể hiển thị các file cùng cấp và cho phép quay lại file gốc. Người dùng cũng có thể chọn một thư mục bất kỳ làm workspace; extension sẽ quét đệ quy thư mục đó để tìm file Markdown, nhưng việc quét phải bị giới hạn bởi một cấu hình `maxScanDepth` cụ thể nhằm tránh làm ứng dụng bị treo hoặc crash. Chỉ các file Markdown có thể xem được mới được index và hiển thị trong explorer. Các tác vụ có thể tốn thời gian như scan folder hoặc restore workspace phải có loading UI rõ ràng. Workspace hiện tại có thể được bookmark để mở lại nhanh từ popup của extension.
