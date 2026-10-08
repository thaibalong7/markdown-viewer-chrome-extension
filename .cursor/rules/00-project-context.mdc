---
description: "Markdown Plus project context and source-of-truth order."
alwaysApply: true
trigger: always_on
---

# Project Context

- This project is a Chrome Extension MV3 local-document viewer: registered Markdown files are direct `file:` entry points, while the Files explorer can open the additional text, SQL, Mermaid, and image formats declared in `src/shared/file-types.js`.
- Runtime truth is `src/**`, `manifest.json`, `vite.config.mjs`, and `package.json`.
- Start architecture-sensitive work by reading `docs/architecture-overview.md`.
- Treat `docs/**` as current-state documentation and `planning/**` as incomplete work, never as runtime truth.
- For UI design or visual/interaction changes, including proposals before target files exist, read `.agents/rules/25-ui-design-system.md`; it owns the design review workflow and routes task-specific design-system reading.
- Keep each Markdown prose paragraph on one physical source line because the viewer renders source softbreaks as visible `<br>` elements.
- Update `docs/architecture-overview.md` when moving ownership boundaries, changing entry flows, or introducing/removing major modules.
- Treat `dist/**` as generated output. Do not hand-edit it.
