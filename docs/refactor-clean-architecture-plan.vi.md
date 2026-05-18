# Kế hoạch refactor: clean architecture, giảm trùng lặp, dễ bảo trì

Ngày tạo: 2026-05-16

## Mục tiêu

Mục tiêu của đợt refactor này là làm `markdown-plus` dễ đọc hơn, an toàn hơn khi sửa, và thân thiện hơn cho cả dev mới lẫn AI coding agent. Đây không phải là kế hoạch viết lại toàn bộ project. Các hành vi runtime hiện tại của Chrome Extension MV3, React shell, pipeline render Markdown, bảo mật sanitize HTML, editor, explorer và popup settings cần được giữ nguyên.

Kết quả mong muốn:

- File nhỏ hơn, mỗi file có một trách nhiệm chính rõ ràng.
- Ranh giới rõ hơn giữa orchestration, logic thuần, browser API, React UI và side effect.
- Giảm code trùng lặp ở menu, button action, copy link, outside-click handler.
- Có thêm test cho logic đã tách ra trước khi refactor sâu.
- Docs và Cursor rules đủ rõ để những lần sửa sau không làm codebase rối trở lại.

## Hiện trạng kiến trúc

Cập nhật trạng thái implement (2026-05-18): Phase 1-5 đã hoàn tất. Phần dưới vẫn giữ snapshot rủi ro ban đầu để làm bối cảnh lịch sử; khi cần source truth hiện tại, dùng `docs/refactor-progress-log.md`, `docs/project-overview-for-ai.md` và `src/**`. Line-count hiện tại sau Phase 1-5: `src/viewer/app.js` 250, `useExplorer.js` 344, `FloatingActions.jsx` 236, `FileRow.jsx` 135, `markdown-engine.js` 139, `message-router.js` 126.

Project hiện đã có phân vùng khá tốt:

- `src/content`: gate rẻ để phát hiện trang Markdown, bootstrap, extract raw markdown, load viewer.
- `src/background`: service worker MV3, message router, settings/file history/offscreen services.
- `src/viewer`: viewer chính, render Markdown, article interactions, explorer, editor, React shell.
- `src/popup` và `src/options`: UI cấu hình settings và file history.
- `src/shared`: constants, clipboard, download, logger, markdown detection, React skeleton dùng chung.
- `src/plugins`: core plugins và optional plugins cho markdown-it.

Các điểm rủi ro maintainability lớn nhất:

| File | Số dòng | Vấn đề chính |
| --- | ---: | --- |
| `src/viewer/react/hooks/useExplorer.js` | 961 | Gom scanning, navigation, workspace restore, tree state, bridge mutation, hash/focus/history, error UI vào một hook. |
| `src/viewer/app.js` | 608 | Gom lifecycle, render, editor dirty/save state, scroll sync, styles, file history, global listeners vào một class. |
| `src/viewer/react/components/FloatingActions.jsx` | 305 | Gom command logic, menu behavior, editor mode controls, copy feedback và UI rendering. |
| `src/viewer/react/components/explorer/FileRow.jsx` | 206 | Gom row UI, open new tab, copy link, menu outside-click và icon local. |
| `src/viewer/core/markdown-engine.js` | 248 | Gom setup markdown-it và parser normalize local link có khoảng trắng. |

Đây không phải là lỗi kiến trúc nghiêm trọng. Code hiện đang chạy được, nhưng những file này đã trở thành điểm khó sửa và nên được tách dần.

## Nguyên tắc refactor

1. Giữ hành vi trước, làm sạch sau. Nếu không chắc chắn, thêm test trước khi move code.
2. Tách logic thuần trước side effect. URL/path/tree/settings helpers là nhóm dễ test và ít rủi ro nhất.
3. React component nên ưu tiên khai báo UI. Browser API, runtime messaging, clipboard, file save nên nằm trong action/service modules.
4. Không đưa DOM bài Markdown vào React quản lý. Boundary hiện tại vẫn là `renderDocument()` -> `sanitizeHtml()` -> `renderIntoElement()`.
5. Không làm refactor quá rộng trong một lần. Mỗi patch nên tập trung vào một boundary.
6. Khi đổi ownership của source code, cập nhật docs và Cursor rules tương ứng.

## Cấu trúc source mong muốn

Đây là hướng đi dài hạn, không cần move hết trong một commit.

```text
src/viewer/
  app/
    MarkdownViewerApp.js
    createExplorerBridge.js
    renderController.js
    editorSessionController.js
    splitScrollSync.js
    viewerStyles.js
  explorer/
    explorer-navigation.js
    explorer-scan-session.js
    explorer-workspace-session.js
    explorer-files-context.js
    explorer-state.js
    explorer-tree-utils.js
    folder-scanner.js
    sibling-scanner.js
    url-utils.js
    workspace-picker.js
  react/
    hooks/
      explorer/
        useExplorer.js
        useExplorerActions.js
        useExplorerBridgeRegistration.js
    components/
      common/
        ActionMenu.jsx
        IconButton.jsx
        OutsideDismissLayer.jsx
      explorer/
      icons/
  core/
    markdown-engine.js
    markdown-link-normalizer.js
    renderer.js
```

## Phase 0: tạo baseline an toàn

Trước khi đụng behavior:

- Chạy `npm test`.
- Chạy `npm run build`.
- Sau build, chạy `npm run size:report` để có baseline bundle size.
- Khi bắt đầu implement refactor, tạo `docs/refactor-progress-log.md` để ghi từng bước đã làm và lệnh verify.
- Cập nhật `docs/project-overview-for-ai.md` khi source ownership thay đổi.

Test nên thêm trước:

- `buildCurrentFileLink()`: virtual workspace href, hash preservation, empty input.
- Markdown local link normalization: link có space, title, code span, fenced code, nested parentheses.
- Explorer navigation helpers sau khi extract: same-file navigation, workspace virtual navigation, điều kiện reuse sibling scan.

## Phase 1: tách `MarkdownViewerApp`

Vấn đề: `src/viewer/app.js` đang có quá nhiều lý do để thay đổi.

Nên tách thành:

- `viewer/app/viewerStyles.js`
  - Chứa xử lý style/theme/sidebar width/edit mode override.
- `viewer/app/renderController.js`
  - Chứa render token, TOC ready, capture/restore scroll, gọi `renderDocument()`, `renderIntoElement()`, plugin `afterRender`, `syncTocItems()`.
- `viewer/app/editorSessionController.js`
  - Chứa edit mode, dirty state, save status, save in flight, beforeunload, Ctrl/Cmd+S, debounce live preview.
- `viewer/app/splitScrollSync.js`
  - Chứa sync scroll editor -> preview, RAF, listener wheel/touch, cleanup.
- `viewer/app/createExplorerBridge.js`
  - Chứa object bridge truyền sang React, tránh mutate rải rác trong `app.js`.

Tiêu chí xong:

- `src/viewer/app.js` còn khoảng dưới 250 dòng.
- API chính `init()`, `updateSettings()`, `render()`, `destroy()` giữ nguyên hành vi.
- Test hiện có vẫn pass.

## Phase 2: tách explorer orchestration

Vấn đề: `useExplorer.js` là file lớn nhất và đang trộn React hook với domain workflow.

Nên tách thành:

- `explorer/explorer-navigation.js`
  - Focus sau navigation, deferred hash retry, update URL không reload, update title, reveal file in tree.
- `explorer/explorer-scan-session.js`
  - Quản lý `AbortController`, progress loading, cancellation, fallback.
  - Bổ sung abort cho sibling scan, hiện đang là issue hiệu năng còn mở.
- `explorer/explorer-workspace-session.js`
  - Open/restore/exit workspace folder, directory handle, webkit virtual files, persisted root.
- `react/hooks/explorer/useExplorerBridgeRegistration.js`
  - Đăng ký `navigateToFile` và `virtualFileExists` vào bridge.
- `react/hooks/explorer/useExplorerActions.js`
  - Trả action object cho `ExplorerPanel`.

Tiêu chí xong:

- `useExplorer.js` còn khoảng 250-350 dòng.
- Module explorer được extract không import React nếu không cần.
- Sibling scan có thể abort khi teardown, chuyển mode, mở workspace.
- Có test cho scan cancellation và post-navigation state decisions.

## Phase 3: giảm trùng lặp action menu và button

Vấn đề: `FloatingActions.jsx`, `FileRow.jsx`, `ExplorerHeader.jsx` có nhiều pattern giống nhau: menu open/close, outside-click, Escape, copy link, icon button.

Nên tách thành:

- `react/hooks/useDismissableLayer.js` hoặc `react/components/common/OutsideDismissLayer.jsx`
  - Dùng chung cho pointerdown outside và Escape.
  - Phải hoạt động trong Shadow DOM bằng `getRootNode()`.
- `react/components/common/IconButton.jsx`
  - Dùng chung tooltip, `aria-pressed`, disabled, className.
- `react/components/common/ActionMenu.jsx`
  - Dùng chung cấu trúc trigger/menu/menu item.
- `viewer/actions/file-row-actions.js`
  - Chứa `isPlainPrimaryClick`, `isBrowserOpenableFileHref`, `openFileHrefInNewTab`, copy file link.
- Move `MoreIcon` và `OpenNewTabIcon` vào `react/components/icons/`.

Tiêu chí xong:

- `FloatingActions.jsx` chỉ còn khai báo command chính.
- `FileRow.jsx` chủ yếu render row và gọi action helper.
- Keyboard/mouse behavior không đổi.
- CSS class giữ nguyên hoặc được migrate có chủ đích.

## Phase 4: làm sạch render pipeline

Vấn đề: render pipeline đúng nhưng nặng, và parser normalize link đang nằm chung với setup markdown-it.

Nên tách/làm:

- `core/markdown-link-normalizer.js`
  - Move toàn bộ local link normalization ra khỏi `markdown-engine.js`.
  - Thêm test trước khi tách.
- `core/create-render-context.js`
  - Gom việc tạo plugin manager, markdown engine, settings hash.
- Điều tra reuse render context.
  - Cache markdown engine/plugin manager khi plugin settings không đổi.
  - Không được tạo đường render nào bypass `sanitizeHtml()`.
- Thêm render busy/loading state cho viewer shell để tài liệu lớn có feedback.

Tiêu chí xong:

- `markdown-engine.js` chỉ tập trung vào markdown-it setup và source-line mapping.
- Render pipeline có điểm mở rõ cho worker/progressive rendering sau này.
- Không xuất hiện đường set `innerHTML` mới không qua sanitize.

## Phase 5: làm sạch settings và messaging

Vấn đề: settings/messaging đã tập trung khá tốt, nhưng có thể rõ ownership hơn.

Nên tách thành:

- `settings/default-settings.js`
  - Move `DEFAULT_SETTINGS` ra khỏi service storage.
- `settings/settings-service.js`
  - Chứa storage read/write/merge.
- `background/settings-broadcast-service.js`
  - Move `notifySettingsUpdated()` khỏi `message-router.js`.
  - Sau này tối ưu broadcast tới tab quan tâm thay vì mọi tab.
- Nếu message types tiếp tục tăng, cân nhắc `messaging/message-contracts.js`.

Tiêu chí xong:

- `message-router.js` đọc như route table gọi service nhỏ.
- Test có thể import defaults mà không kéo theo `chrome.storage`.
- Response envelope vẫn là `{ ok, data/error }`.

## Phase 6: cập nhật docs và rules

Cần cập nhật sau từng phase:

- `docs/project-overview-for-ai.md`: folder map và ownership mới.
- `docs/performance-issues-audit.md`: mark issue đã xử lý hoặc đổi vị trí file.
- `docs/react-migration-plan.md`: archive hoặc trim những phần migration đã cũ.
- `.cursor/rules/00-project-context.mdc`: giữ thứ tự source truth và cách đọc docs lịch sử.
- `.cursor/rules/20-architecture-boundaries.mdc`: giữ boundary dài hạn cho viewer app, React shell, explorer và refactor.
- `.cursor/rules/30-rendering-pipeline-security.mdc`: giữ boundary render/sanitize/theme/Shiki.

## Phase 7: test và verify

Mỗi đợt refactor nên chạy:

- `npm test`
- `npm run build`
- Manual smoke trong Chrome:
  - Mở file `.md` local.
  - Đổi reader settings trong popup.
  - Click internal Markdown link và hash link.
  - Files explorer sibling mode và workspace mode.
  - Edit mode, split preview, Ctrl/Cmd+S.
  - Export HTML/Word và print.

Ưu tiên test:

- URL/link/path logic.
- Explorer state transitions và cancellation.
- Render settings diff và render context reuse.
- Editor dirty/save state.
- Dismissable menu behavior trong Shadow DOM.

## Thứ tự implement đề xuất

1. Thêm test cho markdown link normalization và file link actions.
2. Tách `markdown-link-normalizer.js`.
3. Tách hook/component dismissable menu và file row action helpers.
4. Split `FloatingActions.jsx` và `FileRow.jsx`.
5. Tách `splitScrollSync.js` khỏi `MarkdownViewerApp`.
6. Tách editor session state khỏi `MarkdownViewerApp`.
7. Tách render controller khỏi `MarkdownViewerApp`.
8. Split explorer scan/navigation/workspace sessions và thêm sibling abort.
9. Split settings defaults/broadcast.
10. Cập nhật architecture docs và performance audit.

Thứ tự này bắt đầu từ phần ít rủi ro nhất: logic thuần và dedup UI nhỏ, rồi mới tới lifecycle lớn.

## Không làm trong pass đầu

- Không migrate toàn bộ project sang TypeScript.
- Không thay markdown renderer.
- Không đưa rendered article DOM vào React quản lý.
- Không redesign UI trong lúc refactor internals.
- Không thêm state management library nếu chưa có nhu cầu rõ.

## Khi nào nên dừng và đánh giá lại

Dừng refactor nếu thấy:

- Build output tăng bất thường.
- Manifest/permission/runtime behavior thay đổi ngoài ý muốn.
- Có đường render HTML mới bypass `sanitizeHtml()`.
- Content script bắt đầu load code nặng trên trang không phải Markdown.
- Một patch chạm nhiều feature lớn nhưng không có test bảo vệ.
