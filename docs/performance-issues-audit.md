# Đánh giá vấn đề hiệu năng - Markdown Plus Extension

Ngày kiểm tra gốc: 2026-04-13  
**Cập nhật rà soát codebase:** 2026-04-17  
Phạm vi: `src/**` (kèm `manifest.json`, `vite.config.mjs` để lấy bối cảnh runtime)

**Ghi chú migration:** Một số module imperative cũ đã chuyển sang React (`src/viewer/react/**`). Các issue dưới đây đã cập nhật **vị trí file**; issue không còn trong code được đánh dấu **[RESOLVED]** và có thể bỏ khỏi backlog fix.

## Tổng quan

Rủi ro lớn nhất về hiệu năng hiện tại tập trung ở:

1. Render pipeline cho tài liệu lớn chạy tuần tự trên main thread (markdown-it → Shiki → DOMPurify → innerHTML).
2. Shiki highlighter khởi tạo toàn bộ ngôn ngữ + highlight song song không giới hạn.
3. Folder scan tuần tự + progress UI không throttle → jank.
4. React viewer: callback không ổn định làm teardown scroll spy; hai lần `root.render()` sau mỗi lần render tài liệu.

**Đã giảm rủi ro:** scroll spy (offsets + binary search); content script thin loader + dynamic import; lazy explorer subtree cho collapsed folders; một số đường bootstrap/settings/TOC/explorer active state (xem issue #1, #2, #3, #10, #14, #17, #20, #23).

---

## Bảng xếp hạng theo mức độ ảnh hưởng (cập nhật 2026-04-17)

Chỉ liệt kê issue **còn mở** (chưa RESOLVED). Thứ tự: CRITICAL → HIGH → …

| Mức | # | Tóm tắt | Vị trí chính |
|-----|---|---------|--------------|
| HIGH | 4 | Static import Math/KaTeX | `plugin-manager.js`, `math.plugin.js` |
| HIGH | 5 | Shiki: mọi ngôn ngữ + `Promise.all` không giới hạn | `shiki-highlighter.js`, `shiki-config.js` |
| HIGH | 6 | Shiki DOM round-trip | `shiki-highlighter.js` |
| HIGH | 7 | DOMPurify toàn bộ HTML | `renderer.js` |
| HIGH | 8 | Pipeline tuần tự, không loading state, tạo engine mới mỗi lần | `app.js`, `renderer.js` |
| HIGH | **44** | **Hai lần `root.render()` sau mỗi document render** | `app.js`, `mount.js` |
| HIGH | 9 | Explorer không virtualization | `ExplorerPanel.jsx`, `FileTree.jsx` |
| HIGH | 11 | Folder scan tuần tự + `.gitignore` | `folder-scanner.js` |
| MEDIUM-HIGH | 12 | Broadcast settings tới mọi tab | `message-router.js` |
| MEDIUM-HIGH | 18 | Workspace picker multi-pass | `workspace-picker.js` |
| MEDIUM-HIGH | 19 | Mermaid render tuần tự | `mermaid.plugin.js` |
| MEDIUM | 45–48 | Toast context; explorer mount sớm; `expandedMap` clone; timers copy | `ToastContext.jsx`, `FilesPanel.jsx` / `useExplorer.js`, `explorerReducer.js`, `article-interactions.js` |
| MEDIUM | 13–42 | (xem chi tiết từng issue bên dưới) | — |

---

## Danh sách issue theo mức độ nghiêm trọng

---

## Issue #1 [RESOLVED] Scroll spy O(N) headings với forced layout mỗi scroll tick

- **Vị trí:** `src/viewer/core/scroll-spy.js`
- **Đã xử lý:** Thay loop O(N) theo từng scroll tick bằng precomputed heading offsets + binary search để tìm active heading theo `scrollTop`.
- **Chi tiết triển khai:**
  - Precompute measurement map `id -> top` (sort theo top) một lần.
  - Scroll handler chỉ chạy binary search O(log N), không còn `getBoundingClientRect()` cho toàn bộ heading mỗi frame.
  - Resize handler dùng debounce (~100ms) để refresh measurement map khi layout thay đổi.
- **Kết quả kiểm tra:** Số lần gọi `getBoundingClientRect()` giảm từ hơn 700 xuống khoảng 150 trong kịch bản scroll benchmark.

---

## Issue #2 [RESOLVED] Explorer tree tạo toàn bộ DOM / React subtree cho collapsed folders

- **Vị trí (cập nhật):** `src/viewer/react/components/explorer/FileTree.jsx`, `src/viewer/react/components/explorer/FolderRow.jsx`  
  *(File cũ `src/viewer/explorer/explorer-tree-renderer.js` đã bỏ.)*
- **Đã xử lý:** Explorer tree đã chuyển sang lazy subtree mount theo trạng thái expand, không còn mount toàn bộ descendants khi folder đang collapsed.
- **Kết quả:** Giảm chi phí initial mount và memory footprint trên workspace lớn.
- **Ghi chú còn mở:** Virtualization tổng thể cho danh sách lớn vẫn theo dõi ở Issue #9 / #21.

---

## Issue #3 [RESOLVED] Content script load nặng trên mọi trang

- **Vị trí:** `src/content/index.js`, `src/content/viewer-loader.js`
- **Đã xử lý:** `index.js` hiện là thin loader (URL/protocol check + `import()` động). Viewer bootstrap, SCSS `?inline`, KaTeX CSS và `SETTINGS_UPDATED` listener đã chuyển sang `viewer-loader.js`, chỉ load khi cần mount markdown viewer.
- **Tối ưu bổ sung:** Đã memoize phần rewrite `extensionizeKatexFontUrls()` để không chạy regex full KaTeX CSS ở mỗi lần remount.
- **Kết quả:** Giảm parse/eval/memory cost trên tab không phải markdown; giữ nguyên flow mount trên tab markdown.

---

## Issue #4 [HIGH] Static import optional plugins (KaTeX, Math) vào plugin-manager

- **Vị trí:** `src/plugins/plugin-manager.js` (dòng 1–20), `src/plugins/optional/math.plugin.js` (dòng 1–3)
- **Hiện trạng:** `plugin-manager.js` static import **tất cả** plugins bao gồm `math.plugin.js`. Module `math.plugin.js` lại static import `@mdit/plugin-katex` → KaTeX library nằm trong dependency graph **ngay cả khi Math disabled** (default off). Mermaid thì đã lazy import đúng cách.
- **Tác động:** Bundle lớn hơn, parse/eval cost cao hơn, memory usage tăng cho mọi viewer mount.
- **Khuyến nghị fix:**
  - `import()` động optional plugins bên trong `plugin-manager.js` (tương tự pattern Mermaid đang dùng).
  - `math.plugin.js`: chuyển `import { katex }` vào bên trong `extendMarkdown` khi `enabled === true`.
  - Áp dụng cho `emoji.plugin.js` và `footnote.plugin.js` nếu dependency nặng.

---

## Issue #5 [HIGH] Shiki khởi tạo toàn bộ ngôn ngữ + highlight không giới hạn concurrency

- **Vị trí:** `src/viewer/core/shiki-highlighter.js` (dòng 31–40, 69–86), `src/viewer/core/shiki-config.js` (dòng 27)
- **Hiện trạng:**
  - `getShikiHighlighter()` khởi tạo Shiki với **tất cả** bundled grammars (`SHIKI_LANG_IDS = bundledLanguagesInfo.map(...)`) → chi phí upfront lớn (memory + CPU).
  - `Promise.all(fencedBlocks.map(...))` highlight **tất cả code blocks song song** không giới hạn → CPU/memory spike cho tài liệu nhiều code blocks.
- **Tác động:** Thời gian khởi tạo Shiki lần đầu rất lâu. Tài liệu có 50+ code blocks gây memory spike và jank.
- **Khuyến nghị fix:**
  - Khởi tạo Shiki với danh sách ngôn ngữ phổ biến (10–15), load thêm on-demand bằng `loadLanguage`.
  - Giới hạn concurrency (queue 2–4 blocks cùng lúc), ưu tiên visible blocks bằng `IntersectionObserver`.
  - Skip highlight cho code blocks quá lớn (>N KB) — hiển thị plain text.

---

## Issue #6 [HIGH] Shiki DOM round-trip: parse → mutate → serialize toàn bộ HTML

- **Vị trí:** `src/viewer/core/shiki-highlighter.js` (dòng 55–88)
- **Hiện trạng:** `applyShikiToFencedCode()`:
  1. `wrapper.innerHTML = html` — parse **toàn bộ** HTML document vào DOM tạm.
  2. `querySelectorAll('pre > code')` — tìm code blocks.
  3. Per block: `template.innerHTML` + `replaceWith` — multiple small HTML parses.
  4. `return wrapper.innerHTML` — serialize **toàn bộ** DOM ngược lại thành string.
- **Tác động:** Với tài liệu 1MB+, bước 1 và 4 tạo **2 bản copy lớn** của HTML trong memory, plus full DOM tree tạm.
- **Khuyến nghị fix:**
  - String-only approach: regex/string replace chỉ phần `<pre><code>` mà không cần DOM round-trip.
  - Nếu giữ DOM: dùng `DocumentFragment`, batch replacements, tránh serialize lại toàn bộ.

---

## Issue #7 [HIGH] DOMPurify sanitize toàn bộ HTML string

- **Vị trí:** `src/viewer/core/renderer.js` (dòng 49–50)
- **Hiện trạng:** `sanitizeHtml()` (DOMPurify) chạy trên **toàn bộ** HTML output string — second full parse + allocation.
- **Tác động:** Chiếm phần đáng kể CPU/memory trên tài liệu multi-MB. Đây là bước cuối cùng trong pipeline tuần tự (markdown-it → Shiki → DOMPurify).
- **Khuyến nghị fix:**
  - Tighter allowlist để giảm processing.
  - Cân nhắc sanitize fragments nếu pipeline cho phép tách nhỏ (major refactor).
  - Profile để xác định tỷ lệ thời gian DOMPurify vs các bước khác.

---

## Issue #8 [HIGH] Render pipeline tuần tự trên main thread, không có loading state

- **Vị trí:** `src/viewer/app.js` (dòng 142–175), `src/viewer/core/renderer.js` (dòng 33–50)
- **Hiện trạng:**
  - `renderDocument()` chạy toàn bộ pipeline (create engine → markdown parse → plugin postprocess → Shiki → sanitize) **tuần tự trên main thread**.
  - `render()` trong `app.js` chạy `await renderDocument()` rồi `innerHTML =` rồi `afterRender` + TOC rebuild — **không có loading indicator** nào cho user.
  - Mỗi `renderDocument()` tạo **mới** `createPluginManager` + `createMarkdownEngine()` → extra CPU + GC.
- **Tác động:** Với file 1MB+, user thấy blank hoặc frozen screen vài giây. Không có feedback "đang loading".
- **Khuyến nghị fix:**
  - **UX:** Hiển thị skeleton/spinner trên shell ngay khi `render()` bắt đầu, ẩn khi xong.
  - **Perf:** Reuse engine + plugin manager (keyed by plugin settings hash). Chỉ tạo lại khi enabled plugins thay đổi.
  - **Stretch:** Web Worker cho markdown-it parse (khó với DOM plugins) hoặc progressive/chunked render.

---

## Issue #9 [HIGH] Explorer panel không có virtualization cho file list

- **Vị trí (cập nhật):** `src/viewer/react/components/explorer/ExplorerPanel.jsx`, `FileTree.jsx`, `FileRow.jsx`  
  *(File cũ `explorer-panel.js` đã bỏ.)*
- **Hiện trạng:** Danh sách phẳng và cây thư mục đều `.map()` / render đệ quy **một node cho mỗi file/folder**, không dùng virtual list. Sidebar scroll height = full list.
- **Tác động:** Với workspace 2000 files, mount và scroll sidebar chậm, memory tăng, layout/style cost O(N).
- **Khuyến nghị fix:**
  - Virtual list: chỉ render visible rows + buffer.
  - **Hoặc:** Lazy render folder children on expand (kết hợp Issue #2).
  - Nếu còn chỗ đếm + build tách hai lần walk — gom single-pass khi refactor.

---

## Issue #10 [RESOLVED] Full markdown extraction trước khi check settings

- **Vị trí:** `src/content/bootstrap.js`
- **Đã xử lý:** Early exit nếu không phải `file:` + pathname markdown (dòng ~16–20). `GET_SETTINGS` + kiểm tra `enabled` chạy **trước** extraction đầy đủ chính (dòng ~56–72). Đường fallback low-confidence vẫn có thể sample/full extract trước settings **chỉ trên** `file:` đã có hint — không còn pattern “mọi trang tốn extract rồi mới biết disabled” như mô tả cũ.
- **Ghi chú:** Tối ưu thêm: gọi settings trước cả nhánh fallback nếu muốn tránh mọi extract khi disabled.

---

## Issue #11 [HIGH] Folder scan tuần tự (BFS) + nhiều round-trip cho .gitignore

- **Vị trí:** `src/viewer/explorer/folder-scanner.js` (dòng 181–289, 134–145)
- **Hiện trạng:**
  - `buildTree` xử lý subdirectories **tuần tự** (`await handleDirEntry`) → wall-clock time tăng tuyến tính với số folder.
  - Mỗi folder visited có thể `fetchFileAsText` cho `.gitignore` → nhiều serial extension round-trips.
- **Tác động:** Scan folder lớn (500+ folders) rất chậm.
- **Khuyến nghị fix:**
  - Bounded concurrency (3–5 parallel subdirectory scans) với respect `signal` và limits.
  - Cache gitignore rules theo path; skip nếu parent gitignore đã exclude subtree.
  - Optional `respectGitignore: false` flag cho huge directories.

---

## Issue #12 [MEDIUM-HIGH] Background `notifySettingsUpdated` broadcast tới mọi tab

- **Vị trí:** `src/background/message-router.js` (dòng 7–21)
- **Hiện trạng:** Mỗi khi save/reset settings, `chrome.tabs.query({})` rồi `sendMessage` **tới mọi tab** đang mở.
- **Tác động:** Với nhiều tab (20+), mỗi lần đổi settings gây spike messaging. Các tab không phải markdown nhận message không cần thiết.
- **Khuyến nghị fix:**
  - Restrict `tabs.query` tới `url` patterns liên quan (e.g. `file://**/*.md`).
  - Hoặc: content scripts tự register/unregister interest; background chỉ gửi cho tabs đã register.
  - Debounce notify nếu user đổi nhiều settings liên tiếp.

---

## Issue #13 [HIGH] Sibling scan không có AbortController

- **Vị trí (cập nhật):** `src/viewer/react/hooks/useExplorer.js` (deep sibling / `scanFolderRecursive` ~719–744)  
  *(File cũ `explorer-controller.js` đã bỏ.)*
- **Hiện trạng:** Workspace scan có `AbortController`; **sibling deep folder scan** vẫn gọi `scanFolderRecursive` **không** truyền `signal` → khó cancel khi navigate / đổi mode.
- **Tác động:** Wasted CPU/network nếu user rời trước khi scan xong.
- **Khuyến nghị fix:**
  - Truyền `AbortController.signal` vào `scanFolderRecursive` cho sibling scan.
  - Abort trong teardown / chuyển mode.

---

## Issue #14 [RESOLVED] `markActiveFile` O(N) querySelectorAll trên mọi file row

- **Vị trí:** Đã migration sang React — `ExplorerPanel.jsx` / `FileTree.jsx` dùng prop `isActive` + so sánh URL chuẩn hóa, **không** `querySelectorAll` trên mọi row.
- **Kết quả:** Pattern O(N) DOM query + toggle class trên toàn bộ button đã hết.

---

## Issue #15 [HIGH] Download export dùng blobToDataUrl gây 2× memory

- **Vị trí:** `src/shared/download.js` (dòng 70–80)
- **Hiện trạng:** `blobToDataUrl` convert **toàn bộ blob** thành data URL trước khi gửi `DOWNLOAD_DATA_URL` → ~2× memory peak cho file lớn.
- **Tác động:** Export tài liệu lớn hoặc Mermaid PNG resolution cao → memory spike.
- **Khuyến nghị fix:**
  - Ưu tiên native download path với Object URL + `<a>` click (đã có nhưng dùng làm fallback).
  - Nếu cần data URL: chunking hoặc `chrome.downloads.download` nếu API cho phép.

---

## Issue #16 [HIGH] Document export `cloneNode(true)` toàn bộ article

- **Vị trí:** `src/viewer/actions/document-actions.js` (dòng 94–124)
- **Hiện trạng:** Export HTML dùng `cloneNode(true)` trên toàn bộ article element → tạo bản sao đầy đủ DOM tree.
- **Tác động:** Với tài liệu lớn (nhiều headings, code blocks, images), clone tốn CPU + memory đáng kể.
- **Khuyến nghị fix:**
  - Build HTML string từ cached rendered HTML thay vì clone DOM.
  - Hoặc: strip non-essential nodes trước khi clone.
  - Nếu giữ clone: chạy trong `requestIdleCallback` hoặc offscreen.

---

## Issue #17 [RESOLVED] Full rerender khi thay đổi settings chỉ typography/layout

- **Vị trí:** `src/viewer/app.js` (`updateSettings`), `src/shared/settings-diff.js` (`needsFullRender`)
- **Đã xử lý:** `needsFullRender()` có `styleOnlyPrefixes` (typography, `layout.contentMaxWidth`, `layout.showToc`, `layout.tocWidth`). Chỉ đổi các path đó → **không** gọi `render()` đầy đủ; vẫn `applyReaderStyles` + `syncTocItems`.
- **Còn mở (tối ưu thêm, không còn “bug” style-only):** Đổi **theme** / plugin vẫn cần full pipeline (Shiki re-highlight). Có thể cache HTML trước Shiki và chỉ re-run Shiki + sanitize (xem khuyến nghị cũ dưới).
- **Khuyến nghị stretch:**
  - Cache rendered HTML keyed by `(markdown + parser options hash)`.
  - Theme change: chỉ re-run Shiki, không re-parse markdown-it.

---

## Issue #18 [MEDIUM-HIGH] Workspace picker multi-pass trên large file list

- **Vị trí:** `src/viewer/explorer/workspace-picker.js` (dòng 279–283, 381–435)
- **Hiện trạng:**
  - `scanWorkspaceFromDirectoryHandle`: `for await` collect **tất cả entries** vào array rồi sort → 2× memory.
  - `scanWorkspaceFromWebkitFileList`: nhiều `filter` pass trên `files` array (markdown filter, gitignore scan) → O(N) × số pass.
- **Tác động:** Với webkit directory pick 10k+ files → memory spike + CPU trước khi tree build bắt đầu.
- **Khuyến nghị fix:**
  - Single-pass classification: phân loại md / gitignore / skip trong một vòng lặp.
  - Stream processing cho `DirectoryHandle`: process entries khi đọc, không buffer toàn bộ.

---

## Issue #19 [MEDIUM-HIGH] Mermaid render tuần tự cho nhiều diagrams

- **Vị trí:** `src/plugins/optional/mermaid.plugin.js` (dòng 140–176)
- **Hiện trạng:** `await mermaidApi.render` chạy trong `for` loop → diagrams render **strictly sequentially**.
- **Tác động:** Tài liệu có 10+ Mermaid blocks → render chậm rõ rệt.
- **Khuyến nghị fix:**
  - Limited parallelism (2–3 concurrent renders) nếu Mermaid API cho phép.
  - Hoặc: lazy render — chỉ render Mermaid blocks khi chúng scroll vào viewport (`IntersectionObserver`).

---

## Issue #20 [RESOLVED] TOC rebuild mỗi lần render + N click listeners imperative

- **Vị trí:** `rebuild-toc.js` đã bỏ. TOC trong React: `src/viewer/react/components/OutlinePanel.jsx` — `onClick` qua React, không còn N `addEventListener` thủ công trên từng link.
- **Tối ưu thêm (tùy chọn):** delegation một handler trên `<ul>`; `React.memo` cho từng item nếu re-render chrome thường xuyên.

---

## Issue #21 [MEDIUM] TOC: O(N) DOM nodes, không virtualization

- **Vị trí:** Outline thực tế: `src/viewer/react/components/OutlinePanel.jsx`. `src/viewer/core/toc-builder.js` (`renderToc`) vẫn tồn tại nhưng **không** còn là đường render chính của viewer.
- **Hiện trạng:** Mỗi heading → một `<li>` + `<a>` trong React; tài liệu lớn vẫn O(N) node sidebar.
- **Tác động:** TOC sidebar chậm khi scroll/layout trên tài liệu lớn.
- **Khuyến nghị fix:**
  - Virtual list cho TOC outline.
  - Collapse deeper levels mặc định + "show more" button.
  - `CSS contain: strict` trên sidebar container.

---

## Issue #22 [MEDIUM] Progress UI không throttle trong explorer scan

- **Vị trí (cập nhật):** `src/viewer/react/hooks/explorer/createExplorerViewActions.js` (`updateProgressLoading` ~58–66); scanner vẫn `src/viewer/explorer/folder-scanner.js` (`emitProgress`).
- **Hiện trạng:** Mỗi lần scanner gọi `onProgress` → patch React state (`safePatch`) **không** throttle (rAF / giới hạn Hz).
- **Tác động:** Scan lớn → nhiều re-render, có thể jank.
- **Khuyến nghị fix:**
  - Throttle progress UI (rAF hoặc 4–10 Hz).
  - Scanner: emit mỗi K files / folder.
  - Tránh copy object không cần thiết mỗi tick.

---

## Issue #23 [RESOLVED] `syncFolderDomExpandedState` querySelectorAll toàn bộ folder LIs

- **Vị trí:** `explorer-panel.js` đã bỏ. Trạng thái expand: `expandedMap` trong `src/viewer/react/hooks/explorer/explorerReducer.js` (`TOGGLE_FOLDER`).
- **Kết quả:** Không còn sync expanded state bằng `querySelectorAll` trên toàn cây DOM.

---

## Issue #24 [MEDIUM] Sidebar resize `pointermove` không dùng rAF

- **Vị trí (cập nhật):** `src/viewer/react/hooks/useSidebarResize.js` (`pointermove` ~55–58)  
  *(File cũ `sidebar-resize.js` đã bỏ.)*
- **Hiện trạng:** Mỗi sự kiện `pointermove` gọi `setSidebarWidth` trực tiếp, không batch qua `requestAnimationFrame`.
- **Tác động:** Drag nhanh → nhiều lần tính style / layout trong một frame.
- **Khuyến nghị fix:** Chỉ một cập nhật width mỗi frame (rAF).

---

## Issue #25 [MEDIUM] Code highlight plugin: per-block DOM surgery + tooltip chưa cleanup

- **Vị trí:** `src/plugins/core/code-highlight.plugin.js` (dòng 23–64)
- **Hiện trạng:**
  - `querySelectorAll` trên tất cả `pre` + per-block DOM operations (`insertBefore`, new nodes) → nhiều reflows.
  - `attachTooltip` trên **mỗi code block** → many DOM listeners.
  - `destroy` không được register với viewer lifecycle → tooltip `scroll`/`resize` listeners có thể survive sau article rebuild.
- **Khuyến nghị fix:**
  - Batch DOM updates trong `DocumentFragment` hoặc `requestAnimationFrame` chunking.
  - Central tooltip teardown on article rebuild.
  - Delegate tooltip cho tất cả copy buttons (một listener).

---

## Issue #26 [MEDIUM] Renderer tạo mới engine + plugin manager mỗi lần render

- **Vị trí:** `src/viewer/core/renderer.js` (dòng 33–37)
- **Hiện trạng:** Mỗi `renderDocument()` tạo **mới** `createPluginManager()` và `createMarkdownEngine()` → new markdown-it instance + plugin wiring.
- **Tác động:** Extra CPU + GC mỗi render, đặc biệt khi user đổi settings liên tục.
- **Khuyến nghị fix:**
  - Reuse engine + plugin manager, keyed by plugin settings hash.
  - Chỉ tạo mới khi enabled plugins thực sự thay đổi.

---

## Issue #27 [MEDIUM] Regex scan lặp lại trên sample text lớn (detection)

- **Vị trí:** `src/content/page-detector.js`, `src/content/text-sampling.js`
- **Hiện trạng:** Nhiều regex pass trên sample text lớn (20k chars) trong detect. `text-sampling.js` dùng `out += t` → O(n²) string concatenation trong worst case.
- **Tác động:** Tăng chi phí startup trên trang lớn.
- **Khuyến nghị fix:**
  - `text-sampling.js`: push chunks vào array rồi `.join('\n')` thay vì `+=`.
  - Gom heuristic thành single-pass scoring.
  - Tái sử dụng kết quả detect thay vì scan lại.

---

## Issue #28 [MEDIUM] Mermaid SVG export: large transient strings

- **Vị trí:** `src/plugins/optional/mermaid-export.js` (dòng 74–80)
- **Hiện trạng:** `serializeToString` + `encodeURIComponent` trên full SVG → large transient strings cho big diagrams.
- **Tác động:** Memory spike khi export diagram phức tạp.
- **Khuyến nghị fix:**
  - Dùng Blob URL + `fetch` thay vì data URL.
  - Hoặc stream to download nếu API cho phép.

---

## Issue #29 [MEDIUM] `explorerTreeContainsFileHref` full DFS mỗi lần check

- **Vị trí:** `src/viewer/explorer/explorer-files-context.js` (dòng 25–41, 66–69)
- **Hiện trạng:** `explorerTreeContainsFileHref` là O(tree size), được gọi từ `buildExplorerFilesContext` — mỗi khi cần check "file có trong tree không".
- **Tác động:** Repeated full tree walks trên large workspaces.
- **Khuyến nghị fix:**
  - Tạo `Set<href>` từ scanner, truyền vào context builder.
  - Memoize `(treeRef, fileUrl) → boolean` cho đến khi tree mutates.

---

## Issue #30 [MEDIUM] Gitignore matcher linear scan tất cả rules

- **Vị trí:** `src/viewer/explorer/gitignore-matcher.js` (dòng 114–137)
- **Hiện trạng:** `shouldIgnore` scan **tất cả sections** và **tất cả rules** linearly cho mỗi path check.
- **Tác động:** Deep scan với nhiều `.gitignore` files → large rule count × many entries.
- **Khuyến nghị fix:**
  - Index rules theo first path segment.
  - Short-circuit negative rules.
  - Optional: compile thành single automaton cho common cases.

---

## Issue #31 [MEDIUM] Tooltip forced layout khi show

- **Vị trí (cập nhật):** `src/viewer/dom-tooltip.js` (plugin/copy controls); `src/viewer/react/components/Tooltip.jsx` (chrome explorer/toolbar)  
  *(File cũ `src/viewer/tooltip.js` đã bỏ.)*
- **Hiện trạng:** Đo `offsetWidth` / `offsetHeight` sau khi gắn tip → có thể forced layout.
- **Tác động:** Minor jank; tích lũy khi nhiều tooltip hoặc cây lớn.
- **Khuyến nghị fix:** Defer `requestAnimationFrame`; hoặc `ResizeObserver`.

---

## Issue #32 [MEDIUM] Bootstrap: extraction chạy trước khi destroy app cũ

- **Vị trí:** `src/content/bootstrap.js` (dòng 94–98)
- **Hiện trạng:** `mountTarget.innerHTML = ''` clear UI **mà không** gọi `MarkdownViewerApp.destroy()` trước. Trên reinject/HMR, window/document listeners từ app cũ có thể survive.
- **Tác động:** Potential memory leak + duplicate listeners nếu content script reinject.
- **Khuyến nghị fix:**
  - Gọi `app.destroy()` trước khi clear.
  - Giữ singleton app ref trong content script module.

---

## Issue #33 [LOW-MEDIUM] `markdown-it` options: `typographer` + `linkify` trên toàn bộ doc

- **Vị trí:** `src/viewer/core/markdown-engine.js` (dòng 5–8)
- **Hiện trạng:** `typographer: true` và `linkify: true` thêm processing trên **toàn bộ** document.
- **Tác động:** Tăng parse time cho large docs.
- **Khuyến nghị fix:**
  - Settings-gated: cho phép user disable typographer/linkify.
  - Hoặc tự động disable cho docs > N KB.

---

## Issue #34 [LOW-MEDIUM] Explorer `sortListingEntries` hai lần filter + spread

- **Vị trí:** `src/viewer/explorer/folder-scanner.js` (dòng 92–99)
- **Hiện trạng:** `filter` dirs + `filter` files (hai mảng mới), sort riêng, rồi `[...dirs, ...files]`.
- **Tác động:** Large directories → thêm allocation so với single-pass partition.
- **Khuyến nghị fix:**
  - Single-pass partition (dirs vs files) hoặc một lần sort với comparator `isDir`-aware.

---

## Issue #35 [LOW-MEDIUM] KaTeX from CDN trong export (offline broken + no loading indicator)

- **Vị trí:** `src/viewer/actions/document-actions.js` (dòng 6, 140–141)
- **Hiện trạng:** Export HTML reference KaTeX từ CDN → offline broken, thêm network request, không có loading indicator.
- **Tác động:** UX kém khi export offline hoặc mạng chậm.
- **Khuyến nghị fix:**
  - Bundle KaTeX CSS cho export hoặc cache.
  - Show toast "loading styles" nếu phải fetch.

---

## Issue #36 [LOW-MEDIUM] Export double-click có thể trigger parallel exports

- **Vị trí (cập nhật):** `src/viewer/react/components/ToolbarActions.jsx` (`runExport` ~69–84)  
  *(File cũ `toolbar-actions.js` đã bỏ.)*
- **Hiện trạng:** `runExport` không có in-flight guard → double-click có thể chạy song song nhiều export.
- **Tác động:** UX + lãng phí tài nguyên.
- **Khuyến nghị fix:** Disable control hoặc promise flag trong lúc export.

---

## Issue #37 [LOW] Chuỗi copy churn trong normalize pipeline

- **Vị trí:** `src/content/raw-content-extractor.js` (`normalizeMarkdown()`)
- **Hiện trạng:** Chained `replace()` trên chuỗi lớn → nhiều bản sao tạm.
- **Khuyến nghị fix:** Giữ giới hạn input, chỉ normalize khi cần.

---

## Issue #38 [LOW] Ghi log payload settings đầy đủ

- **Vị trí:** `src/settings/index.js` (`saveSettings`)
- **Hiện trạng:** Có log object settings lớn.
- **Khuyến nghị fix:** Log metadata gọn (keys changed) thay vì full payload.

---

## Issue #39 [LOW] Per-row handlers trong tree + tooltip per folder (React)

- **Vị trí (cập nhật):** `src/viewer/react/components/explorer/FolderRow.jsx`, `FileRow.jsx`  
  *(File cũ `explorer-tree-renderer.js` đã bỏ.)*
- **Hiện trạng:** Mỗi row có `onClick` React; folder thường bọc `<Tooltip>`. Không còn `addEventListener` thủ công nhưng vẫn **O(rows)** handler/tooltip instances.
- **Khuyến nghị fix:** Event delegation trên container; một tooltip dùng chung hoặc lazy hover.

---

## Issue #40 [LOW] `normalizeFileUrlForCompare` parse URL mỗi lần gọi

- **Vị trí:** `src/viewer/explorer/url-utils.js` (dòng ~118–129)
- **Hiện trạng:** `new URL(...)` mỗi lần gọi — hot khi render tree / so sánh active file.
- **Khuyến nghị fix:** Cache normalized string trên node lúc scan.

---

## Issue #41 [LOW] `buildInitialExpandedMap` walk toàn bộ tree

- **Vị trí (cập nhật):** `src/viewer/explorer/explorer-tree-utils.js` (dòng ~75–85); gọi từ `createExplorerViewActions.js`.
- **Hiện trạng:** Walk mọi folder để seed `expandedMap` — có thể redundant nếu đã có metadata từ scan.
- **Khuyến nghị fix:** Lazy derive lần expand đầu hoặc dữ liệu scan-time.

---

## Issue #42 [LOW] Shiki `stripWhitespaceOnlyDirectChildTextNodes` spread childNodes

- **Vị trí:** `src/viewer/core/shiki-highlighter.js` (dòng 11–17)
- **Hiện trạng:** `[...parent.childNodes]` — extra array alloc per `pre`/`code`.
- **Khuyến nghị fix:** Iterate `childNodes` backward với index loop.

---

## Issue #43 [RESOLVED] `getToolbarHeight` không ổn định → `useScrollSpy` teardown mỗi lần render

- **Vị trí:** `src/viewer/react/components/OutlinePanel.jsx` (~25–29), `src/viewer/react/hooks/useScrollSpy.js` (effect phụ thuộc `getToolbarHeight`)
- **Đã xử lý:** `useScrollSpy` đã giữ `getToolbarHeight` qua `useRef` và chỉ recreate spy khi `scrollRoot`/`headings` đổi; callback toolbar-height vẫn đọc giá trị mới nhất qua ref.
- **Kết quả:** Tránh teardown/recreate scroll spy ở các re-render không liên quan của sidebar/chrome, giảm đo lại heading và churn event listener.

---

## Issue #44 [HIGH] Hai lần `root.render()` sau mỗi lần render tài liệu

- **Vị trí:** `src/viewer/app.js` (`syncTocItems` + `bumpChrome` sau `render()`), `src/viewer/react/mount.js` (`updateTocItems`, `bumpChrome`)
- **Hiện trạng:** Sau `renderDocument`, `syncTocItems` → `root.render` với `tocItems` mới; `finally` gọi `bumpChrome` → **`root.render` lần hai** trong cùng chu kỳ (hai lần reconcile shell cho một lần render doc).
- **Tác động:** Toàn bộ shell React reconcile hai lần mỗi lần mở/refresh doc.
- **Khuyến nghị fix:** Gộp một lần cập nhật chrome; hoặc chỉ `bumpChrome` khi đổi URL file / state thực sự, không sau mọi `syncTocItems`.

---

## Issue #45 [MEDIUM] `ToastContext` khiến cả cây re-render mỗi toast

- **Vị trí:** `src/viewer/react/contexts/ToastContext.jsx`, `src/viewer/react/ViewerApp.jsx` (provider bọc toàn app)
- **Hiện trạng:** `toastMessage` / `isVisible` đổi → mọi consumer / descendant reconcile (sidebar, outline, explorer, toolbar).
- **Khuyến nghị fix:** Tách state vs dispatch context; hoặc ref + subscriber hẹp chỉ cho `<Toast />`.

---

## Issue #46 [MEDIUM] Explorer bootstrap dù user chưa mở tab Files

- **Vị trí:** `src/viewer/react/components/FilesPanel.jsx` (`ExplorerPanel` luôn mount, chỉ `hidden`), `src/viewer/react/hooks/useExplorer.js` (effect mount ~769–805)
- **Hiện trạng:** `useExplorer` chạy restore workspace / sibling scan ngay khi mount, kể cả khi user chỉ xem Outline.
- **Khuyến nghị fix:** Lazy-mount `ExplorerPanel` / defer bootstrap khi `activeSidebarTab === 'files'` lần đầu.

---

## Issue #47 [MEDIUM] `TOGGLE_FOLDER` clone toàn bộ `expandedMap`

- **Vị trí:** `src/viewer/react/hooks/explorer/explorerReducer.js` (~36–40)
- **Hiện trạng:** `new Map(state.expandedMap)` copy **mọi** key mỗi lần toggle → O(k) với k = số folder từng expand.
- **Khuyến nghị fix:** Structural sharing, `Set` + version, hoặc ref map + bump revision.

---

## Issue #48 [MEDIUM] `article-interactions`: timer feedback copy không clear khi `destroy()`

- **Vị trí:** `src/viewer/article-interactions.js` (WeakMap timer ~18–45; `destroy` ~171–181)
- **Hiện trạng:** `destroy()` gỡ listener nhưng không `clearTimeout` các timer trong `copyButtonFeedbackTimers`.
- **Khuyến nghị fix:** Set id timer đang chờ; clear hết trong `destroy()`.

---

## Quick wins nên làm trước

1. ~~**Issue #1:** Scroll spy — đã dùng offsets + binary search.~~ *(RESOLVED)*
2. ~~**Fix Issue #43:** Ổn định `getToolbarHeight` / deps `useScrollSpy`.~~ *(RESOLVED)*
3. **Fix Issue #44:** Tránh double `root.render` sau mỗi document render.
4. ~~**Fix Issue #2:** Lazy render children khi expand folder (React tree).~~ *(RESOLVED)*
5. **Fix Issue #4:** Dynamic `import()` cho optional plugins (Math/KaTeX đặc biệt).
6. **Fix Issue #5:** Giới hạn Shiki langs ban đầu + concurrency limit cho code highlighting.
7. **Fix Issue #8:** Thêm loading state (skeleton/spinner) cho render pipeline.
8. ~~**Issue #14 / #20:** Explorer active + TOC imperative — đã chuyển React.~~ *(RESOLVED)*
9. **Fix Issue #22:** Throttle progress UI updates trong explorer scan.
10. **Fix Issue #24:** rAF throttle cho sidebar resize.

## Deeper refactors để đạt hiệu quả bền vững

1. ~~Tách content script thành "thin loader" + dynamic import viewer (Issue #3).~~ *(RESOLVED)*
2. String-based Shiki approach thay vì DOM round-trip (Issue #6).
3. Virtual list cho explorer tree + TOC sidebar (Issue #9, #21).
4. Reuse markdown engine + plugin manager across renders (Issue #26).
5. Cache rendered HTML; theme/plugin change chỉ re-run Shiki (Issue #17 đã có fast path typography/layout; stretch: cache pre-Shiki HTML).
6. Bounded concurrency cho folder scanning (Issue #11).
7. Progressive/chunked render cho tài liệu 1MB+ (Issue #8).

---

## Đề xuất UX improvements

### Loading behavior

1. **Skeleton screen** khi mở file lớn: hiển thị layout shell (sidebar + content area placeholder) ngay lập tức, render content dần.
2. **Progress indicator** cho folder scan: đã có nhưng cần throttle để mượt hơn.
3. **Shiki loading state**: hiển thị plain code blocks trước, highlight dần khi Shiki ready (progressive enhancement).
4. **Large file warning**: nếu markdown > 500KB, hiển thị toast/banner "Large file — rendering may take a moment".

### Responsive behavior

5. **Lazy Mermaid/Math render**: chỉ render diagrams khi scroll vào viewport (IntersectionObserver).
6. **Collapsed TOC levels**: mặc định chỉ hiển thị heading level 1–2, expand on click cho deep levels.
7. **Explorer tree pagination**: cho workspace > 500 files, load thêm khi scroll.

### Error resilience

8. **Export timeout guard**: nếu export mất > 5s, cho user option cancel.
9. **Graceful degradation**: nếu Shiki fail, fallback plain code blocks không break toàn bộ render.
10. **Scan cancellation feedback**: khi user cancel scan, hiển thị partial results thay vì clear.

---

## Đề xuất theo dõi sau khi fix

- Đo thời gian startup content script trên trang không phải markdown (target: <5ms parse+eval).
- Đo FPS/CPU khi scroll tài liệu có >200 headings (target: 60fps, <5% CPU).
- Đo thời gian render pipeline cho file 500KB / 1MB (target: <2s / <5s).
- Đo memory usage cho workspace 2000 files trong explorer (target: <50MB delta).
- So sánh peak heap trước/sau với tài liệu markdown rất lớn.
- Theo dõi số lần rerender toàn bộ document khi đổi settings UI.
- Profile Shiki initialization time + per-block highlight time.
