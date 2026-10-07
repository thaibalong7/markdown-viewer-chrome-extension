# Hướng dẫn phát triển Markdown Plus

Tài liệu này mô tả workflow phát triển hiện tại cho Chrome Extension MV3 dùng Vite, `@crxjs/vite-plugin`, React và SCSS. Kiến trúc chi tiết nằm trong [`docs/architecture-overview.md`](docs/architecture-overview.md).

## Yêu cầu

- Node.js 20 trở lên; `.nvmrc` pin phiên bản được dự án ưu tiên.
- `npm`.
- Google Chrome với Developer mode và quyền **Allow access to file URLs** cho extension.

Stack runtime/build chính gồm Vite 8, CRXJS, React 19, Sass, Vitest, `markdown-it`, DOMPurify, Shiki, CodeMirror 6, Mermaid và KaTeX.

## Thiết lập lần đầu

```bash
nvm use
npm install
```

Kiểm tra phiên bản đang dùng nếu gặp lỗi engine hoặc native binding:

```bash
node -v
npm -v
```

## Chạy và load extension

Chạy development server:

```bash
npm run dev
```

Hoặc rebuild liên tục vào output extension:

```bash
npm run watch
```

Trong Chrome:

1. Mở `chrome://extensions` và bật **Developer mode**.
2. Chọn **Load unpacked** rồi trỏ tới thư mục `dist/` của repository.
3. Mở **Details** của Markdown Plus và bật **Allow access to file URLs**.
4. Mở một file `.md`, `.markdown`, `.mdown` hoặc `.mdc` bằng Chrome.

Sau khi thay đổi entry point, manifest, service worker hoặc dependency, hãy reload extension tại `chrome://extensions` và reload tab file. HMR có thể xử lý một phần thay đổi UI, nhưng không thay thế bước reload cho mọi loại entry của extension.

## Bản đồ entry point

- **Content/Viewer:** `src/content/index.js` chỉ kiểm tra nhanh `file:` + Markdown-family, sau đó lazy-load `src/content/viewer-loader.js` → `src/content/bootstrap.js` → `src/viewer/app.js`.
- **Viewer React:** `src/viewer/react/mount.js` mount `ViewerApp.jsx`; React sở hữu chrome, panel, action, editor shell và trạng thái UI, còn render pipeline sở hữu `.mdp-markdown-body`.
- **Document formats:** `src/shared/file-types.js` định nghĩa activation, renderer và capabilities; `src/viewer/documents/` chịu trách nhiệm load/model/render registry.
- **Markdown:** `src/viewer/core/` quản lý markdown engine, Shiki, sanitize và render; `src/plugins/` mở rộng parser và post-render behavior.
- **Explorer/navigation:** `src/viewer/explorer/` quản lý scan/workspace/session; `src/viewer/navigation/` phân loại link và route thật `?f=`.
- **Editor:** `src/viewer/editor/` chứa CodeMirror bundle, file handle và scroll sync; session policy nằm trong `src/viewer/app/editorSessionController.js`.
- **Document updates và review:** `src/viewer/app/watchSessionController.js` điều phối polling/apply, `src/viewer/navigation/reading-position.js` giữ vị trí đọc, còn `src/viewer/review/` và các component `ChangeReview*` sở hữu diff cùng review UI. Contract đầy đủ nằm trong [`docs/document-updates-and-change-review.md`](docs/document-updates-and-change-review.md).
- **Popup:** `src/popup/index.jsx` mount `PopupApp.jsx` với Recent, Reader, Editor và Plugins panels.
- **Settings:** `src/options/index.jsx` mount `OptionsApp.jsx` với General, Themes, Files & Workspace, Privacy & Data và Advanced sections.
- **Background:** `src/background/service-worker.js` bọc response envelope và chuyển route thường sang `message-router.js`; offscreen fetch wire messages được xử lý riêng.
- **Messaging/settings:** message type tập trung tại `src/messaging/index.js`; defaults, schema, migration và persistence nằm trong `src/settings/`.

Viewer SCSS nằm trong `src/viewer/styles/**/*.scss` và được import bằng `?inline` từ `src/content/viewer-loader.js`. `src/content/host-print.scss` xử lý print ở host page. Không thêm hoặc sửa CSS sinh ra trong `dist/`.

## Scripts

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy Vite + CRXJS development server. |
| `npm run watch` | Production-style build ở watch mode. |
| `npm test` | Chạy toàn bộ Vitest suite một lần. |
| `npm run test:watch` | Chạy Vitest ở watch mode. |
| `npm run build` | Tạo production extension trong `dist/`. |
| `npm run preview` | Serve Vite build để kiểm tra output web. |
| `npm run analyze` | Build với bundle visualizer và tạo `dist/stats.html`. |
| `npm run size:report` | Báo tổng size `dist/` và các JavaScript asset. |

`vite.config.mjs` để Vite/CRXJS tự chia chunk, đặt `base: './'` để dynamic import của content script resolve từ URL extension, và chỉ bật visualizer khi `ANALYZE=1` qua script `npm run analyze`.

## Quy tắc bundle quan trọng

- Shiki dùng explicit loader cho language/theme trong `src/viewer/core/shiki-config.js`; không đổi sang `shiki/bundle/web` hoặc variable dynamic import làm kéo toàn bộ catalog vào bundle.
- Catalog syntax theme hiển thị cho custom theme nằm trong `src/theme/syntax-themes.js` và phải khớp với loader map của Shiki.
- Các optional plugin Emoji, Footnote, Math và Mermaid được dynamic import khi enabled. Mặc định hiện tại là enabled cho tất cả plugin, nhưng implementation nặng vẫn ở chunk lazy.
- Build vẫn emit các asset KaTeX vào `dist/`, nhưng browser chỉ fetch/evaluate JavaScript, CSS và fonts của KaTeX khi Math plugin hoạt động; `src/plugins/optional/math.plugin.js` inject CSS runtime.
- CodeMirror chỉ được load sau khi người dùng bật editor và xác minh file gốc để bắt đầu edit session.
- `dist/**` là generated output. Runtime source of truth là `src/**`, `manifest.json`, `vite.config.mjs` và `package.json`.

Sau thay đổi bundle-sensitive ở Shiki, Mermaid, Math, editor, plugin hoặc content entry, chạy:

```bash
npm run build
npm run size:report
```

Dùng treemap khi cần tìm chunk lớn:

```bash
npm run analyze
```

## Verification theo loại thay đổi

| Thay đổi | Kiểm tra tối thiểu |
| --- | --- |
| Logic thuần, schema, route, renderer, hook | `npm test` |
| Runtime/package/manifest/entry/style | `npm test` và `npm run build` |
| Shiki, Mermaid, Math, editor, plugin, dependency | Thêm `npm run size:report` |
| Chrome API, file picker, history, Back/Forward, print/export | Load `dist/` và smoke-test thủ công |
| Watch mode, Change Review, focus/keyboard và đọc file ngoài | `npm test`, `npm run build` và smoke-test extension unpacked |

Checklist smoke test thường dùng:

- Mở trực tiếp đủ bốn extension Markdown được hỗ trợ và xác nhận file khác không kích hoạt Viewer trực tiếp.
- Mở sibling/workspace, refresh scan, điều hướng qua format, kiểm tra file có khoảng trắng/Unicode và Back/Forward cho route `?f=`.
- Thử collapse/resize Files và Outline, overlay scrollbar, Back to top, document statistics và responsive layout.
- Bật editor, chọn đúng/sai file gốc, sửa/live preview/save, kiểm tra dirty confirmation và external-change protection.
- Thử Document Updates ở Ask/Automatic/Off, tab ẩn/hiện, update liên tục, file rỗng/mất/quá lớn, giữ vị trí đọc, edit clean/dirty và Save conflict; mở Change Review để kiểm tra diff, section, cặp review cố định, keyboard/focus và responsive layout.
- Dùng [checklist Document Updates](planning/product-feature-roadmap/document-updates-manual-test.md) cho fixture, các ca Chrome chưa xác minh và lỗi kết nối cold-start cần tái hiện. Khi review đang mở, Auto vẫn có thể cập nhật article sau input idle; diff đã pin chỉ đổi khi chọn Review latest.
- Bật/tắt plugin, đổi Mermaid renderer, mở lightbox và thử export Mermaid.
- Đổi built-in/custom theme, syntax theme và background; reload tab để kiểm tra persistence.
- Print từng format phù hợp; export HTML/Word từ Markdown và kiểm tra file tải xuống.
- Kiểm tra Popup recent files, Settings import/export/reset và trạng thái khi file-URL access bị tắt.

## Troubleshooting

### Viewer không mở local Markdown

Kiểm tra Chrome extension Details đã bật **Allow access to file URLs**, extension đã được reload, và URL là `file:` có extension `.md`, `.markdown`, `.mdown` hoặc `.mdc`. Các format khác chỉ mở từ Files explorer sau khi Viewer đã active.

### Thay đổi không xuất hiện

Chờ Vite/CRXJS build xong, reload extension tại `chrome://extensions`, rồi reload tab local file. Với service worker, có thể cần đóng/mở lại Popup hoặc Settings sau reload.

Nếu source của tài liệu đang mở không theo kịp file trên disk, kiểm tra **Settings → General → Document updates**. Chế độ Off chỉ đọc khi bấm **Check now**; workspace mở bằng fallback `webkitdirectory` cần được chọn lại vì chỉ giữ snapshot `File`, không có handle để live reread.

### Cảnh báo `rollupOptions` và `rolldownOptions`

Vite 8 hiện có thể in cảnh báo `Both rollupOptions and rolldownOptions were specified` từ các plugin CRXJS trong test hoặc build. Đây là cảnh báo tương thích plugin đã biết trong cấu hình hiện tại; xem exit code và dòng hoàn tất của lệnh để phân biệt với lỗi build thật.

### Lỗi native binding hoặc optional dependency

Lỗi này thường xuất hiện khi `node_modules` được cài bằng Node version khác. Chuyển về `.nvmrc`, cài sạch theo lockfile, rồi build lại:

```bash
nvm use
rm -rf node_modules
npm ci
npm run build
```

Không xóa hoặc tạo lại `package-lock.json` trừ khi chủ đích cập nhật dependency.
