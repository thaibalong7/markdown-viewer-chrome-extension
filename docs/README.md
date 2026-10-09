# Markdown Plus documentation

This directory documents the repository as it exists today. Runtime source remains the ultimate source of truth when documentation and code disagree.

## Start here

- [`architecture-overview.md`](./architecture-overview.md) — product scope, runtime flows, subsystem ownership, security boundaries, and task-to-source guidance.
- [`document-updates-and-change-review.md`](./document-updates-and-change-review.md) — current Watch modes, review workflow, editor safeguards, reading continuity, limits, and implementation map.
- [`document-actions.md`](./document-actions.md) — Viewer commands, sidebar integration, overflow, focus, ownership, and verification.
- [`theme-system.md`](./theme-system.md) — complete built-in/custom theme model, semantic colors, theme-owned backgrounds, local image assets, authoring workflows, extension guidance, and tests.
- [`design-system/`](./design-system/README.md) — current visual contracts and maintenance guide. Open [Overview](./design-system/index.html) in a browser to browse foundations, [Components](./design-system/components.html), [Icons](./design-system/icons.html), and the [Viewer preview](./design-system/viewer.html).
- [`gherkin-syntax.md`](./gherkin-syntax.md) — Gherkin syntax reference and the supported Markdown code-fence aliases; standalone `.feature` files are not Viewer document types.
- [`../DEV.md`](../DEV.md) — local setup, entry points, scripts, verification matrix, manual smoke tests, and troubleshooting.

## Documentation policy

- Keep `docs/` limited to current behavior, architecture, references, and project guidance.
- Keep incomplete work under [`../planning/`](../planning/).
- When a plan is complete, move durable facts into the relevant current-state document and remove the plan. Git history is the archive.
- Prefer links to stable entry points and ownership boundaries over copied directory trees, dated build output, or phase-by-phase history.
- Keep each prose paragraph on one physical source line. Markdown Plus renders source softbreaks as visible `<br>` elements.
- Store reusable source artwork under [`../assets/`](../assets/); keep only runtime-packaged files under `public/`.
- Treat `dist/` as generated output and document source/build behavior instead of generated filenames or chunk hashes.
