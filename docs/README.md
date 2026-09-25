# Markdown Plus documentation

This directory documents the repository as it exists today. Runtime source remains the ultimate source of truth when documentation and code disagree.

## Start here

- [`architecture-overview.md`](./architecture-overview.md) — product scope, runtime flows, subsystem ownership, security boundaries, and task-to-source guidance.
- [`design-system.md`](./design-system.md) — visual tokens, component contracts, and current UI conventions.
- [`design-system-demo.html`](./design-system-demo.html) — static preview of the current Markdown Plus visual language.
- [`gherkin-syntax.md`](./gherkin-syntax.md) — Gherkin syntax reference and Markdown code-fence example.

## Documentation policy

- Keep `docs/` limited to current behavior, architecture, references, and project guidance.
- Keep incomplete work under [`../planning/`](../planning/).
- When a plan is complete, move durable facts into the relevant current-state document and remove the plan. Git history is the archive.
- Prefer links to stable entry points and ownership boundaries over copied directory trees, dated build output, or phase-by-phase history.
- Keep each prose paragraph on one physical source line. Markdown Plus renders source softbreaks as visible `<br>` elements.
- Store reusable source artwork under [`../assets/`](../assets/); keep only runtime-packaged files under `public/`.
