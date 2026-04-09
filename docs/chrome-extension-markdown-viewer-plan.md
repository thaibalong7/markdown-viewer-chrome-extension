# Chrome Extension Markdown Plus - Project Specification & Phased Implementation Plan

## 1) Mục tiêu dự án

Xây dựng một Chrome Extension có khả năng tự động nhận biết khi người dùng mở một file Markdown trên trình duyệt và hiển thị lại nội dung dưới dạng HTML dễ đọc, có thể tùy biến giao diện và mở rộng bằng plugin.

Dự án hướng tới các mục tiêu chính sau:

- Tự động detect trang đang hiển thị Markdown/raw Markdown
- Render Markdown thành giao diện đẹp, dễ đọc
- Có **Table of Contents ở bên trái**
- Có **nút Settings ở góc trên bên phải**, bấm vào để mở panel cấu hình
- Hỗ trợ hệ thống plugin để mở rộng khả năng render
- Cho phép bật/tắt plugin
- Cho phép điều chỉnh typography và màu sắc các thành phần chính
- Có kiến trúc đủ sạch để scale dần từ MVP tới bản hoàn chỉnh

---

## 2) Trải nghiệm người dùng mong muốn

Khi người dùng mở một URL/file Markdown:

1. Extension tự phát hiện đây là nội dung Markdown
2. Thay thế cách hiển thị raw text mặc định bằng giao diện viewer
3. Bố cục chính:
   - **Sidebar trái:** Table of Contents
   - **Main content:** nội dung Markdown đã render
   - **Góc trên bên phải:** nút mở Settings/Options
4. Người dùng có thể:
   - xem mục lục và click để nhảy đến section
   - bật/tắt plugin như Mermaid, Math, code highlight
   - đổi font size, font family, line height
   - đổi màu các nhóm thành phần như heading, code block, table, link
   - đổi theme sáng/tối
5. Cấu hình được lưu lại cho các lần dùng tiếp theo

---

## 3) Scope chức năng

## 3.1 Core rendering
- Detect file/trang Markdown
- Extract raw Markdown content
- Parse Markdown sang HTML
- Sanitize output để tránh XSS
- Render HTML vào viewer UI
- Hỗ trợ các syntax cơ bản:
  - heading
  - paragraph
  - ordered/unordered list
  - blockquote
  - code block
  - inline code
  - table
  - image
  - link

## 3.2 Layout & UI
- Sidebar trái cho TOC
- Nội dung chính ở giữa/phải
- Header nổi hoặc top toolbar đơn giản
- Nút Settings ở góc trên bên phải
- Settings panel trượt ra hoặc popover
- Responsive ở mức đủ dùng cho nhiều kích thước màn hình

## 3.3 Table of Contents
- Tự sinh TOC từ heading
- Hiển thị phân cấp theo level heading
- Click TOC để scroll tới section
- Highlight heading đang active khi scroll
- Có thể bật/tắt hiển thị TOC

## 3.4 Settings
- Theme light/dark
- Font family
- Font size
- Line height
- Content width
- Show/hide TOC
- Bật/tắt plugin
- Màu cho một số nhóm thành phần:
  - heading
  - body text
  - link
  - code block background
  - code block text
  - table border/header/background

## 3.5 Plugin system
- Kiến trúc plugin độc lập
- Plugin có thể enable/disable
- Plugin có config riêng
- Plugin có hook lifecycle

Plugin nên hỗ trợ theo giai đoạn:
- Code highlight
- Mermaid
- Task list
- Anchor heading
- Math
- Footnote
- Emoji

## 3.6 Persistence
- Lưu settings bằng `chrome.storage`
- Hỗ trợ default settings
- Hỗ trợ migration settings sau này khi schema thay đổi

## 3.7 Extension UX
- Popup đơn giản để bật/tắt extension nhanh
- Options page để chỉnh cấu hình đầy đủ
- Content script takeover trang Markdown khi cần

## 3.8 Diagram export & code block UX
- Export Mermaid chart sang image (ưu tiên SVG, có tùy chọn PNG)
- Header code block hiển thị:
  - bên trái: tên ngôn ngữ (ví dụ `js`, `ts`, `bash`)
  - bên phải: nút copy
- Copy giữ nguyên nội dung code gốc (không dính line number hoặc text trang trí UI)
- Trải nghiệm fallback an toàn khi Mermaid/copy API không khả dụng

---

## 4) Bố cục giao diện đề xuất

```text
┌──────────────────────────────────────────────────────────────────────┐
│                                                          [Settings] │
├──────────────────────────────────────────────────────────────────────┤
│  TOC Sidebar          │                                             │
│  - Introduction       │                                             │
│  - Architecture       │           Rendered Markdown Content         │
│    - Core             │                                             │
│    - Plugins          │                                             │
│  - Roadmap            │                                             │
│                       │                                             │
│                       │                                             │
└──────────────────────────────────────────────────────────────────────┘
```

### Chi tiết:
- **Sidebar bên trái**
  - width cố định hoặc resizable sau này
  - sticky khi scroll
  - chứa TOC
- **Main content**
  - nội dung Markdown đã render
  - layout centered, readable width
- **Top-right Settings button**
  - luôn dễ thấy
  - click mở Settings panel
- **Settings panel**
  - có thể là drawer từ phải sang
  - nhóm setting theo section:
    - General
    - Theme
    - Typography
    - Plugins
    - Advanced

---

## 5) Kiến trúc tổng thể

Dự án nên chia thành các khối chính sau:

### 5.1 Background layer
Vai trò:
- trung tâm message routing
- quản lý storage
- hỗ trợ popup/options/content script giao tiếp

### 5.2 Content layer
Vai trò:
- detect trang Markdown
- extract raw content
- mount viewer app vào trang
- đồng bộ render với settings hiện tại

### 5.3 Viewer layer
Vai trò:
- render pipeline
- quản lý layout
- quản lý state runtime
- quản lý TOC
- apply theme/style
- xử lý interaction của người dùng

### 5.4 Plugin layer
Vai trò:
- registry plugin
- lifecycle hooks
- enable/disable plugin
- plugin config

### 5.5 Settings layer
Vai trò:
- default settings
- validate schema
- merge config
- load/save config từ storage

### 5.6 UI entrypoints
- Popup
- Options page

---

## 6) Kiến trúc runtime chi tiết

## 6.1 Flow detect & render
1. Content script được inject
2. Detector kiểm tra trang hiện tại có phải Markdown không
3. Raw content extractor lấy nội dung Markdown
4. Settings service đọc config từ storage
5. Viewer app được khởi tạo
6. Markdown engine parse nội dung
7. Plugin manager gắn plugin đang bật
8. HTML được render ra DOM
9. TOC builder sinh TOC
10. Style generator apply theme + typography
11. Event bindings hoạt động:
   - click TOC
   - click Settings
   - update settings
   - re-render khi cần

## 6.2 Flow update settings
1. User bấm nút Settings góc trên bên phải
2. Settings panel mở ra
3. User thay đổi config
4. Settings service validate + save
5. Viewer state update
6. Một số setting chỉ cần update CSS variables
7. Một số setting cần re-render full document
8. TOC/plugin/UI được đồng bộ lại nếu cần

## 6.3 Flow bật/tắt plugin
1. User bật/tắt plugin trong Settings
2. Plugin config được lưu
3. Viewer tạo lại render pipeline
4. Chỉ load plugin cần thiết
5. Re-render document

---

## 7) Cấu trúc thư mục đề xuất

```text
markdown-plus-extension/
├─ manifest.json
├─ package.json
├─ README.md
├─ public/
│  ├─ icons/
│  └─ static/
├─ src/
│  ├─ background/
│  │  ├─ index.js
│  │  ├─ message-router.js
│  │  └─ background-storage.service.js
│  │
│  ├─ content/
│  │  ├─ index.js
│  │  ├─ bootstrap.js
│  │  ├─ page-detector.js
│  │  ├─ raw-content-extractor.js
│  │  ├─ page-overrider.js
│  │  └─ content-message-client.js
│  │
│  ├─ viewer/
│  │  ├─ app.js
│  │  ├─ shell/
│  │  │  ├─ viewer-shell.js
│  │  │  ├─ header-toolbar.js
│  │  │  ├─ toc-sidebar.js
│  │  │  ├─ content-pane.js
│  │  │  └─ settings-drawer.js
│  │  │
│  │  ├─ core/
│  │  │  ├─ renderer.js
│  │  │  ├─ markdown-engine.js
│  │  │  ├─ sanitize-html.js
│  │  │  ├─ toc-builder.js
│  │  │  ├─ scroll-spy.js
│  │  │  ├─ style-generator.js
│  │  │  └─ dom-renderer.js
│  │  │
│  │  ├─ state/
│  │  │  ├─ viewer-state.js
│  │  │  ├─ settings-state.js
│  │  │  └─ plugin-state.js
│  │  │
│  │  ├─ actions/
│  │  │  ├─ render-document.js
│  │  │  ├─ update-settings.js
│  │  │  ├─ toggle-plugin.js
│  │  │  ├─ open-settings.js
│  │  │  └─ rebuild-toc.js
│  │  │
│  │  └─ styles/
│  │     ├─ base.css
│  │     ├─ layout.css
│  │     ├─ content.css
│  │     ├─ toc.css
│  │     └─ settings.css
│  │
│  ├─ plugins/
│  │  ├─ registry/
│  │  │  ├─ plugin-manager.js
│  │  │  ├─ plugin-registry.js
│  │  │  └─ plugin-hooks.js
│  │  │
│  │  ├─ core/
│  │  │  ├─ code-highlight.plugin.js
│  │  │  ├─ task-list.plugin.js
│  │  │  ├─ anchor-heading.plugin.js
│  │  │  └─ table-enhance.plugin.js
│  │  │
│  │  ├─ optional/
│  │  │  ├─ mermaid.plugin.js
│  │  │  ├─ math.plugin.js
│  │  │  ├─ footnote.plugin.js
│  │  │  └─ emoji.plugin.js
│  │  │
│  │  └─ shared/
│  │     ├─ plugin-types.js
│  │     └─ plugin-defaults.js
│  │
│  ├─ settings/
│  │  ├─ default-settings.js
│  │  ├─ settings.schema.js
│  │  ├─ settings.service.js
│  │  ├─ settings.migrations.js
│  │  └─ storage-keys.js
│  │
│  ├─ popup/
│  │  ├─ index.html
│  │  ├─ index.js
│  │  └─ popup.css
│  │
│  ├─ options/
│  │  ├─ index.html
│  │  ├─ index.js
│  │  ├─ options.css
│  │  └─ sections/
│  │     ├─ general-settings.js
│  │     ├─ theme-settings.js
│  │     ├─ typography-settings.js
│  │     ├─ plugin-settings.js
│  │     └─ advanced-settings.js
│  │
│  ├─ messaging/
│  │  ├─ message-types.js
│  │  ├─ send-message.js
│  │  └─ on-message.js
│  │
│  ├─ theme/
│  │  ├─ themes/
│  │  │  ├─ light.js
│  │  │  ├─ dark.js
│  │  │  └─ github.js
│  │  ├─ theme-service.js
│  │  └─ css-vars.js
│  │
│  └─ shared/
│     ├─ constants/
│     ├─ helpers/
│     └─ models/
└─ dist/
```

---

## 8) Chi tiết vai trò các module chính

## 8.1 `content/page-detector.js`
Chịu trách nhiệm xác định:
- URL hiện tại có đuôi `.md`, `.markdown` không
- page có đang hiển thị raw text hoặc `<pre>` chứa markdown không
- domain có thuộc nhóm raw markdown phổ biến không

Output:
```js
{
  isMarkdown: true,
  confidence: 'high',
  sourceType: 'url-extension' // hoặc raw-pre, raw-text, remote-text
}
```

## 8.2 `content/raw-content-extractor.js`
Lấy raw markdown từ:
- `document.body.innerText`
- thẻ `<pre>`
- nội dung text duy nhất trên page
- fallback fetch nếu phù hợp

## 8.3 `viewer/core/markdown-engine.js`
Đóng gói markdown parser chính.
Nên ẩn thư viện cụ thể ra sau interface nội bộ để dễ thay đổi sau này.

Interface gợi ý:
```js
render(markdown, context) => { html, tokens, metadata }
```

## 8.4 `viewer/core/renderer.js`
Điều phối pipeline:
- preprocess markdown
- apply syntax plugins
- render HTML
- sanitize
- post-process DOM
- build TOC
- return render result

## 8.5 `viewer/core/toc-builder.js`
Sinh dữ liệu TOC từ heading:
```js
[
  { id: 'intro', text: 'Introduction', level: 1 },
  { id: 'core-rendering', text: 'Core Rendering', level: 2 }
]
```

## 8.6 `viewer/shell/toc-sidebar.js`
Render sidebar trái:
- tree TOC
- active item
- click scroll
- collapse/expand ở các phase sau

## 8.7 `viewer/shell/header-toolbar.js`
Chứa:
- title/logo nhỏ
- nút toggle TOC nếu cần
- nút Settings ở góc trên bên phải

## 8.8 `viewer/shell/settings-drawer.js`
Panel settings gồm:
- General
- Theme
- Typography
- Plugins
- Advanced

## 8.9 `plugins/registry/plugin-manager.js`
Quản lý:
- plugin registry
- resolve plugin enabled
- chạy hook theo thứ tự

## 8.10 `settings/settings.service.js`
API trung tâm cho settings:
- getSettings
- saveSettings
- resetSettings
- mergeWithDefaults
- migrateIfNeeded

---

## 9) Settings model đề xuất

```js
{
  enabled: true,
  layout: {
    showToc: true,
    tocWidth: 280,
    contentMaxWidth: 980,
    settingsButtonPosition: 'top-right'
  },
  theme: {
    mode: 'dark',
    preset: 'github'
  },
  typography: {
    fontFamily: 'system-ui',
    fontSize: 16,
    lineHeight: 1.7,
    headingFontFamily: 'inherit',
    codeFontFamily: 'monospace'
  },
  colors: {
    background: '#0d1117',
    text: '#c9d1d9',
    heading: '#ffffff',
    link: '#58a6ff',
    codeBg: '#161b22',
    codeText: '#c9d1d9',
    tableBorder: '#30363d',
    tableHeaderBg: '#111827',
    tableRowAltBg: '#0f172a'
  },
  plugins: {
    codeHighlight: { enabled: true },
    taskList: { enabled: true },
    anchorHeading: { enabled: true },
    tableEnhance: { enabled: true },
    mermaid: { enabled: true, theme: 'dark' },
    math: { enabled: false },
    footnote: { enabled: false },
    emoji: { enabled: false }
  }
}
```

---

## 10) Nguyên tắc kỹ thuật quan trọng

### 10.1 Ưu tiên Shadow DOM
Nên mount viewer trong Shadow DOM để:
- tránh CSS của trang gốc phá giao diện extension
- giữ style ổn định hơn

### 10.2 CSS variables cho theme
Dùng CSS variables để:
- update nhanh theme/font mà không cần full re-render trong nhiều trường hợp
- tách style khỏi logic render

### 10.3 Tách syntax plugin và post-render plugin
- Syntax plugin: can thiệp lúc parse markdown
- Post-render plugin: can thiệp sau khi có DOM/HTML

### 10.4 Sanitize output
Dù parser có option an toàn, vẫn nên có bước sanitize độc lập.

### 10.5 Messaging chuẩn hóa
Không hard-code message type lung tung.
Cần file constants riêng cho message types.

---

## 11) Kế hoạch triển khai theo giai đoạn

Dưới đây là các giai đoạn nên thực hiện theo thứ tự. Mục tiêu là mỗi phase đều tạo ra một mốc có thể chạy được, test được, và làm nền cho phase tiếp theo.

---

## Phase 0 - Foundation & project skeleton

### Mục tiêu
Dựng khung dự án để có thể phát triển ổn định về sau.

### Kết quả cần đạt
- Có extension load được trên Chrome
- Có manifest
- Có background script
- Có content script
- Có popup/options entry cơ bản
- Có messaging nền tảng
- Có settings service tối thiểu

### File nên implement
- `manifest.json`
- `package.json`
- `src/background/index.js`
- `src/background/message-router.js`
- `src/content/index.js`
- `src/content/bootstrap.js`
- `src/messaging/message-types.js`
- `src/messaging/send-message.js`
- `src/settings/default-settings.js`
- `src/settings/storage-keys.js`
- `src/settings/settings.service.js`
- `src/shared/helpers/logger.js`

### Vì sao phase này cần riêng
Nếu không dựng foundation sớm, các phase sau sẽ phải sửa cấu trúc nhiều lần, dễ vỡ kiến trúc.

---

## Phase 1 - Markdown detection & raw content takeover

### Mục tiêu
Tự động nhận ra trang Markdown và lấy được raw content để chuẩn bị render.

### Kết quả cần đạt
- Detect `.md`/`.markdown`
- Detect raw markdown page phổ biến
- Extract được raw markdown
- Mount root container viewer lên trang
- Có fallback nếu không detect được

### File nên implement
- `src/content/page-detector.js`
- `src/content/raw-content-extractor.js`
- `src/content/page-overrider.js`
- cập nhật `src/content/bootstrap.js`

### Deliverable
- Mở một file Markdown trên browser thì extension takeover được page

### Lưu ý
Ở phase này chưa cần render đẹp hoàn chỉnh. Chỉ cần lấy nội dung và mount app được.

---

## Phase 2 - Core markdown rendering MVP

### Mục tiêu
Render Markdown cơ bản thành HTML dễ đọc.

### Kết quả cần đạt
- Parse markdown
- Render HTML an toàn
- Hiển thị các syntax cơ bản
- Có layout chính gồm sidebar placeholder + content pane + settings button placeholder

### File nên implement
- `src/viewer/app.js`
- `src/viewer/core/markdown-engine.js`
- `src/viewer/core/renderer.js`
- `src/viewer/core/sanitize-html.js`
- `src/viewer/core/dom-renderer.js`
- `src/viewer/shell/viewer-shell.js`
- `src/viewer/shell/content-pane.js`
- `src/viewer/shell/header-toolbar.js`
- `src/viewer/styles/base.css`
- `src/viewer/styles/layout.css`
- `src/viewer/styles/content.css`

### Deliverable
- User mở Markdown và thấy nội dung render sạch, dễ đọc
- Có nút Settings ở góc trên bên phải, chưa cần đầy đủ tính năng

### Vì sao tách riêng phase này
Đây là phase đầu tiên tạo ra giá trị thực tế cho user.

---

## Phase 3 - Table of Contents hoàn chỉnh ở sidebar trái

### Mục tiêu
Biến TOC thành một feature usable thực sự.

### Kết quả cần đạt
- Sinh TOC từ heading
- Sidebar trái hiển thị TOC
- Click để scroll tới section
- Highlight mục đang active theo scroll
- Sticky sidebar
- Có option bật/tắt TOC

### File nên implement
- `src/viewer/core/toc-builder.js`
- `src/viewer/core/scroll-spy.js`
- `src/viewer/shell/toc-sidebar.js`
- `src/viewer/styles/toc.css`
- `src/viewer/actions/rebuild-toc.js`
- cập nhật `src/viewer/app.js`
- cập nhật `src/viewer/shell/viewer-shell.js`

### Deliverable
- Sidebar trái hoạt động đúng, trải nghiệm gần giống document viewer thực thụ

### Vì sao đặt sớm
TOC là một phần core của sản phẩm theo yêu cầu ban đầu, không nên để quá muộn.

---

## Phase 4 - Settings drawer & runtime customization

### Trạng thái
✅ Completed

### Mục tiêu
Làm nút Settings góc trên bên phải hoạt động đầy đủ.

### Kết quả cần đạt
- Mở/đóng settings drawer
- Điều chỉnh:
  - theme mode
  - font size
  - font family
  - line height
  - content width
  - show/hide TOC
- Save settings vào storage
- Apply lại lên viewer runtime

### File nên implement
- `src/viewer/shell/settings-drawer.js`
- `src/viewer/styles/settings.css`
- `src/viewer/actions/open-settings.js`
- `src/viewer/actions/update-settings.js`
- `src/viewer/state/settings-state.js`
- `src/theme/theme-service.js`
- `src/theme/css-vars.js`
- cập nhật `src/settings/settings.service.js`

### Deliverable
- User có thể bấm nút ở góc trên bên phải để cấu hình viewer ngay trong trang

### Vì sao phase này quan trọng
Đây là phần hiện thực hóa yêu cầu customization của sản phẩm.

---

## Phase 5 - Theme & color customization

### Trạng thái
✅ Completed

### Mục tiêu
Cho phép chỉnh sâu về giao diện.

### Kết quả cần đạt
- Light/Dark/GitHub preset
- Custom color cho:
  - heading
  - body text
  - link
  - code block
  - table
- Apply bằng CSS variables
- Có live preview

### File nên implement
- `src/theme/themes/light.js`
- `src/theme/themes/dark.js`
- `src/theme/themes/github.js`
- `src/viewer/core/style-generator.js`
- cập nhật `src/viewer/shell/settings-drawer.js`
- cập nhật `src/settings/default-settings.js`

### Deliverable
- UI có thể cá nhân hóa rõ rệt
- Không cần full re-render cho phần lớn thay đổi style

### Vì sao tách khỏi Phase 4
Phase 4 tập trung vào khung Settings và các setting nền tảng. Color customization làm riêng sẽ tránh phase bị quá nặng.

---

## Phase 6 - Plugin architecture

### Mục tiêu
Đưa dự án sang mô hình mở rộng được.

### Kết quả cần đạt
- Có plugin registry
- Có plugin lifecycle hooks
- Có plugin config
- Có enable/disable plugin
- Có lazy evaluation cơ bản

### File nên implement
- `src/plugins/registry/plugin-hooks.js`
- `src/plugins/registry/plugin-registry.js`
- `src/plugins/registry/plugin-manager.js`
- `src/plugins/shared/plugin-types.js`
- `src/plugins/shared/plugin-defaults.js`
- `src/viewer/state/plugin-state.js`
- cập nhật `src/viewer/core/renderer.js`
- cập nhật `src/viewer/shell/settings-drawer.js`

### Deliverable
- Có thể thêm plugin mới mà không phải sửa lõi renderer quá nhiều

### Vì sao phase này chưa làm từ đầu
Làm plugin system quá sớm sẽ tăng độ phức tạp khi core rendering còn chưa ổn định.

---

## Phase 7 - Core plugins thiết yếu

### Mục tiêu
Triển khai các plugin mang lại giá trị cao nhất trước.

### Plugin ưu tiên
1. Code highlight
2. Task list
3. Anchor heading
4. Table enhance

### Kết quả cần đạt
- Bật/tắt từng plugin trong Settings
- Tác động render ổn định
- Plugin có config tối thiểu

### File nên implement
- `src/plugins/core/code-highlight.plugin.js`
- `src/plugins/core/task-list.plugin.js`
- `src/plugins/core/anchor-heading.plugin.js`
- `src/plugins/core/table-enhance.plugin.js`

### Deliverable
- Viewer đạt mức usable tốt cho đa số file Markdown

### Vì sao chọn nhóm plugin này trước
Chúng phổ biến, ít rủi ro hơn Mermaid/Math và nâng chất lượng trải nghiệm rõ rệt.

---

## Phase 8 - Optional plugins nâng cao (DONE)

### Mục tiêu
Bổ sung các plugin đặc thù và nặng hơn.

### Plugin ưu tiên
1. Mermaid
2. Math
3. Footnote
4. Emoji

### Kết quả cần đạt
- Render Mermaid diagram
- Render math nếu có syntax phù hợp
- Toggle plugin trong Settings
- Có xử lý lỗi graceful nếu plugin fail
- Bổ sung roadmap mở rộng cho Mermaid export sau khi render ổn định

### File nên implement
- `src/plugins/optional/mermaid.plugin.js`
- `src/plugins/optional/math.plugin.js`
- `src/plugins/optional/footnote.plugin.js`
- `src/plugins/optional/emoji.plugin.js`

### Deliverable
- Viewer đủ mạnh cho tài liệu kỹ thuật và tài liệu có diagram

### Vì sao để sau
Các plugin này nặng, thêm dependency, và thường cần xử lý runtime phức tạp hơn.

---

## Phase 8.1 - Mermaid export actions (NEW)

### Mục tiêu
Mở rộng plugin Mermaid để người dùng có thể xuất sơ đồ ra ảnh trực tiếp từ viewer.

### Kết quả cần đạt
- Mỗi Mermaid block có action `Export`
- Hỗ trợ export `SVG` (MVP), tùy chọn `PNG` ở bước sau
- File export có tên mặc định theo thứ tự block hoặc tiêu đề section
- Khi export lỗi, hiển thị thông báo nhẹ và không ảnh hưởng phần render còn lại

### File nên implement
- `src/plugins/optional/mermaid.plugin.js`
- `src/viewer/actions/*` (handler cho export)
- `src/viewer/styles/content.css` (nút action cho block Mermaid)
- cập nhật `src/viewer/shell/settings-drawer.js` (nếu có toggle định dạng export mặc định)

### Deliverable
- Người dùng có thể export Mermaid chart thành ảnh ngay trong trang đọc Markdown.

---

## Phase 9 - Popup & Options page hoàn chỉnh

### Mục tiêu
Hoàn thiện trải nghiệm extension ở ngoài viewer runtime.

### Kết quả cần đạt
- Popup:
  - toggle nhanh extension
  - current status
  - open options page
- Options page:
  - đầy đủ toàn bộ setting
  - reset settings
  - import/export config nếu muốn

### File nên implement
- `src/popup/index.html`
- `src/popup/index.js`
- `src/popup/popup.css`
- `src/options/index.html`
- `src/options/index.js`
- `src/options/options.css`
- `src/options/sections/general-settings.js`
- `src/options/sections/theme-settings.js`
- `src/options/sections/typography-settings.js`
- `src/options/sections/plugin-settings.js`
- `src/options/sections/advanced-settings.js`

### Deliverable
- Extension có cấu hình đầy đủ, không chỉ dựa vào panel trong content page

### Vì sao không làm quá sớm
Trước khi settings model ổn định, làm options page đầy đủ sẽ phải sửa nhiều lần.

---

## Phase 10 - Hardening, performance, polish

### Mục tiêu
Tối ưu sản phẩm để sẵn sàng dùng thực tế.

### Kết quả cần đạt
- Optimize render file lớn
- Debounce re-render
- Cải thiện scroll performance
- Better error boundary
- Fallback khi plugin fail
- Settings migration
- Logging/debug mode
- Test thủ công trên nhiều nguồn markdown
- QA cho local file, raw GitHub, gist raw, static file server
- Chuẩn hóa UI code block: language label bên trái + copy button bên phải

### File nên implement / rà soát
- `src/viewer/utils/debounce.js`
- `src/settings/settings.migrations.js`
- `src/shared/helpers/logger.js`
- cập nhật hầu hết file core
- bổ sung test docs/manual QA checklist
- `src/viewer/styles/content.css`
- `src/viewer/core/renderer.js` (gắn metadata ngôn ngữ cho code block)
- `src/plugins/core/code-highlight.plugin.js` hoặc post-render hook tương đương

### Deliverable
- Bản gần production
- Ít lỗi edge case
- Trải nghiệm mượt hơn

### Vì sao phase này để cuối
Đây là giai đoạn tối ưu sau khi core feature đã chốt.

---

## 12) Thứ tự ưu tiên nếu cần rút gọn

Nếu muốn ra bản usable nhanh nhất, nên ưu tiên theo thứ tự:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 6
7. Phase 7
8. Phase 8
9. Phase 9
10. Phase 10

Nếu cần MVP ngắn nhất:
- Phase 0 → 4 là đủ để có sản phẩm dùng được
- sau đó mới làm plugin architecture + plugin nặng

---

## 13) Các file quan trọng nhất của MVP

Nếu chỉ chọn ít file để bắt đầu trước, nên ưu tiên:

- `manifest.json`
- `src/content/bootstrap.js`
- `src/content/page-detector.js`
- `src/content/raw-content-extractor.js`
- `src/viewer/app.js`
- `src/viewer/core/markdown-engine.js`
- `src/viewer/core/renderer.js`
- `src/viewer/core/toc-builder.js`
- `src/viewer/shell/viewer-shell.js`
- `src/viewer/shell/toc-sidebar.js`
- `src/viewer/shell/content-pane.js`
- `src/viewer/shell/header-toolbar.js`
- `src/viewer/shell/settings-drawer.js`
- `src/settings/default-settings.js`
- `src/settings/settings.service.js`
- `src/theme/theme-service.js`

---

## 14) Rủi ro chính cần lưu ý

### 14.1 Detect markdown không chính xác
Có thể gặp trang text/plain nhưng không phải markdown.

Cách giảm rủi ro:
- chấm điểm theo nhiều tiêu chí
- chỉ takeover khi confidence đủ cao
- có toggle off cho tab hiện tại

### 14.2 CSS của trang gốc phá layout
Cách xử lý:
- dùng Shadow DOM
- namespace CSS rõ ràng

### 14.3 Mermaid/Math gây lỗi runtime
Cách xử lý:
- plugin isolation
- try/catch ở plugin hooks
- fallback render nguyên code block

### 14.4 Settings schema thay đổi theo thời gian
Cách xử lý:
- version settings
- migration layer

### 14.5 Re-render quá nặng
Cách xử lý:
- phân loại setting nào chỉ cần update CSS
- debounce
- chỉ full render khi plugin/layout thay đổi lớn

---

## 15) Định nghĩa “Done” cho từng mốc

### MVP Done
- Detect được markdown
- Render cơ bản đẹp
- TOC bên trái hoạt động
- Có nút Settings góc trên bên phải
- Đổi được theme/font size/show-hide TOC
- Settings lưu được

### Beta Done
- Có plugin architecture
- Có code highlight + task list + anchor heading + table enhance
- Settings UI ổn định
- Có popup và options page

### Production-ready Done
- Mermaid/Math ổn
- Performance chấp nhận được với file lớn
- Có migration settings
- Có fallback/error handling tốt
- Test qua nhiều nguồn nội dung

---

## 16) Kết luận

Thiết kế phù hợp nhất cho dự án này là đi theo hướng:

- bắt đầu bằng core viewer usable thật sớm
- đưa TOC bên trái và Settings button góc trên bên phải vào ngay từ kiến trúc nền
- tách settings, renderer, plugin thành các lớp độc lập
- không làm plugin system quá sớm khi core chưa ổn
- triển khai theo phase để mỗi mốc đều có giá trị sử dụng thực tế

Cách chia phase ở trên giúp:
- kiểm soát độ phức tạp
- giảm refactor lớn về sau
- dễ kiểm thử từng phần
- phù hợp để phát triển bằng JavaScript thuần
