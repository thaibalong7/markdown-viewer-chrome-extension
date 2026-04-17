# Phase 1 - Markdown Detection & Raw Content Takeover

**Trạng thái implement:** Hoàn thành — thêm `src/shared/markdown-detect.js` (pathname + `looksLikeMarkdownText`); `text-sampling.js` chỉ còn `getTextSample`.

> **Note:** Phase design doc — implementation may differ from listed paths. For **current** architecture and file layout, see [`docs/project-overview-for-ai.md`](../project-overview-for-ai.md) and `src/`.

## Mục tiêu
Phát hiện trang Markdown hoặc raw text có xác suất cao là Markdown, sau đó lấy raw content và takeover page bằng root container.

## Deliverable
- Khi mở file `.md` hoặc `.markdown`, content script detect được
- Lấy được raw markdown text
- Mount được root container của viewer lên page
- Có fallback nếu detect không đủ chắc chắn

## Files cần implement
```text
src/content/page-detector.js
src/content/raw-content-extractor.js
src/content/page-overrider.js
src/content/bootstrap.js
src/shared/helpers/logger.js
```

## Technical requirements
- detect bằng score thay vì chỉ 1 rule
- hỗ trợ `.md`, `.markdown`, text/plain, single `<pre>`
- normalize line endings về `\n`
- không làm mất indentation code block
- mount viewer root an toàn

## Definition of done
- detect đúng đa số case cơ bản
- extract đúng raw markdown
- mount root viewer thành công
