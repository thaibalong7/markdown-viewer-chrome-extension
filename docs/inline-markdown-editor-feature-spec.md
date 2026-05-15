# Phase 11 — Inline Markdown Editor

> **Status:** Implemented through Phase 11.3; Phase 11.4 deferred
>
> **Depends on:** Phase 0–9 (all completed), Phase 10 (nice to have)
>
> **Scope:** local `file:` pages only (same product gate as viewer)
>
> **Last updated:** 2026-05-15

---

## 0) Implementation status

Phase 11.0–11.3 are now implemented in the current codebase:

- CodeMirror 6 is lazy-loaded from `src/viewer/editor/codemirror-bundle.js`.
- Edit mode is exposed from the floating actions for local `file:` Markdown documents.
- The viewer supports split edit/preview and focus mode, with an independent sidebar toggle.
- Editor changes trigger debounced live preview re-render through the existing sanitized render pipeline.
- Editor → preview scroll sync and TOC → editor heading navigation are wired.
- Save uses File System Access API with cached `FileSystemFileHandle` persistence and download fallback.
- Dirty state, Ctrl/Cmd+S, before-unload protection, exit confirmation, status bar, split resize, search/replace, and popup editor preferences are implemented.

Phase 11.4 remains optional/future work.

## 1) Mục tiêu

Cho phép người dùng **edit trực tiếp** nội dung Markdown ngay trên trình duyệt Chrome, với live preview đồng bộ bên cạnh, mà không cần rời khỏi Markdown Plus viewer.

Mặc định tính năng editor **tắt** — người dùng chủ động bật khi muốn sửa file.

---

## 2) Trải nghiệm người dùng mong muốn

### 2.1 Luồng cơ bản

1. User mở file `.md` → viewer hiện bình thường (read-only, như hiện tại).
2. User bấm nút **"Edit"** (trên floating actions hoặc toolbar) → giao diện chuyển sang **split view**: editor bên trái, rendered viewer bên phải.
3. User gõ/sửa markdown trong editor → viewer bên phải **live re-render** theo (debounce ~300 ms).
4. Viewer bên phải **tự scroll theo vị trí cursor** trong editor (scroll sync).
5. User có thể **tắt viewer** (focus-mode) để chỉ thấy editor toàn màn hình.
6. User có thể **ẩn sidebar** (TOC/Files) để editor + viewer có nhiều không gian hơn.
7. User bấm **"Save"** (Ctrl/Cmd+S) → file `.md` được ghi lại xuống disk.
8. User bấm **"Exit Edit"** → quay lại chế độ read-only viewer bình thường.

### 2.2 TOC khi đang edit

- TOC vẫn hoạt động: rebuild headings từ editor content khi có thay đổi (debounce).
- Click TOC item → scroll **editor** tới heading tương ứng (và viewer cũng scroll nếu đang hiện).
- Scroll spy hoạt động trên editor (active heading tracking theo vị trí cursor hoặc scroll).

### 2.3 Layout modes

| Mode | Sidebar | Editor | Viewer | Khi nào |
|------|---------|--------|--------|---------|
| **Read** (mặc định) | Visible | Hidden | Full width | Trước khi bật edit |
| **Split** | Visible/Hidden | 50% | 50% | Sau khi bật edit |
| **Focus** | Hidden | Full width | Hidden | User chọn focus mode |
| **Preview** | Visible/Hidden | Hidden | Full width | User tắt editor, giữ preview |

Sidebar toggle độc lập với editor/viewer toggle — user có thể ẩn/hiện sidebar ở bất kỳ mode nào.

---

## 3) Yêu cầu chức năng

### 3.1 Editor core

| # | Yêu cầu | Chi tiết |
|---|---------|----------|
| E1 | Text editor cho Markdown | Hiển thị raw markdown text, cho phép edit |
| E2 | Syntax highlighting | Highlight markdown syntax (headings, bold, italic, code, links, lists…) giống mở file `.md` trong VS Code |
| E3 | Undo / Redo | Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z, lịch sử thay đổi đầy đủ |
| E4 | Line numbers | Hiển thị số dòng bên trái |
| E5 | Theme-aware | Follow theme hiện tại (light/dark) cho cả editor background, text, và syntax colors |
| E6 | Word wrap | Mặc định bật word wrap cho Markdown (không scroll ngang) |
| E7 | Search & Replace | Ctrl/Cmd+F cho find, Ctrl/Cmd+H cho replace |
| E8 | Bracket/quote matching | Auto-close brackets, quotes; highlight matching pairs |
| E9 | Indentation | Tab/Shift+Tab indent/dedent; smart list continuation |
| E10 | Keyboard shortcuts | Standard editor shortcuts (select all, move line, duplicate line…) |

### 3.2 Live preview & sync

| # | Yêu cầu | Chi tiết |
|---|---------|----------|
| P1 | Debounced render | Re-render viewer sau mỗi thay đổi (300 ms debounce) |
| P2 | Scroll sync (editor → viewer) | Viewer tự scroll theo vị trí cursor/scroll trong editor |
| P3 | Scroll sync (viewer → editor) | Optional: click heading trong viewer → editor scroll tới source line |
| P4 | Preserve plugin output | Mermaid, Math, code highlight… vẫn render trong viewer preview |
| P5 | Error tolerance | Nếu markdown parse lỗi (ví dụ đang gõ dở), viewer hiện nội dung gần nhất thành công |

### 3.3 File I/O

| # | Yêu cầu | Chi tiết |
|---|---------|----------|
| F1 | Save to disk | Ghi nội dung editor xuống file `.md` gốc |
| F2 | Save shortcut | Ctrl/Cmd+S trigger save |
| F3 | Unsaved indicator | Hiển thị dot/icon khi có thay đổi chưa save |
| F4 | Confirm on exit | Nếu có unsaved changes, hỏi confirm trước khi rời trang hoặc tắt editor |
| F5 | Auto-save (optional, phase sau) | Tự lưu định kỳ (configurable interval) |

### 3.4 UI/UX

| # | Yêu cầu | Chi tiết |
|---|---------|----------|
| U1 | Toggle edit mode | Button trên floating actions |
| U2 | Toggle sidebar | Button ẩn/hiện sidebar (TOC/Files) — hoạt động ở mọi mode |
| U3 | Toggle viewer | Button ẩn/hiện viewer panel khi đang edit |
| U4 | Resize split | Drag handle giữa editor và viewer để điều chỉnh tỷ lệ |
| U5 | Status bar | Hiển thị cursor position (line:col), word count, save status |
| U6 | Editor toolbar (phase sau) | Bold/Italic/Link/Image/Code shortcuts — optional, có thể thêm dần |

---

## 4) Nghiên cứu tính khả thi

### 4.1 Editor library: CodeMirror 6

**Lựa chọn:** [CodeMirror 6](https://codemirror.net/) — editor framework chính thức cho web editors.

**Vì sao CodeMirror 6:**

| Tiêu chí | CodeMirror 6 | Monaco (VS Code) | Textarea + custom |
|-----------|-------------|-------------------|-------------------|
| Bundle size | ~150 KB (core + markdown) | ~2 MB+ | ~0 KB |
| Shadow DOM support | Tốt (configurable `root`) | Kém (phụ thuộc `document`) | Tốt |
| Markdown syntax highlighting | Có sẵn (`@codemirror/lang-markdown`) | Có sẵn | Phải tự build |
| Undo/Redo | Built-in | Built-in | Phải tự build |
| Theming | CSS-based, dễ custom | JSON theme, phức tạp | N/A |
| Mobile/touch | Tốt | Kém | Tốt |
| Extensibility | Excellent (facets, extensions) | Plugin-based | Manual |
| Chrome extension compatibility | Tốt, không dùng `eval` | Cần workarounds cho CSP | Tốt |
| Tree-sitter/incremental parse | Built-in (Lezer) | TextMate grammars | Không |

**Kết luận:** CodeMirror 6 là lựa chọn tối ưu. Monaco quá nặng và có vấn đề Shadow DOM; textarea thuần thiếu quá nhiều tính năng cần thiết.

### 4.2 Shadow DOM compatibility

Extension hiện mount viewer trong **Shadow DOM** (`attachShadow({ mode: 'open' })`). CodeMirror 6 hỗ trợ Shadow DOM qua `EditorView.editorAttributes` và cấu hình `root`:

```js
new EditorView({
  root: shadowRoot,           // CM6 listens for events on this root
  parent: editorContainer,    // DOM node to mount into
  // ...
})
```

**Cần làm:**
- Inject CodeMirror CSS vào shadow root (cùng pattern như KaTeX CSS injection qua `injectViewerStyles()`).
- Đảm bảo tooltips/autocomplete panels render trong shadow root, không escape ra document.
- Test focus management (selection, clipboard) trong shadow DOM context.

### 4.3 CSP (Content Security Policy)

- Manifest hiện **không khai báo** `content_security_policy` — dùng MV3 defaults.
- CodeMirror 6 **không dùng `eval()`** hay inline scripts → không conflict với CSP.
- CM6 bundled qua Vite → chỉ là static JS chunks, tương tự Mermaid/Shiki hiện tại.
- **Không cần thay đổi manifest CSP.**

### 4.4 Lazy loading strategy

Follow pattern hiện tại của Mermaid và KaTeX:

```js
let cmImportPromise = null

function ensureCodeMirror() {
  if (!cmImportPromise) {
    cmImportPromise = import('./editor/codemirror-bundle.js')
  }
  return cmImportPromise
}
```

- CodeMirror modules chỉ load khi user bật edit mode lần đầu.
- Vite `manualChunks` config thêm `'codemirror'` chunk để tách khỏi main content script.
- **Initial page load không bị ảnh hưởng** — zero cost khi không dùng editor.

### 4.5 File save mechanism

**Vấn đề chính:** Content scripts trên `file:` pages có origin opaque → không thể dùng `fetch()` hay standard Web APIs để ghi file.

**Giải pháp khả thi (xếp theo ưu tiên):**

#### Option A: File System Access API (ưu tiên nhất)

```js
// Yêu cầu user gesture (click Save button)
const handle = await window.showSaveFilePicker({
  suggestedName: 'README.md',
  types: [{ accept: { 'text/markdown': ['.md'] } }]
})
const writable = await handle.createWritable()
await writable.write(editorContent)
await writable.close()
```

- **Pro:** API chuẩn, ghi trực tiếp xuống file, user chọn vị trí.
- **Con:** Cần user gesture mỗi lần save; có thể dùng `handle` cache để save lại cùng file mà không cần picker lại.
- **Khả dụng:** Chrome 86+, hoạt động trên `file:` pages (**cần test**).
- **Handle persistence:** Lưu `FileSystemFileHandle` vào `IndexedDB` (structured clone) để reuse qua sessions → save lần sau không cần picker.

#### Option B: Download API fallback

```js
chrome.runtime.sendMessage({
  type: 'SAVE_FILE_CONTENT',
  payload: { url: currentFileUrl, content: editorContent }
})
// Background: convert to data URL → chrome.downloads.download()
```

- **Pro:** Đã có pattern (`DOWNLOAD_DATA_URL`).
- **Con:** Tạo file mới trong Downloads folder, không overwrite file gốc → UX kém hơn.

#### Option C: Native Messaging Host (nặng nhất)

- Chrome extension giao tiếp với một native app (Python/Node script) chạy trên máy user.
- Native app nhận nội dung + file path → ghi file.
- **Pro:** Ghi chính xác file gốc.
- **Con:** User phải cài thêm native app, setup phức tạp, cross-platform maintenance.

**Đề xuất:** Bắt đầu với **Option A** (File System Access API) + **Option B** fallback. Option C để dành cho phase rất sau nếu cần.

### 4.6 Performance considerations

| Concern | Mitigation |
|---------|------------|
| CodeMirror bundle size (~150 KB gzip) | Lazy load; separate Vite chunk; zero cost khi không dùng |
| Debounced re-render on every keystroke | 300 ms debounce; reuse existing `renderDocument()` pipeline |
| Large files (>10K lines) | CM6 handles well (virtual rendering); viewer render may lag — consider incremental updates |
| Memory (editor + viewer DOM) | Editor is virtualized (CM6 only renders visible lines); viewer DOM unchanged |
| Scroll sync computation | Line-mapping heuristic, not pixel-perfect; debounce scroll events |
| TOC rebuild on edit | Reuse existing `toc-builder.js` with debounce (500 ms) |

### 4.7 Permissions impact

| Cần thay đổi | Chi tiết |
|--------------|----------|
| `manifest.json` permissions | **Không cần thêm** — `storage`, `downloads` đã đủ |
| `manifest.json` CSP | **Không cần thay đổi** |
| `web_accessible_resources` | Đã có `assets/*` — CM6 chunks sẽ nằm trong đây |
| New message types | `SAVE_FILE_CONTENT` (nếu dùng Option B backup) |

---

## 5) Kiến trúc kỹ thuật

### 5.1 Module map

```text
src/
  viewer/
    editor/                          ← NEW directory
      codemirror-bundle.js           ← lazy-loaded CM6 setup
      editor-state.js                ← editor state management
      editor-theme.js                ← CM6 theme that follows viewer theme
      editor-markdown.js             ← CM6 markdown language config
      editor-keybindings.js          ← save, toggle preview, etc.
      scroll-sync.js                 ← bidirectional scroll sync logic
      file-io.js                     ← File System Access API + fallback
    react/
      components/
        EditorPanel.jsx              ← React wrapper for CM6 editor
        EditorToolbar.jsx            ← status bar + mode toggles
        SplitView.jsx                ← resizable split layout
        SidebarToggle.jsx            ← sidebar hide/show button
      hooks/
        useEditor.js                 ← editor state, dirty tracking, save
        useScrollSync.js             ← scroll sync between editor & viewer
        useSplitResize.js            ← drag-to-resize split panels
      contexts/
        EditorContext.jsx            ← editor mode state (off/split/focus)
    styles/
      _editor.scss                   ← editor panel styles
      _split-view.scss               ← split layout styles
      _editor-toolbar.scss           ← toolbar/status bar styles
```

### 5.2 Layout architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│  [Toggle Sidebar] [Toggle Viewer] [Save] [Exit Edit]   [Print/etc] │  ← toolbar / floating actions
├─────────┬───────────────────────────┬────────────────────────────────┤
│         │                           │                                │
│  TOC    │    CodeMirror Editor      │    Rendered Viewer             │
│  Files  │    (raw markdown)         │    (live preview)              │
│         │                           │                                │
│         │                           │                                │
│         │                           │                                │
│         ├───────────────────────────┤                                │
│         │  Ln 42, Col 8 | 1,234 words | Modified               │  ← status bar
├─────────┴───────────────────────────┴────────────────────────────────┤
```

**CSS Grid evolution:**

```scss
// Read mode (current)
.mdp-body {
  grid-template-columns: var(--mdp-toc-width) minmax(0, 1fr);
}

// Split edit mode
.mdp-body--edit-split {
  grid-template-columns:
    var(--mdp-toc-width)
    minmax(200px, var(--mdp-editor-width, 1fr))
    auto                    /* resize handle */
    minmax(200px, 1fr);     /* viewer */
}

// Focus mode (editor only)
.mdp-body--edit-focus {
  grid-template-columns: minmax(0, 1fr);
}

// No sidebar variants
.mdp-body--no-toc.mdp-body--edit-split {
  grid-template-columns:
    minmax(200px, var(--mdp-editor-width, 1fr))
    auto
    minmax(200px, 1fr);
}
```

### 5.3 State management

```js
// Editor mode state (in EditorContext or viewer app state)
{
  editor: {
    enabled: false,          // edit mode on/off
    mode: 'split',           // 'split' | 'focus' | 'preview'
    sidebarVisible: true,    // independent sidebar toggle
    dirty: false,            // unsaved changes indicator
    splitRatio: 0.5,         // editor width ratio
    fileHandle: null,        // FileSystemFileHandle for save
  }
}
```

**Editor state is runtime-only** (không persist vào `chrome.storage`). Khi user refresh page → trở lại read mode.

Settings cho editor preferences (nếu cần persist):
```js
// Thêm vào DEFAULT_SETTINGS.editor
{
  editor: {
    autoSave: false,
    autoSaveInterval: 30000,   // ms
    wordWrap: true,
    lineNumbers: true,
    fontSize: 14,              // editor-specific font size
    tabSize: 2,
  }
}
```

### 5.4 Data flow

```text
User types in editor
  → CM6 dispatches transaction
  → useEditor captures new doc string
  → debounce 300ms
  → renderDocument(newMarkdown, settings)
  → renderIntoElement(article, html)
  → pluginManager.afterRender()
  → syncTocItems()
  → scroll sync: map editor cursor line → viewer heading
```

### 5.5 Scroll sync strategy

**Editor → Viewer (chính):**

1. CM6 reports visible line range (top line number).
2. Map line number → closest heading in markdown source (by counting `#` lines).
3. Scroll viewer to corresponding rendered heading element.
4. Fallback: proportional scroll (editor scroll % → viewer scroll %).

**Viewer → Editor (optional, phase sau):**

1. Click heading trong viewer → tìm heading text trong editor doc.
2. CM6 scroll to line.

**Không cần pixel-perfect sync** — heading-level sync đủ tốt cho UX và ít tốn performance.

### 5.6 Theme integration

CodeMirror 6 theme sẽ đọc CSS variables từ viewer theme hiện tại:

```js
const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--mdp-bg)',
    color: 'var(--mdp-text)',
    fontFamily: 'var(--mdp-code-font, monospace)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--mdp-sidebar-bg)',
    color: 'var(--mdp-text-secondary)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--mdp-active-line-bg)',
  },
  // ... more mappings
})
```

Kết hợp với CM6 `@codemirror/language` markdown highlighting:
- Headings → bold + color
- Bold/Italic → tương ứng
- Code spans → monospace + background
- Links → link color
- Lists → list marker color

---

## 6) Kế hoạch triển khai

### Phase 11.0 — Editor foundation & sidebar toggle (Completed)

**Mục tiêu:** Dựng khung editor cơ bản và nút ẩn sidebar.

**Tasks:**
- [x] Thêm **sidebar toggle button** vào floating actions (hoạt động cho cả read mode và edit mode)
- [x] Thiết lập `EditorContext` / editor mode state
- [x] Lazy-load CodeMirror 6 bundle (`@codemirror/state`, `@codemirror/view`, `@codemirror/lang-markdown`, `@codemirror/commands`, `@codemirror/language`)
- [x] Cấu hình Vite `manualChunks` cho codemirror
- [x] Mount CM6 vào Shadow DOM với CSS injection
- [x] Theme bridge: CM6 theme đọc CSS variables từ viewer
- [x] Nút **"Edit"** toggle edit mode on/off
- [x] Layout split view cơ bản (grid CSS)

**Deliverable:** Bấm Edit → thấy editor bên trái với markdown content, viewer bên phải. Sidebar ẩn/hiện được.

### Phase 11.1 — Live preview & scroll sync (Completed)

**Mục tiêu:** Editor thay đổi → viewer re-render realtime.

**Tasks:**
- [x] Hook CM6 `updateListener` → debounced `renderDocument()`
- [x] Reuse existing render pipeline (markdown-it → Shiki → DOMPurify → plugins)
- [x] Scroll sync editor → viewer (source-line/heading-aware mapping with proportional fallback)
- [x] TOC rebuild on editor change (debounced)
- [x] TOC click → scroll editor to heading line
- [x] Error boundary: nếu render lỗi, giữ viewer ở state cuối thành công

**Deliverable:** Edit markdown → viewer cập nhật live. TOC hoạt động. Scroll sync cơ bản.

### Phase 11.2 — File I/O & save (Completed)

**Mục tiêu:** Lưu file đã edit xuống disk.

**Tasks:**
- [x] Implement File System Access API save (`showSaveFilePicker` / reuse handle)
- [x] `FileSystemFileHandle` cache + IndexedDB persistence
- [x] Ctrl/Cmd+S shortcut
- [x] Dirty state tracking + unsaved indicator (dot trên title/button)
- [x] `beforeunload` confirm khi có unsaved changes
- [x] Fallback: browser download nếu File System Access không khả dụng
- [x] Không cần thêm `SAVE_FILE_CONTENT`; fallback dùng shared download helper

**Deliverable:** User có thể edit và save file. Unsaved changes được track và confirm.

### Phase 11.3 — Editor polish (Completed)

**Mục tiêu:** Hoàn thiện editor UX.

**Tasks:**
- [x] Status bar: line:col, word count, save status
- [x] Focus mode (ẩn viewer, editor full width)
- [x] Resize handle giữa editor và viewer (drag to resize)
- [x] Search & Replace (CM6 `@codemirror/search`)
- [x] Editor-specific settings trong popup (font size, tab size, word wrap, line numbers)
- [x] Persist editor preferences vào `chrome.storage`

**Deliverable:** Editor hoàn chỉnh với đầy đủ tính năng cơ bản.

### Phase 11.4 — Advanced features (tùy chọn, phase sau)

**Tasks (không bắt buộc, thêm dần):**
- [ ] Auto-save (configurable interval)
- [ ] Markdown toolbar (bold/italic/link/image/code shortcuts với buttons)
- [ ] Drag & drop images (paste image → save to same folder → insert `![](path)`)
- [ ] Vim/Emacs keybinding mode
- [ ] Collaborative editing preparation (CRDT)
- [ ] Viewer → editor scroll sync (bidirectional)
- [ ] Minimap
- [ ] Markdown linting (markdownlint integration)

---

## 7) Dependencies cần thêm

```json
{
  "@codemirror/state": "^6.x",
  "@codemirror/view": "^6.x",
  "@codemirror/lang-markdown": "^6.x",
  "@codemirror/language": "^6.x",
  "@codemirror/commands": "^6.x",
  "@codemirror/search": "^6.x",
  "@lezer/highlight": "^1.x"
}
```

**Implemented note:** current dependencies include the CodeMirror packages used by the shipped editor bundle. `@codemirror/autocomplete` and `@codemirror/language-data` are not currently required by Phase 11.0–11.3.

**Estimated bundle impact:** ~150–200 KB gzip (lazy-loaded, không ảnh hưởng initial load).

So sánh: Mermaid hiện tại ~210 KB gzip, KaTeX ~110 KB gzip.

---

## 8) Rủi ro và mitigation

| Rủi ro | Mức | Mitigation |
|--------|-----|------------|
| File System Access API không hoạt động trên `file:` pages | Medium | Test sớm; fallback download; Option C (native messaging) nếu cần |
| CodeMirror CSS conflict trong Shadow DOM | Low | Inject CSS vào shadow root (proven pattern từ KaTeX); CM6 thiết kế cho shadow DOM |
| Performance khi re-render liên tục trên file lớn | Medium | Debounce 300ms+; cache previous render; skip unchanged sections nếu cần |
| Bundle size tăng đáng kể | Low | Lazy load; separate chunk; chỉ load khi user bật edit |
| Scroll sync không chính xác | Low | Heading-level sync là đủ tốt; không cần pixel-perfect |
| Undo history mất khi switch mode | Low | Giữ CM6 state trong memory; chỉ destroy khi exit edit mode |
| User edit file nhưng file bị thay đổi bên ngoài | Medium | Phase sau: detect external change qua `FileSystemFileHandle.getFile()` timestamp |
| Focus/clipboard issues trong Shadow DOM | Low-Medium | CM6 có `root` config cho shadow DOM; test kỹ copy/paste/selection |

---

## 9) Các tính năng bổ sung nên có (gợi ý thêm)

Ngoài yêu cầu gốc, các tính năng sau sẽ nâng cao trải nghiệm:

1. **Markdown formatting toolbar** — Buttons cho bold, italic, heading, link, image, code block, list, quote, horizontal rule. Giống toolbar của GitHub/GitLab editor.

2. **Drag & drop / paste images** — Khi paste hoặc kéo thả ảnh vào editor, tự lưu ảnh vào cùng folder và insert `![](image.png)` vào markdown.

3. **Word count & reading time** — Hiển thị trên status bar.

4. **Zen mode** — Ẩn tất cả UI trừ editor, tập trung viết. Nhấn `Esc` hoặc di chuột lên top để hiện lại controls.

5. **Diff view** — So sánh nội dung hiện tại với bản đã save (git diff style).

6. **Multi-cursor editing** — CM6 hỗ trợ sẵn.

7. **Outline/breadcrumb** — Hiển thị heading hierarchy của vị trí cursor hiện tại trên status bar.

8. **Typewriter mode** — Giữ dòng đang gõ luôn ở giữa màn hình.

9. **Spellcheck integration** — Sử dụng browser spellcheck hoặc external service.

10. **Collaborative cursors preparation** — Cấu trúc state sẵn sàng cho multi-user editing (CRDT) nếu cần sau này.

---

## 10) Checklist trước khi bắt đầu implement

- [x] Prototype: test CodeMirror 6 trong Shadow DOM của extension (chỉ cần mount + type + verify CSS)
- [x] Prototype: test File System Access API trên `file:` page trong Chrome extension context
- [x] Finalize: quyết định vị trí Edit button (floating actions vs dedicated toolbar)
- [x] Finalize: editor settings shape trong `DEFAULT_SETTINGS`
- [x] Finalize: split view CSS approach (grid vs flexbox)
- [ ] Review: bundle size impact estimate sau khi prototype

---

## 11) Kết luận

Tính năng inline markdown editor đã được triển khai qua Phase 11.3 trên tech stack hiện tại:

- **CodeMirror 6** là editor library đang dùng (nhẹ, Shadow DOM compatible, markdown highlighting sẵn, extensible).
- **Lazy loading** giữ editor khỏi initial viewer path cho users không dùng edit mode.
- **File System Access API** được dùng để save trực tiếp qua picker/reused handle, với fallback download.
- **Kiến trúc hiện tại** (React shell + imperative render pipeline) đã hỗ trợ editor panel song song và preview re-render an toàn.
- **Phase 11.4** là phần mở rộng tùy chọn, không chặn core editor UX.

Phase 11.0–11.3 (core editor) đã hoàn thành; Phase 11.4 (advanced) là open-ended.
