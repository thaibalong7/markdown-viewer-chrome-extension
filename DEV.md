# Dev Guide (Vite + @crxjs/vite-plugin + React)

## Yêu cầu
- Node.js >= 20 (khuyến nghị dùng `nvm`)
- `npm`

Stack chính: **Vite 8**, **`@crxjs/vite-plugin`**, **`@vitejs/plugin-react`** (JSX cho content script viewer + popup), **React 19**, **Sass**.

## Bước 1: Chọn đúng Node 20
```bash
nvm use 20.19.5
node -v
```

## Bước 2: Cài dependencies
```bash
npm install
```

## Bước 3: Chạy dev server
```bash
npm run dev
```

Trong quá trình dev, CRXJS sẽ rebuild thư mục `dist/` khi bạn sửa code.

**Ghi chú Vite 8:** build production có thể in cảnh báo kiểu `Both rollupOptions and rolldownOptions were specified` từ plugin CRX — đó là tương tác plugin; `npm run build` vẫn tạo `dist/` bình thường nếu không lỗi.

### Gợi ý workflow
- **Viewer (content script):** `src/content/index.js` (chỉ gate `file:` + dynamic import) → `src/content/viewer-loader.js` → `bootstrap.js` → `src/viewer/app.js`; UI React trong `src/viewer/react/` (shell, sidebar, explorer). Styles: `src/viewer/styles/**/*.scss` + `src/content/host-print.scss`, import `?inline` từ `viewer-loader.js` (và các import liên quan).
- **Popup:** `src/popup/index.jsx` → `PopupApp.jsx` và các panel.
- **Background:** `src/background/service-worker.js` (import `message-router.js`). Message types: `src/messaging/index.js` (gồm `OFFSCREEN_FETCH` / `OFFSCREEN_FETCH_DONE` cho offscreen document).

## Bước 4: Load unpacked để test
1. Mở Chrome: `chrome://extensions`
2. Bật **Developer mode**
3. **Load unpacked**
4. Chọn thư mục `dist/` trong project:
   - `.../markdown-plus/dist`

Để **Files explorer** (đọc thư mục `file://` và điều hướng file) hoạt động, trong chi tiết extension bật **Allow access to file URLs**.

Mỗi lần sửa code, bạn quay lại extension và bấm reload nếu cần (đôi khi HMR không áp dụng cho một số thay đổi, tùy loại entry).

## Build để export (production-like)
```bash
npm run build
```
Sau đó cũng **Load unpacked** bằng `dist/`.

## Kích thước bundle và phân tích

- **Mục tiêu chung:** Shiki không dùng `shiki/bundle/web` (tránh ship toàn bộ grammars/themes). Danh sách ngôn ngữ nằm trong `src/viewer/core/shiki-config.js` (`SHIKI_LANG_IDS`, loader map). Themes: `github-light` / `github-dark` qua `@shikijs/themes`.
- **KaTeX (Math):** CSS/fonts chỉ được kéo khi plugin Math bật (inject runtime trong `src/plugins/optional/math.plugin.js`), không còn inline sẵn trong `viewer-loader` khi math tắt.
- **Đo nhanh sau build:**
  ```bash
  npm run size:report
  ```
- **Treemap / breakdown:** sau build có `dist/stats.html` nếu chạy:
  ```bash
  npm run analyze
  ```
  (Bật `ANALYZE=1` trong script; cần Node 20 như các lệnh khác.)

`vite.config.mjs` có `build.rollupOptions.output.manualChunks` cho vài vendor lớn (`markdown-core`, `sanitizer`, `react-vendor`); output CRX vẫn ổn định trong `dist/assets/`.

## Troubleshooting: lỗi native binding / optional deps
Nếu bạn gặp lỗi kiểu `Cannot find native binding` (thường do cài deps dưới Node version khác):
```bash
rm -rf node_modules package-lock.json
nvm use 20.19.5
npm install
npm run build
```

