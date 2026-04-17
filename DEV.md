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

### Gợi ý workflow
- **Viewer (content script):** `src/content/index.js` → `bootstrap.js` → `src/viewer/app.js`; UI React trong `src/viewer/react/` (shell, sidebar, explorer). Styles: `src/viewer/styles/**/*.scss` + `src/content/host-print.scss`, import `?inline` từ content script.
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

## Troubleshooting: lỗi native binding / optional deps
Nếu bạn gặp lỗi kiểu `Cannot find native binding` (thường do cài deps dưới Node version khác):
```bash
rm -rf node_modules package-lock.json
nvm use 20.19.5
npm install
npm run build
```

