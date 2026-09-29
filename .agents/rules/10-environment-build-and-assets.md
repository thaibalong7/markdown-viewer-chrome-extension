---
description: "Markdown Plus Node, build artifacts, source styles, manifest, and asset discipline."
alwaysApply: true
trigger: always_on
---

# Environment, Build, and Assets

- Use the Node version pinned by `.nvmrc` before npm scripts; prefer `nvm use` or `source ~/.nvm/nvm.sh && nvm use` in non-interactive shells. The current Vite 8 toolchain requires Node 20.19+ or 22.12+.
- Use project scripts from `package.json`: `npm test`, `npm run test:watch`, `npm run build`, `npm run watch`, `npm run dev`, `npm run analyze`, and `npm run size:report`.
- Keep ESM import paths explicit with `.js` extensions where current source does so.
- Prefer `.scss` for local style sources under `src/**`; do not add new local `.css` source files unless a package or platform constraint requires it.
- Viewer styles live under `src/viewer/styles/**/*.scss` and are imported with `?inline` from `src/content/viewer-loader.js`; they are bundled into the content script rather than loaded as standalone CSS assets.
- Treat `manifest.json` as high-risk config. Keep permissions minimal, explain any new permission by a concrete feature, preserve the declared Chrome 109 minimum unless compatibility is deliberately re-audited, and keep entry points plus `web_accessible_resources` aligned with actual runtime assets.
- Treat `dist/**` as generated output. Never hand-edit it.
