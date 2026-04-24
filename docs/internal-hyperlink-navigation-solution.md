# Internal Markdown Link Navigation Solution

## 1) Mục tiêu

Khi người dùng click một hyperlink trong nội dung Markdown trỏ tới file Markdown khác trong cùng folder hoặc trong cùng workspace, viewer nên mở file đó ngay bên trong Markdown Plus, không để Chrome reload trang thô và không làm mất shell hiện tại.

Trải nghiệm mong muốn:
- Click `./other.md`, `other.md`, `notes/spec.md`, `../README.md#install` mở tài liệu tương ứng trong viewer.
- Giữ được sidebar, Files explorer, theme, plugin, toast, scroll behavior.
- Hash sau file được honor sau khi render file mới.
- Back/Forward của browser hoạt động tự nhiên với các file đã mở.
- Ctrl/Cmd click, middle click vẫn để browser xử lý theo kỳ vọng mở tab mới.
- Link không phải Markdown như web URL, mailto, tel, image, PDF, asset vẫn giữ hành vi mặc định.

## 2) Bối cảnh hiện tại

### 2.1 Article interactions

`src/viewer/article-interactions.js` xử lý:
- copy code block (`button.mdp-code-block__copy`)
- heading anchor click để copy section link (`.mdp-heading-anchor`)
- same-document hash link (`a[href^="#"]`) để smooth scroll
- `hashchange` event listener cho scroll khi hash thay đổi

### 2.2 Files explorer navigation

Files explorer đã có logic mở file trong `src/viewer/react/hooks/useExplorer.js`:
- `navigateToFile.current(fileUrl, options)` — mutable ref, reassigned trong hook body
- Fetch real `file:` qua `MESSAGE_TYPES.FETCH_FILE_AS_TEXT` (background + offscreen)
- `navigateWorkspaceVirtualFile()` đọc từ `workspaceVirtualReadersRef` (File/FileSystemFileHandle)
- Sau fetch: set markdown → render → scroll top → update URL (`pushState`/`replaceState`) → update title → update sidebar active file
- Quản lý `currentFileUrlRef`, `explorerModeRef`, sidebar tree state, back button

### 2.3 Markdown engine link rendering

**QUAN TRỌNG:** `src/viewer/core/markdown-engine.js` hiện set `target="_blank"` và `rel="noopener noreferrer"` trên **MỌI** link, không phân biệt internal hay external:

```js
md.renderer.rules.link_open = function linkOpen(tokens, idx, options, env, self) {
  const token = tokens[idx]
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer')
  // ...
}
```

Điều này xung đột trực tiếp với click interception: nếu mọi link đều có `target="_blank"`, trình duyệt sẽ mở tab mới thay vì cho phép viewer intercept. **Phải sửa markdown engine trước khi implement link navigation.**

### 2.4 URL helpers

`src/viewer/explorer/url-utils.js`: `isWorkspaceVirtualHref`, `getParentDirectoryUrl`, `normalizeFileUrlForCompare`, `isMarkdownFileHref`, `MARKDOWN_EXT` (alias `MARKDOWN_PATHNAME_EXT_RE`).

`isMarkdownFileHref()` hiện chỉ check `file:` protocol — cần mở rộng hoặc tạo resolver riêng cho relative href.

### 2.5 Current file URL tracking

Hai nơi track current file URL song song:
- `MarkdownViewerApp._currentFileUrl` trong `src/viewer/app.js`
- `currentFileUrlRef` trong `useExplorer.js`, sync qua `bridge.updateCurrentFileUrl()`

`app.js` là source of truth cho viewer-wide state; `useExplorer` cập nhật qua bridge callback. Link resolver cần đọc từ `app.js._currentFileUrl` (hoặc `getCurrentFileUrl()` callback).

### 2.6 Vấn đề cần giải quyết

Hyperlink trong article chưa dùng lại được flow mở file của explorer. Nếu để browser xử lý mặc định, Chrome mở raw file, reload context, extension phải mount lại từ đầu. UX không mượt.

## 3) Nguyên tắc thiết kế

1. Internal Markdown link navigation là capability của viewer, không phải riêng Files explorer.
2. Chỉ intercept link khi chắc chắn đó là file Markdown nội bộ có thể render được.
3. Không phá hành vi browser chuẩn cho modifier keys, new tab, external URL, download, non-Markdown assets.
4. URL trên thanh địa chỉ nên phản ánh tài liệu đang xem khi tài liệu có `file:` URL thật.
5. Với virtual workspace files, dùng `history.pushState` với state chứa virtual href — không cố tạo URL giả.
6. Mọi trạng thái loading/error phải nhìn thấy được, không click xong im lặng.
7. Ưu tiên tiếp cận đơn giản: expose navigation qua bridge pattern đã có thay vì refactor lớn useExplorer ngay lập tức.

## 4) Phân loại link cần xử lý

### 4.1 Same-document hash

Ví dụ:
- `#section`
- `#cài-đặt`

Hành vi:
- Giữ flow hiện tại trong `article-interactions.js`.
- `history.replaceState` update hash.
- Smooth scroll tới heading nếu tồn tại.
- Nếu heading không tồn tại: không crash, update hash nhưng không toast.

### 4.2 Self-link (link tới chính file đang xem)

Ví dụ đang xem `a.md`:
- `a.md` (không hash) → scroll top, không re-fetch
- `a.md#section` → chuyển thành same-document hash scroll, không re-fetch
- `./a.md#section` → tương tự

Hành vi:
- Resolver detect khi resolved URL trùng `currentFileUrl` (sau normalize).
- Nếu có hash: smooth scroll tới heading.
- Nếu không hash: scroll top.
- **Không** fetch lại file, **không** re-render.
- Update hash trong URL nếu cần.

### 4.3 Relative Markdown file cùng folder

Ví dụ trong `/docs/a.md`:
- `b.md`
- `./b.md`
- `b.markdown`
- `b.mdown`
- `b.md#usage`

Hành vi:
- Resolve against `currentFileUrl` (từ `app.js`), **không** dùng `window.location.href` vì có thể lỗi thời sau navigation nội bộ.
- Nếu target extension match `MARKDOWN_PATHNAME_EXT_RE` → intercept.
- Fetch file qua background (`FETCH_FILE_AS_TEXT`), render trong cùng viewer.
- Sau render, nếu có hash thì scroll tới heading (xem mục 8.4 về scroll reliability).
- Push history entry.
- Set active file trong sidebar.
- Update title: `b - Markdown Plus`.

### 4.4 Relative Markdown file trong subfolder hoặc parent folder

Ví dụ:
- `guides/install.md`
- `./guides/install.md#step-2`
- `../README.md`
- `../../shared/spec.md`

Hành vi:
- Normalize path bằng `new URL(rawHref, currentFileUrl)`.
- Chấp nhận khi resolved target là `file:` Markdown:
  - **sibling mode**: chấp nhận mọi readable `file:` Markdown mà background fetch được.
  - **workspace mode** có real root: nếu target trong workspace → update active file trong tree. Nếu ngoài root nhưng fetch được → mở nhưng sidebar có thể chuyển sang sibling scan cho folder mới.
  - **virtual workspace mode**: chỉ chấp nhận nếu target map được tới virtual reader.
- Nếu parent traversal ra ngoài thư mục hiện tại nhưng file đọc được: mở, back button hiển thị.

### 4.5 Absolute `file:` Markdown link

Ví dụ:
- `file:///Users/me/project/docs/b.md`

Hành vi:
- Intercept nếu extension có quyền đọc và extension match.
- Fetch qua background.
- Nếu fetch fail: toast `Could not open linked file`.
- Không fallback sang raw Chrome view sau khi đã `preventDefault`.

### 4.6 Workspace virtual link

Nguồn phát sinh:
- Files import qua folder picker fallback không có `file:` URL thật.
- Href có prefix `MDP_WS_FILE` từ `shared/constants/explorer.js`.

Hành vi:
- Chỉ mở nếu virtual readers map có entry.
- Không update `window.location` sang virtual URL.
- Dùng `history.pushState({ mdpFileUrl: virtualHref, mdpVirtual: true }, '', currentRealPageUrl)`.
- Sidebar active state update bằng virtual href.

**Hạn chế đã biết:** relative assets (images, diagrams) trong virtual workspace files sẽ không resolve đúng vì browser URL không trỏ tới file thật. Ghi nhận, xử lý khi cần (có thể rewrite `<img src>` trong render pipeline cho virtual files).

### 4.7 Non-Markdown local assets

Ví dụ: `image.png`, `diagram.svg`, `report.pdf`, `data.json`, `archive.zip`

Hành vi:
- Không intercept.
- Browser xử lý mặc định (nhờ link giữ nguyên `target="_blank"` cho non-markdown local assets).

### 4.8 External links

Ví dụ: `https://example.com`, `http://localhost:3000`, `mailto:abc@example.com`, `tel:...`

Hành vi:
- Không intercept.
- Giữ `target="_blank"` + `rel="noopener noreferrer"` (từ markdown engine sau fix).

### 4.9 Empty, malformed, unsafe href

Ví dụ: `href=""`, `javascript:alert(1)`, malformed percent encoding, `data:text/html,...`

Hành vi:
- `javascript:` / `data:` đã bị sanitizer loại bỏ.
- Resolver fail closed: không intercept nếu không parse được.
- Empty href: để browser mặc định.

## 5) Prerequisite: Fix markdown engine link rendering

**Phải thực hiện TRƯỚC khi implement navigation.**

### 5.1 Vấn đề

`markdown-engine.js` gán `target="_blank"` cho mọi link. Internal markdown links (`b.md`, `../README.md`) không nên mở tab mới mặc định.

### 5.2 Giải pháp

Sửa `link_open` rule để chỉ gán `target="_blank"` cho external links:

```js
md.renderer.rules.link_open = function linkOpen(tokens, idx, options, env, self) {
  const token = tokens[idx]
  const href = token.attrGet('href') || ''

  if (isExternalHref(href)) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }

  if (typeof defaultLinkOpenRule === 'function') {
    return defaultLinkOpenRule(tokens, idx, options, env, self)
  }
  return self.renderToken(tokens, idx, options)
}
```

`isExternalHref` check:
- `http:`, `https:` → external
- `mailto:`, `tel:` → external
- `file:` absolute → internal (giữ không `_blank`)
- relative path → internal (giữ không `_blank`)
- `#` only → internal
- `javascript:`, `data:` → bỏ qua (sanitizer sẽ xử lý)

Đặt function trong `markdown-engine.js` hoặc import từ shared util nếu dùng lại.

### 5.3 Verify DOMPurify

DOMPurify (từ `renderer.js`) cần preserve relative href values. Kiểm tra:
- `href="b.md"` → giữ nguyên ✓ (DOMPurify không strip relative URLs)
- `href="../README.md#install"` → giữ nguyên ✓
- `href="file:///path/to/file.md"` → giữ nguyên ✓

DOMPurify chỉ strip `javascript:`, `data:`, `vbscript:` protocols. Relative và `file:` an toàn.

## 6) Link resolver

### 6.1 Module

```text
src/viewer/navigation/link-resolver.js
```

### 6.2 `resolveMarkdownLink(rawHref, context)`

Input:

```js
{
  rawHref,              // string — raw href attribute from <a>
  currentFileUrl,       // string — file viewer đang render (từ app.js)
  isVirtualWorkspace,   // boolean
  virtualFileExists     // (href) => boolean
}
```

Output:

```js
{
  kind: 'same-document-hash'
    | 'self-link'
    | 'markdown-file'
    | 'workspace-virtual-file'
    | 'external'
    | 'asset'
    | 'unsupported',
  resolvedUrl,       // string | null — full resolved URL
  hash,              // string | null — hash fragment (without #)
  shouldIntercept    // boolean
}
```

### 6.3 Resolution rules (theo thứ tự ưu tiên)

1. Empty / falsy href → `unsupported`, `shouldIntercept: false`
2. `javascript:`, `data:`, `blob:` → `unsupported`, `shouldIntercept: false`
3. Starts with `#` → `same-document-hash`, `shouldIntercept: true` (giữ cho article-interactions xử lý)
4. `http:`, `https:`, `mailto:`, `tel:` → `external`, `shouldIntercept: false`
5. `MDP_WS_FILE` prefix → nếu `virtualFileExists(href)` true: `workspace-virtual-file`, `shouldIntercept: true`; else `unsupported`
6. Relative hoặc `file:` absolute → resolve bằng `new URL(rawHref, currentFileUrl)`:
   - Tách hash trước khi check extension
   - Nếu resolved pathname match `MARKDOWN_PATHNAME_EXT_RE`:
     - So sánh resolved URL (no hash) với `currentFileUrl` (normalized) → nếu trùng: `self-link`
     - Else: `markdown-file`, `shouldIntercept: true`
   - Else: `asset`, `shouldIntercept: false`

### 6.4 Edge cases

- URL có query string (`?raw=1`): check extension trên pathname, không pathname+query. Fetch thử bỏ query nếu fetch thất bại (local filesystem không có query).
- File name có space: `new URL()` tự encode. `My Notes.md` → `My%20Notes.md` trong URL.
- File name có Unicode: `new URL()` xử lý encoding. Display dùng `decodeURIComponent`.
- Encoded href: `My%20Notes.md` → `new URL()` normalize đúng.
- Hash encoded Unicode: tách và preserve riêng.

## 7) Click interception policy

Trong article click handler, intercept khi **tất cả** điều kiện thỏa:

1. `event.button === 0` (left click)
2. Không có modifier: `!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey`
3. Link không có `download` attribute
4. Link target không phải `_blank`, `_parent`, `_top` (sau fix markdown engine, internal links sẽ không có target)
5. `resolveMarkdownLink()` trả `shouldIntercept: true`

Nếu bất kỳ điều kiện nào không thỏa → return, để browser xử lý mặc định.

**Thứ tự xử lý trong articleClickHandler:**

```
1. handleCodeCopyClick       → return if matched
2. handleAnchorLinkClick     → return if matched (heading anchor copy)
3. handleInternalLinkClick   → return if matched (NEW — markdown navigation)
4. handleHashLinkClick       → return if matched (same-doc scroll, catch-all hash)
```

`handleInternalLinkClick` phải đứng TRƯỚC `handleHashLinkClick` vì `b.md#section` cũng chứa `#` nhưng không phải same-document hash.

## 8) Navigation execution

### 8.1 Approach: Expose qua bridge pattern

Thay vì extract `navigateToFile` thành module riêng ngay (rủi ro refactor lớn), expose navigation qua `explorerBridge` đã có:

```js
// Trong app.js init(), explorerBridge bổ sung:
explorerBridge: {
  // ... existing callbacks ...
  navigateToFile: async (fileUrl, options) => { /* delegated to useExplorer */ },
  getCurrentFileUrl: () => this._currentFileUrl,
  getExplorerMode: () => { /* from explorer-state */ },
  getWorkspaceRootUrl: () => { /* from explorer-state */ },
  virtualFileExists: (href) => { /* check workspaceVirtualReadersRef */ }
}
```

`article-interactions.js` nhận thêm callbacks khi `createArticleInteractions()`:

```js
createArticleInteractions({
  getArticle,
  showToast,
  getScrollRoot,
  // New:
  getCurrentFileUrl,       // () => string
  navigateToFile,          // (fileUrl, opts) => Promise<void>
  resolveLink,             // (rawHref) => ResolvedLink
})
```

### 8.2 Navigation flow cho `markdown-file` kind

```
1. preventDefault()
2. Set aria-busy="true" on article
3. Fetch file qua FETCH_FILE_AS_TEXT (background → offscreen)
4. Nếu fetch fail → toast "Could not open linked file", giữ nguyên tài liệu hiện tại
5. Nếu file rỗng → toast "Linked file is empty", giữ nguyên
6. Set markdown → render (async, chờ xong)
7. Update currentFileUrl
8. Update document title
9. Update sidebar active state
10. Push history entry
11. Scroll:
    - Nếu có hash → scroll tới heading (sau afterRender, xem 8.4)
    - Else → scroll top
12. Remove aria-busy
```

### 8.3 Navigation flow cho `self-link` kind

```
1. preventDefault()
2. Nếu có hash:
   - history.replaceState update hash
   - Scroll tới heading (smooth)
3. Nếu không hash:
   - Scroll top
4. Không fetch, không re-render
```

### 8.4 Scroll reliability sau async plugins

Shiki highlighting và Mermaid rendering là async — layout có thể shift sau khi `render()` resolve.

Approach:
- `render()` đã chờ `pluginManager.afterRender()` xong trước khi return (xem `app.js` line 192).
- Scroll sau `render()` resolve đã bao gồm afterRender.
- Tuy nhiên, Mermaid dùng `IntersectionObserver` nên có thể render muộn khi element vào viewport.
- **Giải pháp pragmatic:** scroll ngay sau render, nếu hash target chưa có vị trí ổn định (ví dụ Mermaid block phía trên), chấp nhận. Đây là edge case hiếm (hash link tới heading dưới Mermaid block).
- Nếu cần improve: thêm second scroll sau `requestAnimationFrame` delay 200ms cho trường hợp Mermaid-heavy pages.

## 9) History và Back/Forward

### 9.1 Real `file:` navigation

Khi navigate qua article link:
- `history.pushState({ mdpFileUrl: fileUrl }, '', fileUrlWithHash)` (trong try/catch — `file:` protocol có thể reject).
- Fallback nếu `pushState` bị reject: navigation vẫn thành công nội bộ, chỉ URL bar không update.

Khi explorer click:
- Giữ behavior hiện tại (`updateUrlWithoutReload` trong `useExplorer`).
- Cả hai source dùng `{ mdpFileUrl }` state convention.

### 9.2 Initial state

Khi viewer init (trong `app.js` hoặc `article-interactions.bind()`):
- `history.replaceState({ mdpFileUrl: window.location.href }, '', window.location.href)` — seed state cho Back/Forward.

### 9.3 `popstate` handler

Thêm `popstate` listener. **Quan trọng:** phải coordinate với `hashchange` listener hiện tại để tránh double-scroll.

```js
// Trong article-interactions bind():
popstateHandler = (event) => {
  const state = event.state
  if (!state?.mdpFileUrl) return  // không phải navigation của chúng ta

  const currentNormalized = normalizeFileUrlForCompare(getCurrentFileUrl())
  const targetUrl = state.mdpFileUrl
  const targetNormalized = normalizeFileUrlForCompare(targetUrl.replace(/#.*$/, ''))

  if (currentNormalized === targetNormalized) {
    // Cùng file, chỉ hash đổi → scroll (nhưng KHÔNG trigger nếu hashchange đã xử lý)
    // Dùng flag: _popstateHandledHash = true, hashchange handler check flag
    scrollToHash({ behavior: 'auto' })
    return
  }

  // Khác file → mở file mới
  const hashMatch = targetUrl.match(/#(.+)$/)
  const hash = hashMatch ? decodeURIComponent(hashMatch[1]) : null
  navigateToFile(targetNormalized, {
    hash,
    history: 'none',        // KHÔNG push/replace vì đang phản hồi popstate
    source: 'browser-history'
  })
}
window.addEventListener('popstate', popstateHandler)
```

### 9.4 Tránh hashchange/popstate double-fire

Khi `popstate` fire cho cùng-file hash change, `hashchange` cũng fire. Dùng coordination flag:

```js
let popstateHandledThisTick = false

popstateHandler = (event) => {
  // ... xử lý
  if (currentNormalized === targetNormalized) {
    popstateHandledThisTick = true
    scrollToHash({ behavior: 'auto' })
    queueMicrotask(() => { popstateHandledThisTick = false })
    return
  }
  // ...
}

hashChangeHandler = () => {
  if (popstateHandledThisTick) return  // đã xử lý bởi popstate
  scrollToHash({ behavior: 'auto' })
}
```

### 9.5 Virtual workspace

Không push virtual protocol vào address bar.

```js
history.pushState(
  { mdpFileUrl: virtualHref, mdpVirtual: true },
  '',
  window.location.pathname  // giữ URL thật
)
```

## 10) Sidebar Files behavior sau navigation

### 10.1 Trong cùng sibling scan root

- Active file đổi sang target.
- Sidebar tree giữ nguyên, chỉ update active highlight.

### 10.2 Target ngoài sibling scan root

- Trigger sibling re-scan cho folder mới.
- Hiển thị Back button về file gốc (mechanism đã có trong `siblingBackNavigationForUrl`).
- **Caching consideration:** nếu user Back lại, re-scan folder cũ. Chấp nhận cost vì sibling scan nhanh. Không cần cache tree ở giai đoạn này.

### 10.3 Trong workspace mode, target ngoài workspace root

- Nếu target fetch được: mở file, sidebar chuyển sang sibling mode cho folder mới.
- Hiển thị message "File outside workspace".
- User có thể dùng sidebar "Open this folder" hoặc "Exit workspace" để re-orient.

## 11) UX chi tiết

### 11.1 Loading

- Article set `aria-busy="true"` ngay khi bắt đầu fetch.
- Giữ nội dung cũ visible cho đến khi file mới render thành công.
- Nếu load fail → giữ nguyên tài liệu hiện tại + toast lỗi.
- Progress bar nếu navigation > 200ms: **deferred** — không implement phase 1, thêm ở phase polish.

### 11.2 Error states

| Lỗi | Toast message |
|------|---------------|
| File không tồn tại / fetch fail | `Could not open linked file` |
| File rỗng | `Linked file is empty` |
| Không có quyền đọc | `Could not read linked file` |
| Virtual file không còn | `Linked file is no longer available` |
| Hash heading không tìm thấy | Không toast. Scroll top, giữ hash trong URL |

### 11.3 Accessibility

- Link vẫn là `<a href="...">` thật trong HTML.
- Intercept không làm mất focus: sau navigation, focus chuyển tới article container hoặc heading target.
- Article có `aria-busy` trong suốt quá trình load.
- Screen reader nhận biến đổi qua `aria-busy` state change.

## 12) Security và correctness

Không được:
- Fetch arbitrary web URLs qua background cho article links.
- Bypass sanitizer để giữ unsafe href.
- Intercept `javascript:`, `data:`, `blob:` như document navigation.
- Dùng string concat để resolve path — luôn dùng `new URL()`.

Nên:
- Dùng `new URL(rawHref, baseUrl)` cho real file URLs.
- Decode chỉ để display; compare và fetch dùng URL normalized.
- Strip hash trước khi fetch.
- Preserve hash riêng.
- Dùng `CSS.escape` khi query heading id.
- Giữ `DOMPurify` là boundary cho rendered HTML. DOMPurify preserves relative hrefs và `file:` URLs — chỉ strip `javascript:`, `data:`, `vbscript:`.

## 13) Edge cases cần test

| # | Test case | Expected |
|---|-----------|----------|
| 1 | `b.md` từ `a.md` cùng folder | Mở b.md trong viewer |
| 2 | `./b.md#intro` | Mở b.md, scroll tới #intro |
| 3 | `guides/install.md` | Mở file trong subfolder |
| 4 | `../README.md` | Mở file trong parent folder |
| 5 | `My Notes.md` (space trong tên) | Mở đúng file |
| 6 | `ghi chú.md` (Unicode) | Mở đúng file |
| 7 | `My%20Notes.md` (encoded) | Mở đúng file |
| 8 | Hash encoded Unicode | Scroll tới heading đúng |
| 9 | `a.md#next` từ chính `a.md` | Scroll tới heading, không re-fetch |
| 10 | `a.md` (không hash) từ chính `a.md` | Scroll top, không re-fetch |
| 11 | Broken link (file không tồn tại) | Giữ nguyên tài liệu, toast lỗi |
| 12 | Target file rỗng | Toast "Linked file is empty" |
| 13 | Target ngoài current folder | Mở file, sidebar re-scan |
| 14 | Target ngoài workspace root | Mở file, sidebar chuyển sibling mode |
| 15 | Ctrl/Cmd + click | Browser mở tab mới (không intercept) |
| 16 | Middle click | Browser mở tab mới (không intercept) |
| 17 | Link có `target="_blank"` (nếu explicit) | Không intercept |
| 18 | Link có `download` | Không intercept |
| 19 | External `https://` | Browser mở tab mới (target="_blank") |
| 20 | Local non-md: `image.png`, `file.pdf` | Browser xử lý mặc định |
| 21 | Browser Back sau 3 internal navigations | Quay lại đúng file trước |
| 22 | Browser Forward sau Back | Tiến đúng file |
| 23 | Reload page sau internal navigation | Load file hiện tại (từ URL) |
| 24 | Virtual workspace relative link | Mở file nếu trong virtual readers |
| 25 | Virtual link sau exit workspace | Không crash, toast nếu file unavailable |

## 14) Implementation plan

> **Trạng thái (2026-04-24):** Tất cả các phase (0–5) đã hoàn thành. Tính năng internal Markdown link navigation đã implement đầy đủ và hoạt động trong production.

### Phase 0: Fix markdown engine (prerequisite) ✅

**File:** `src/viewer/core/markdown-engine.js`

- ✅ Sửa `link_open` rule: chỉ gán `target="_blank"` cho external links (http/https/mailto/tel).
- ✅ Internal links (relative, `file:`, hash-only) giữ không có `target`.
- ✅ Thêm `isExternalHref()` helper.
- ✅ **Verify:** DOMPurify preserves relative hrefs (manual test).
- ✅ **Acceptance:** relative markdown links render thành `<a href="b.md">` không có `target="_blank"`.

### Phase 1: Link resolver + basic article click interception ✅

**New file:** `src/viewer/navigation/link-resolver.js`

- ✅ Implement `resolveMarkdownLink(rawHref, context)`.
- ✅ Phân loại tất cả link kinds theo mục 6.
- ✅ Handle edge cases: space, Unicode, encoded, query string.
- ✅ **Unit testable** — pure function, không DOM dependency.

**Modified file:** `src/viewer/article-interactions.js`

- ✅ Thêm `handleInternalLinkClick()` handler.
- ✅ Nhận `getCurrentFileUrl`, `navigateToFile`, `resolveLink` qua constructor options.
- ✅ Click interception policy (mục 7).
- ✅ Gọi `navigateToFile` qua callback (bridge pattern).

**Modified file:** `src/viewer/app.js`

- ✅ Expose `navigateToFile` từ useExplorer qua bridge.
- ✅ Pass navigation callbacks vào `createArticleInteractions`.
- ✅ Seed initial `history.replaceState` với `{ mdpFileUrl }`.

### Phase 2: History support (Back/Forward) ✅

**Modified file:** `src/viewer/article-interactions.js`

- ✅ Thêm `popstate` handler.
- ✅ Coordinate với existing `hashchange` handler (mục 9.4).
- ✅ Khi `popstate` fire khác file → gọi `navigateToFile` với `history: 'none'`.

**Modified file:** `src/viewer/react/hooks/useExplorer.js`

- ✅ `navigateToFile` push `{ mdpFileUrl }` state khi source là article-link.
- ✅ Explorer click có thể giữ behavior hiện tại hoặc adopt cùng convention.

### Phase 3: Sidebar integration ✅

**Modified:** `useExplorer.js`, explorer view actions

- ✅ Khi navigate qua article link tới file ngoài current sibling root → re-scan.
- ✅ Sync back button logic cho article-link source.
- ✅ Active file highlight luôn khớp với tài liệu đang xem.

### Phase 4: Virtual workspace relative links ✅

**Modified:** `link-resolver.js`

- ✅ Thêm resolver cho virtual workspace paths.
- ✅ Map relative href từ virtual file → virtual reader lookup.

**Modified:** `useExplorer.js`

- ✅ Expose `virtualFileExists` qua bridge.

### Phase 5: Polish ✅

- ✅ Improve error toast messages.
- ✅ Focus management sau navigation (heading target hoặc article top).
- ✅ Second scroll attempt sau 200ms cho Mermaid-heavy pages.
- ✅ Unit tests cho link-resolver (`src/viewer/navigation/__tests__/link-resolver.test.js`).
- ✅ Manual QA theo bảng edge cases (mục 13).

## 15) Acceptance criteria

> **Trạng thái (2026-04-24):** Tất cả acceptance criteria đã đạt ✅

Tính năng đạt yêu cầu khi:
- [x] Click link Markdown tương đối mở file mới trong cùng viewer mà không full page reload.
- [x] Internal links không có `target="_blank"` (fix markdown engine).
- [x] Hash sau file name hoạt động sau render.
- [x] Self-link (link tới chính file đang xem) không re-fetch, chỉ scroll.
- [x] Browser Back/Forward hoạt động giữa các tài liệu đã mở.
- [x] Modifier/new-tab behavior không bị phá (Ctrl+click, middle click).
- [x] Files sidebar active state luôn khớp tài liệu đang xem.
- [x] Broken link không làm mất tài liệu hiện tại.
- [x] Không intercept external/non-Markdown links.
- [x] Resolver xử lý đúng: spaces, Unicode, parent folder, hash, encoded href, self-link.
- [x] `hashchange` và `popstate` không double-fire scroll.
