# Phase 0 - Foundation & Project Skeleton

## Mục tiêu
Dựng bộ khung dự án để toàn bộ các phase sau có thể phát triển ổn định.

## Deliverable
- Chrome extension cài local được qua `Load unpacked`
- Các entrypoints không lỗi runtime
- Có thể đọc và ghi settings cơ bản từ `chrome.storage`
- Có cơ chế message routing tối thiểu giữa content/background/popup/options

## Files cần implement
```text
manifest.json
src/background/index.js
src/background/message-router.js
src/content/index.js
src/content/bootstrap.js
src/messaging/message-types.js
src/messaging/send-message.js
src/messaging/on-message.js
src/settings/default-settings.js
src/settings/storage-keys.js
src/settings/settings.service.js
src/shared/helpers/logger.js
src/popup/index.html
src/popup/index.js
src/options/index.html
src/options/index.js
```

## Definition of done
- extension chạy được trên Chrome
- settings service hoạt động
- message routing nền tảng hoạt động
