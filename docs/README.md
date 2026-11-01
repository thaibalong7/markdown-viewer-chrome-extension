# Markdown Plus developer documentation

This directory contains current technical references for developers and contributors. For installation through Chrome Web Store, features, Popup controls, themes, and Settings, use the [user README](../README.md). Runtime source remains the ultimate source of truth when documentation and code disagree.

## Start here

- [Development guide](../DEV.md) — prerequisites, local setup, development builds, scripts, verification, and troubleshooting.
- [Contributing](../README.md#contributing) — bug reports, feature ideas, documentation, translations, and pull requests.
- [Architecture overview](./architecture-overview.md) — product scope, runtime flows, subsystem ownership, security boundaries, and task-to-source guidance; read before changing runtime architecture.

## Runtime and feature contracts

- [`document-updates-and-change-review.md`](./document-updates-and-change-review.md) — current Watch modes, review workflow, editor safeguards, reading continuity, limits, and implementation map.
- [`document-actions.md`](./document-actions.md) — Viewer commands, sidebar integration, overflow, focus, ownership, and verification.
- [`viewer-content-ui.md`](./viewer-content-ui.md) — ownership and integration rules for UI inside rendered document content.
- [`theme-system.md`](./theme-system.md) — complete built-in/custom theme model, semantic colors, theme-owned backgrounds, local image assets, authoring workflows, extension guidance, and tests.
- [`gherkin-syntax.md`](./gherkin-syntax.md) — Gherkin syntax reference and the supported Markdown code-fence aliases; standalone `.feature` files are not Viewer document types.

## Interface design and languages

- [`internationalization.md`](./internationalization.md) — interface-language ownership, semantic IDs, live switching, literal document boundaries, and locale integration/verification; use [`mdp-dev-add-language`](../.agents/skills/mdp-dev-add-language/SKILL.md) for the full translation workflow.
- [`localization.md`](./localization.md) — shared interface-writing principles and locale-specific terminology, tone, exceptions, and research references; extend a locale section when adding languages.
- [`design-system/`](./design-system/README.md) — current visual contracts and maintenance guide. Open [Overview](./design-system/index.html) in a browser to browse foundations, [Components](./design-system/components.html), [Icons](./design-system/icons.html), and the [Viewer preview](./design-system/viewer.html).

## Compatibility, release, and publishing

- [`browser-compatibility.md`](./browser-compatibility.md) — declared Chrome minimum, build targets, API audit, and manual production QA.
- [Release notes](../CHANGELOG.md) — published features, setup, and known limitations.
- [Chrome Web Store release reference](./chrome-web-store/README.md) — selected listing copy, privacy-form text, assets, and 1.0.0 evidence.
- [`releasing.md`](./releasing.md) — versioning, production archives, checksums, and release verification.
- [Website maintenance](../site/README.md) — localized website sources, generation, checks, and GitHub Pages deployment.
- [Source assets](../assets/README.md) — brand artwork, user-guide illustrations, and Chrome Web Store upload assets.

## Documentation policy

- Keep the root [README](../README.md) as the user entry point: Store installation, essential workflows, illustrated controls, support, and contribution links. Link the published Chrome Web Store listing directly and keep release notes current.
- Keep [DEV.md](../DEV.md) as the developer entry point for setup and verification; keep `docs/` focused on current technical behavior, ownership, integration contracts, and maintenance. Detailed UI behavior here defines implementation expectations rather than a second user manual.
- Keep source-build and **Load unpacked** instructions in developer setup or release QA. Public installation guidance in the README and website uses Chrome Web Store.
- Keep website copy and installation status aligned across all three locale catalogs and regenerate the published HTML; see [website maintenance](../site/README.md#installation-links-and-store-availability).
- Keep incomplete work under [`../planning/`](../planning/).
- When a plan is complete, move durable facts into the relevant current-state document and remove the plan. Git history is the archive.
- Prefer links to stable entry points and ownership boundaries over copied directory trees, dated build output, or phase-by-phase history.
- Keep each prose paragraph on one physical source line. Markdown Plus renders source softbreaks as visible `<br>` elements.
- Store reusable source artwork under [`../assets/`](../assets/); keep only runtime-packaged files under `public/`.
- Treat `dist/` as generated output and document source/build behavior instead of generated filenames or chunk hashes.
