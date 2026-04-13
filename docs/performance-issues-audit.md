# Đánh giá vấn đề hiệu năng - Markdown Plus Extension

Ngày kiểm tra: 2026-04-13  
Phạm vi: `src/**` (kèm `manifest.json`, `vite.config.mjs` để lấy bối cảnh runtime)

## Tổng quan

Rủi ro lớn nhất về hiệu năng hiện tại tập trung ở:

1. Content script load nặng trên mọi trang (eager CSS + KaTeX + optional plugins trong bundle).
2. Render pipeline cho tài liệu lớn chạy tuần tự trên main thread (markdown-it → Shiki → DOMPurify → innerHTML).
3. Shiki highlighter khởi tạo toàn bộ ngôn ngữ + highlight song song không giới hạn.
4. Explorer tree tạo toàn bộ DOM cho mọi node (kể cả folder đang collapsed), không có virtualization.
5. Scroll spy O(N) getBoundingClientRect mỗi scroll tick.
6. Folder scan tuần tự + progress UI không throttle → jank.

---

## Danh sách issue theo mức độ nghiêm trọng

---

## Issue #1 [CRITICAL] Scroll spy O(N) headings với forced layout mỗi scroll tick

- **Vị trí:** `src/viewer/core/scroll-spy.js` (dòng 20–32)
- **Hiện trạng:** Mỗi lần scroll, hàm `computeActiveId()` chạy trong `requestAnimationFrame` duyệt **toàn bộ heading** và gọi `getBoundingClientRect()` trên mỗi heading. Với 200+ headings, mỗi scroll frame gây O(N) forced layout reads.
- **Tác động:** Drop frame rõ rệt, CPU spike liên tục khi scroll tài liệu lớn. Đây là bottleneck scaling rõ ràng nhất cho "many headings".
- **Khuyến nghị fix:**
  - **Ưu tiên:** Chuyển sang `IntersectionObserver` với root margin phù hợp.
  - **Thay thế:** Precompute offset map + binary search, chỉ cập nhật map khi resize/content thay đổi.
  - Debounce resize handler (~100ms) thay vì chạy full scan mỗi resize event.

---

## Issue #2 [CRITICAL] Explorer tree tạo toàn bộ DOM cho collapsed folders

- **Vị trí:** `src/viewer/explorer/explorer-tree-renderer.js` (dòng 164–228, `appendTreeNode`)
- **Hiện trạng:** `appendTreeNode` luôn tạo **toàn bộ subtree** cho mỗi folder, kể cả khi folder collapsed (chỉ set `childUl.hidden = true`). Với workspace 2000 files + nhiều folder lồng nhau, hàng ngàn DOM node được tạo và mount ngay lập tức dù user chỉ thấy root.
- **Tác động:** Initial mount rất chậm cho large workspace, memory cao, layout/paint cost lớn.
- **Khuyến nghị fix:**
  - **Ưu tiên:** Lazy render — chỉ tạo direct children khi folder được expand lần đầu.
  - **Thay thế:** Virtual list (chỉ render visible rows) hoặc flatten tree thành list với indentation.
  - Kết hợp: collapse tất cả folder mặc định + lazy children.

---

## Issue #3 [CRITICAL] Content script load nặng trên mọi trang

- **Vị trí:** `src/content/index.js` (dòng 5–10, 29–37)
- **Hiện trạng:** Static imports kéo toàn bộ **5 SCSS bundles** (`?inline`), **KaTeX CSS**, và chuỗi style vào bundle. Content script được đăng ký cho broad URL patterns → engine parse/eval bundle lớn trên **mọi tab** trước khi biết có phải markdown hay không.
- **Trạng thái:** Cải thiện so với trước (không còn fetch CSS), nhưng vẫn tốn parse + eval + memory.
- **Tác động:** Tăng thời gian load và memory usage trên tất cả trang, kể cả trang không phải markdown.
- **Khuyến nghị fix:**
  - **Ưu tiên:** Tách "thin loader" (chỉ URL/protocol check) → `import()` động viewer + styles chỉ khi cần mount.
  - `extensionizeKatexFontUrls()` chạy regex trên full KaTeX CSS mỗi lần mount → preprocess lúc build hoặc cache kết quả.

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

- **Vị trí:** `src/viewer/explorer/explorer-panel.js` (dòng 394–495)
- **Hiện trạng:** `showFiles()` và `showTree()` tạo **một DOM node cho mỗi file/folder** mà không có virtualization. Sidebar scroll height = full list.
- **Tác động:** Với workspace 2000 files, mount và scroll sidebar chậm, memory tăng, layout/style cost O(N).
- **Khuyến nghị fix:**
  - Virtual list: chỉ render visible rows + buffer.
  - **Hoặc:** Lazy render folder children on expand (kết hợp Issue #2).
  - `showTree()` gọi `countMarkdownFilesInTree()` (full tree walk) rồi build DOM (second walk) → single-pass: count while building.

---

## Issue #10 [HIGH] Full markdown extraction trước khi check settings

- **Vị trí:** `src/content/bootstrap.js` (dòng 45–49)
- **Hiện trạng:** Trên low-confidence `file:` pages, nếu sample "looks like markdown", `extractRawMarkdown(document)` chạy **full mode** (up to 500k chars) **trước** khi gọi `GET_SETTINGS`. Nếu viewer disabled → toàn bộ extraction bị lãng phí.
- **Tác động:** Tốn CPU + memory trên trang `file:` có nội dung dài mà user đã disable extension.
- **Khuyến nghị fix:**
  - Gọi `GET_SETTINGS` (hoặc lightweight "enabled" check) **trước** extraction.
  - Chỉ chạy full extraction nếu `enabled === true`.

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

## Issue #12 [HIGH] Background `notifySettingsUpdated` broadcast tới mọi tab

- **Vị trí:** `src/background/message-router.js` (dòng 7–21)
- **Hiện trạng:** Mỗi khi save/reset settings, `chrome.tabs.query({})` rồi `sendMessage` **tới mọi tab** đang mở.
- **Tác động:** Với nhiều tab (20+), mỗi lần đổi settings gây spike messaging. Các tab không phải markdown nhận message không cần thiết.
- **Khuyến nghị fix:**
  - Restrict `tabs.query` tới `url` patterns liên quan (e.g. `file://**/*.md`).
  - Hoặc: content scripts tự register/unregister interest; background chỉ gửi cho tabs đã register.
  - Debounce notify nếu user đổi nhiều settings liên tiếp.

---

## Issue #13 [HIGH] Sibling scan không có AbortController

- **Vị trí:** `src/viewer/explorer/explorer-controller.js` (dòng 799–812)
- **Hiện trạng:** `runSiblingScan` gọi `scanFolderRecursive` **không truyền `signal`**. Workspace flow có `AbortController`, nhưng sibling scan thì không → scan không thể cancel nếu user navigate đi hoặc switch tab.
- **Tác động:** Wasted CPU/network nếu user navigate trước khi scan xong.
- **Khuyến nghị fix:**
  - Pass `AbortController` vào `scanFolderRecursive` cho sibling scan.
  - Abort trong `destroy()` hoặc mode switches.

---

## Issue #14 [HIGH] `markActiveFile` O(N) querySelectorAll trên mọi file row

- **Vị trí:** `src/viewer/explorer/explorer-panel.js` (dòng 245–262)
- **Hiện trạng:** `markActiveFile` dùng `querySelectorAll('button[data-file-href]')` rồi loop **tất cả** file row để toggle class active.
- **Tác động:** Với 1000+ files, mỗi lần navigate sang file mới → costly DOM query + class toggle trên tất cả buttons.
- **Khuyến nghị fix:**
  - Lưu reference tới active button hiện tại.
  - Khi navigate: chỉ remove class từ button cũ + add class cho button mới (O(1) thay vì O(N)).

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

## Issue #17 [MEDIUM-HIGH] Full rerender khi thay đổi settings (kể cả style-only khi theme khác)

- **Vị trí:** `src/viewer/app.js` (dòng 197–206), `src/shared/settings-diff.js`
- **Hiện trạng:** `updateSettings()` dùng `needsFullRender()` để phân biệt style-only vs full render. Tuy nhiên, **theme changes vẫn force full render** (vì Shiki cần re-highlight với theme mới). Mỗi full render = parse markdown + sanitize + gán innerHTML.
- **Tác động:** Đổi theme trên tài liệu lớn → vài giây freeze.
- **Khuyến nghị fix:**
  - Cache rendered HTML keyed by `(markdown + parser options hash)`.
  - Với theme change: chỉ re-run Shiki (không cần re-parse markdown-it).
  - Tách pipeline: markdown parse → cache → Shiki → sanitize → DOM.

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

## Issue #20 [MEDIUM] TOC rebuild mỗi lần render + N click listeners

- **Vị trí:** `src/viewer/actions/rebuild-toc.js` (dòng 16–24, 44–64)
- **Hiện trạng:**
  - Full rebuild (`buildTocItems` + `renderToc`) mỗi khi `rebuildToc` chạy (paired với mỗi document render trong `app.js`).
  - Mỗi TOC link được gắn **click listener riêng** → N listeners cho N headings.
- **Tác động:** 200+ headings → 200+ closures + listeners + DOM nodes mỗi lần render.
- **Khuyến nghị fix:**
  - Skip rebuild nếu heading structure không thay đổi (diff heading IDs).
  - **Event delegation:** Một delegated listener trên `tocContainer` dùng `closest('a')`.

---

## Issue #21 [MEDIUM] TOC renderToc tạo 200+ DOM nodes không virtualization

- **Vị trí:** `src/viewer/core/toc-builder.js` (dòng 37–69)
- **Hiện trạng:** `renderToc` tạo `<li>` + `<a>` cho **mỗi heading** — 200+ nodes, long reflow/paint cho sidebar.
- **Tác động:** TOC sidebar chậm khi scroll/layout trên tài liệu lớn.
- **Khuyến nghị fix:**
  - Virtual list cho TOC outline.
  - Collapse deeper levels mặc định + "show more" button.
  - `CSS contain: strict` trên sidebar container.

---

## Issue #22 [MEDIUM] Progress UI không throttle trong explorer scan

- **Vị trí:** `src/viewer/explorer/explorer-controller.js` (dòng 805–810, 571–576), `src/viewer/explorer/explorer-panel.js` (dòng 356–361)
- **Hiện trạng:** `onProgress` callback invokes `explorerPanel.updateProgressLoading` **mỗi khi scanner emit progress** (per file / per folder). `folder-scanner.js` emit rất thường xuyên (`emitProgress` spread `{...stats}` mỗi lần).
- **Tác động:** Frequent DOM `textContent` updates + object spread → main thread pressure, có thể gây jank trong scan.
- **Khuyến nghị fix:**
  - Throttle progress UI updates (rAF hoặc max 4–10 Hz).
  - Scanner: emit progress mỗi K files thay vì mỗi file.
  - Tránh spread `{...stats}` mỗi lần — pass mutable reference.

---

## Issue #23 [MEDIUM] `syncFolderDomExpandedState` querySelectorAll toàn bộ folder LIs

- **Vị trí:** `src/viewer/explorer/explorer-panel.js` (dòng 501–513)
- **Hiện trạng:** Mỗi lần expand/collapse folder, `querySelectorAll('li[data-folder-href]')` chạy trên **tất cả** folder LIs + nested query per row.
- **Tác động:** Large trees → expensive toggle operation.
- **Khuyến nghị fix:**
  - Toggle chỉ clicked folder's subtree.
  - Store refs khi tạo DOM, tránh global querySelectorAll.

---

## Issue #24 [MEDIUM] Sidebar resize `pointermove` không dùng rAF

- **Vị trí:** `src/viewer/sidebar-resize.js` (dòng 64–66)
- **Hiện trạng:** `pointermove` handler update CSS variable `--mdp-toc-width` **mỗi event** không qua `requestAnimationFrame`.
- **Tác động:** Có thể cause multiple style recalculations per frame khi drag nhanh.
- **Khuyến nghị fix:**
  - Throttle update bằng `requestAnimationFrame` — chỉ một update per frame.

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

- **Vị trí:** `src/viewer/tooltip.js` (dòng 47–48)
- **Hiện trạng:** `offsetWidth` / `offsetHeight` sau append → forced layout flush.
- **Tác động:** Minor jank khi show tooltip, nhưng tích lũy nếu nhiều tooltips xuất hiện liên tiếp.
- **Khuyến nghị fix:**
  - Defer với `requestAnimationFrame`.
  - Hoặc dùng `ResizeObserver` cho positioning.

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

## Issue #34 [LOW-MEDIUM] Explorer `sortListingEntries` nhiều filter pass

- **Vị trí:** `src/viewer/explorer/folder-scanner.js` (dòng 92–99)
- **Hiện trạng:** 4 `filter` passes trên `sorted` array, tạo new arrays mỗi lần.
- **Tác động:** Large directories → extra allocations.
- **Khuyến nghị fix:**
  - Single-pass partition (dirs vs files vs md) hoặc sort với typed comparator.

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

- **Vị trí:** `src/viewer/actions/toolbar-actions.js` (dòng 67–81)
- **Hiện trạng:** `runExport` không có in-flight guard → double-click start parallel exports.
- **Tác động:** UX issue + wasted resources.
- **Khuyến nghị fix:**
  - Disable button hoặc guard với promise flag trong khi export đang chạy.

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

## Issue #39 [LOW] Per-row click listeners trong tree + tooltip per folder

- **Vị trí:** `src/viewer/explorer/explorer-tree-renderer.js` (dòng 120–156, 212–216)
- **Hiện trạng:** Mỗi file row + folder row đều register click listener riêng + tooltip riêng.
- **Khuyến nghị fix:** Event delegation trên `listEl`. Tooltip delegate hoặc show on first hover only.

---

## Issue #40 [LOW] `normalizeFileUrlForCompare` parse URL mỗi lần gọi

- **Vị trí:** `src/viewer/explorer/url-utils.js` (dòng 117–128)
- **Hiện trạng:** Parse URL every time, hot trong tree walks và `markActiveFile`.
- **Khuyến nghị fix:** Cache normalized strings trên tree nodes lúc scan.

---

## Issue #41 [LOW] `buildInitialExpandedMap` walk toàn bộ tree

- **Vị trí:** `src/viewer/explorer/explorer-tree-renderer.js` (dòng 92–103)
- **Hiện trạng:** Walk mọi folder node để seed `expandedMap` — redundant nếu stats đã có từ scanning.
- **Khuyến nghị fix:** Derive lazily on first expand hoặc dùng scan-time data.

---

## Issue #42 [LOW] Shiki `stripWhitespaceOnlyDirectChildTextNodes` spread childNodes

- **Vị trí:** `src/viewer/core/shiki-highlighter.js` (dòng 11–17)
- **Hiện trạng:** `[...parent.childNodes]` — extra array alloc per `pre`/`code`.
- **Khuyến nghị fix:** Iterate `childNodes` backward với index loop.

---

---

## Quick wins nên làm trước

1. **Fix Issue #1:** Chuyển scroll spy sang `IntersectionObserver` (hoặc cached offsets + binary search).
2. **Fix Issue #2:** Lazy render cho collapsed folders trong explorer tree.
3. **Fix Issue #4:** Dynamic `import()` cho optional plugins (Math/KaTeX đặc biệt).
4. **Fix Issue #5:** Giới hạn Shiki langs ban đầu + concurrency limit cho code highlighting.
5. **Fix Issue #8:** Thêm loading state (skeleton/spinner) cho render pipeline.
6. **Fix Issue #14:** O(1) `markActiveFile` bằng cách lưu reference tới active button.
7. **Fix Issue #20:** Event delegation cho TOC click handlers.
8. **Fix Issue #22:** Throttle progress UI updates trong explorer scan.
9. **Fix Issue #24:** rAF throttle cho sidebar resize.

## Deeper refactors để đạt hiệu quả bền vững

1. Tách content script thành "thin loader" + dynamic import viewer (Issue #3).
2. String-based Shiki approach thay vì DOM round-trip (Issue #6).
3. Virtual list cho explorer tree + TOC sidebar (Issue #2, #9, #21).
4. Reuse markdown engine + plugin manager across renders (Issue #26).
5. Cache rendered HTML, chỉ re-run phần thay đổi khi settings update (Issue #17).
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
