---
description: "Markdown Plus Node, build artifacts, source styles, manifest, and asset discipline."
alwaysApply: true
trigger: always_on
---

# Environment, Build, and Assets

- Use Node 20 or newer before npm scripts. Prefer `nvm use 20` or `source ~/.nvm/nvm.sh && nvm use` in non-interactive shells.
- Use project scripts from `package.json`: `npm test`, `npm run build`, `npm run dev`, `npm run size:report`.
- Keep ESM import paths explicit with `.js` extensions where current source does so.
- Prefer `.scss` for local style sources under `src/**`; do not add new local `.css` source files unless a package or platform constraint requires it.
- Viewer styles live under `src/viewer/styles/**/*.scss` and are imported with `?inline` from `src/content/viewer-loader.js`; they are bundled into the content script rather than loaded as standalone CSS assets.
- Treat `manifest.json` as high-risk config. Keep permissions minimal, explain any new permission by a concrete feature, and keep entry points plus `web_accessible_resources` aligned with actual runtime assets.
- Treat `dist/**` as generated output. Never hand-edit it.
