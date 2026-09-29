---
description: "Markdown Plus settings storage, runtime messaging, background routing, and live updates."
alwaysApply: false
globs:
  - "src/settings/**/*.js"
  - "src/background/**/*.js"
  - "src/messaging/**/*.js"
  - "src/content/**/*.js"
  - "src/popup/**/*.{js,jsx}"
  - "src/options/**/*.{js,jsx}"
  - "src/viewer/**/*.{js,jsx}"
  - "src/theme/**/*.js"
paths:
  - "src/settings/**/*.js"
  - "src/background/**/*.js"
  - "src/messaging/**/*.js"
  - "src/content/**/*.js"
  - "src/popup/**/*.js"
  - "src/popup/**/*.jsx"
  - "src/options/**/*.js"
  - "src/options/**/*.jsx"
  - "src/viewer/**/*.js"
  - "src/viewer/**/*.jsx"
  - "src/theme/**/*.js"
trigger: glob
---

# Settings and Messaging

- Message type names must come from `MESSAGE_TYPES` in `src/messaging/index.js`; do not introduce ad-hoc runtime message strings.
- UI/content/popup/options/viewer callers should use `sendMessage()` from `src/messaging/index.js` instead of direct `chrome.runtime.sendMessage`.
- Settings callers should prefer `src/settings/settings-client.js` for get/save/reset requests instead of duplicating response-envelope handling.
- Preserve the runtime response envelope from `src/background/service-worker.js`: `{ ok: true, data }` or `{ ok: false, error }`.
- Keep `src/background/message-router.js` readable as a route table over small service calls.
- Offscreen bridge wire messages (`OFFSCREEN_FETCH`, `OFFSCREEN_FETCH_DONE`) intentionally bypass `routeMessage()` in `service-worker.js`.
- Background/service ownership modules may use direct `chrome.*` APIs where they own that browser integration.
- Use `logger` from `src/shared/logger.js` for logs.

## Settings Ownership

- `src/settings/default-settings.js` owns `DEFAULT_SETTINGS`.
- `src/settings/settings-schema.js` owns normalization, validation, and hard ranges for persisted settings.
- `src/settings/settings-service.js` owns the settings storage key, `chrome.storage.sync` with local fallback, migration, default-safe merge/normalization, save, and reset.
- `src/settings/settings-client.js` owns the UI/content request wrappers for settings operations.
- `src/settings/index.js` is the compatibility export surface for existing callers.
- Preserve default-safe loading as migrate -> `deepMerge(DEFAULT_SETTINGS, raw)` -> `normalizeSettings(..., { invalid: 'default' })`; saving must normalize strictly before persistence.
- If the settings schema changes incompatibly, bump `settings.version` and add an explicit migration in the settings service.
- Popup/Options/Viewer should persist settings through the settings client / `SAVE_SETTINGS`; do not read or write `chrome.storage` directly from those surfaces.
- Keep recent-file history separate in `chrome.storage.local`, and keep custom-theme image blobs in IndexedDB rather than synchronized settings.

## Live Updates

- After save/reset, background broadcasts `MESSAGE_TYPES.SETTINGS_UPDATED` so content scripts can call `MarkdownViewerApp.updateSettings()` or teardown.
- If optimizing broadcast targeting, prove existing Markdown viewer tabs still receive runtime updates.
- `updateSettings()` should apply reader styles immediately and only trigger full Markdown render when `needsFullRender(previous, next)` requires it.
