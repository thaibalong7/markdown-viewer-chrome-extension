---
description: "Markdown Plus UI design, design-system lookup, proposal review, and consistency across surfaces."
alwaysApply: false
globs:
  - "src/**/*.jsx"
  - "src/**/*.scss"
  - "src/**/*.html"
  - "src/viewer/**/*.js"
  - "src/popup/**/*.js"
  - "src/options/**/*.js"
  - "src/shared/icons/**/*.js"
  - "src/theme/**/*.js"
  - "src/plugins/**/*.js"
  - "docs/design-system/**"
  - "docs/document-actions.md"
  - "docs/theme-system.md"
  - "planning/**"
paths:
  - "src/**/*.jsx"
  - "src/**/*.scss"
  - "src/**/*.html"
  - "src/viewer/**/*.js"
  - "src/popup/**/*.js"
  - "src/options/**/*.js"
  - "src/shared/icons/**/*.js"
  - "src/theme/**/*.js"
  - "src/plugins/**/*.js"
  - "docs/design-system/**"
  - "docs/document-actions.md"
  - "docs/theme-system.md"
  - "planning/**"
trigger: glob
---

# UI Design and Design System

Apply this workflow when designing or changing UI appearance or interaction, including new UI and planning-only requests. Non-UI work in the scoped paths does not require design-system reading. This rule owns the agent workflow; `docs/design-system/` owns the current visual contracts and reference structure.

## Look up the existing contract

- Start with [Find the relevant contract](../../docs/design-system/README.md#find-the-relevant-contract), then read only the matching sections, preview specimens, and cited runtime sources. Do not load the entire design system by default.
- For Viewer sidebars, consult the [sidebar composition](../../docs/design-system/README.md#sidebar-composition), [panel toggles](../../docs/design-system/README.md#panel-toggles), and [sidebar scrolling](../../docs/design-system/README.md#sidebar-scrolling) contracts as relevant. Use [Document actions](../../docs/document-actions.md) for command ownership, overflow, focus, and integration; keep Files-specific composition local rather than migrating shared headers or other surfaces implicitly.
- Compare the requested UI with existing tokens, primitives, variants, states, and surface conventions before proposing a design. Reuse the existing contract where it fits; keep surface layout local and share primitives when their contract is shared.
- Runtime source remains canonical. If a preview disagrees with code, establish whether the task is correcting stale documentation, restoring an intended contract, or introducing a design change. Do not treat an accidental implementation inconsistency as approval for a new standard.
- For an existing UI change, inspect the owning component/styles and search for consumers of the same component, selectors, tokens, or interaction pattern across Viewer, Settings, and Popup as relevant. Review actual usage before concluding that a change is local or shared; cite the affected paths.

## Resolve design scope before applying it

Changes that follow existing contracts and have a clear, authorized implementation scope can proceed directly. A new screen composed from existing primitives does not automatically need a new system contract or another approval.

For a new reusable contract, a deliberate departure from the system, a redesign with unresolved choices, or a request to plan first, prepare a concrete proposal under `planning/design-system/<effort>/` (or the active effort's planning folder) before changing runtime UI or current-state design references. Include the relevant current contract/source, proposed appearance and behavior, states and accessibility, a mockup or prototype when useful, affected consumers, recommendation, and verification criteria. Keep unapproved prototypes in the planning folder.

When an existing UI would diverge from the design system, explicitly flag the consistency impact to the developer. Present the current and proposed behavior and the affected locations, then resolve these decisions together:

- **System change:** update the shared contract and current design references; identify which comparable consumers will migrate in this task and which, if any, are explicitly deferred.
- **Supported variant:** add a reusable variant with a clear usage condition; identify the consumers that should use it and the places that retain the existing variant.
- **Local exception:** explain why this location needs distinct treatment; keep the implementation scoped and the general system contract unchanged. Document its boundary and rationale beside the owning component/style or in the relevant current-state surface documentation so it is not copied as a new default.

Ask for a decision only when the existing user instructions do not already settle the contract and migration scope. A request to change one screen alone does not authorize a global redesign. If unresolved, state clearly that the proposed change creates an inconsistency or affects other consumers, recommend a scope, and wait before applying the dependent UI or design-system changes. Continue independent investigation and proposal work. Do not ask again for a decision already made in the conversation.

## Apply the accepted design and keep references current

- Once the developer accepts the concrete design and scope, implement the agreed runtime changes and refresh affected design-system contracts/previews together before declaring the work complete. Approval of a proposal does not make it implemented; keep it in `planning/` until it ships.
- For completely new UI, add system documentation/specimens when it introduces a reusable primitive, variant, token, interaction pattern, or a surface contract needed for future consistency. UI composed entirely from existing contracts only needs references updated where they become incomplete or inaccurate.
- Follow [Maintaining the previews](../../docs/design-system/README.md#maintaining-the-previews) for snapshot refresh and preview checks. Verify affected UI states, keyboard/focus behavior, light/dark themes, narrow layouts, coarse-pointer targets, and reduced motion as relevant; use the existing quality rules for runtime tests/builds.
- Keep workflow policy here and link to it from documentation instead of repeating it. Update current contracts in place, remove completed proposal material after durable facts are incorporated, and use Git history for prior designs and decisions.
- Keep visual dimensions and state treatments in the design-system contracts rather than duplicating them in rules. Replace stale preview CSS snapshots instead of layering conflicting old styles beneath the accepted design. When the user retains a prototype lab, label implemented decisions and remaining alternatives explicitly, link the current contracts, and identify fixture-only layout, capability, and scrollbar behavior.
- Report the chosen scope, changed runtime/reference files, consistency checks across consumers, and any explicitly deferred migrations or unverified visual checks.
