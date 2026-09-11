---
description: "Lifecycle for shared Markdown Plus rules, generated Cursor adapters, Claude symlinks, Codex routing, and validation."
alwaysApply: false
globs: ".agents/rules/**,.cursor/rules/**,.claude/rules/**,AGENTS.md,.claude/CLAUDE.md,agent-config-layout.md,scripts/sync-cursor-rules.sh,scripts/check-agents.sh"
paths:
  - ".agents/rules/**"
  - ".cursor/rules/**"
  - ".claude/rules/**"
  - "AGENTS.md"
  - ".claude/CLAUDE.md"
  - "agent-config-layout.md"
  - "scripts/sync-cursor-rules.sh"
  - "scripts/check-agents.sh"
trigger: glob
---

# Shared Rule Lifecycle

Apply these guardrails when creating, editing, deleting, renaming, or moving a
shared rule or changing its routing, adapter, or validation tooling. Detailed
rationale lives in [`agent-config-layout.md`](../../agent-config-layout.md).

## Ownership and adapters

- The only durable source is `.agents/rules/<rule-name>.md`.
- Generate `.cursor/rules/<rule-name>.mdc` from that source with
  `bash scripts/sync-cursor-rules.sh`. Cursor adapters are real generated files,
  not symlinks, and must not be edited independently.
- `.claude/rules/<rule-name>.md` must be a symlink to
  `../../.agents/rules/<rule-name>.md`.
- Antigravity reads `.agents/rules/` directly. Codex loads rules through the
  gate in `AGENTS.md`; do not assume it auto-discovers the rule directory.

## Activation and routing

- Keep one activation intent across runtimes: Cursor uses `alwaysApply` and
  `globs`; Claude uses `paths` for scoped rules and no `paths` for always-on
  rules; Antigravity uses `trigger` and `globs`.
- When a scope changes, update both `globs` and `paths` to match real repo paths.
- List every always-on rule explicitly in the Codex gate in `AGENTS.md`, without
  duplicating the full rule body there.
- Route lifecycle rules explicitly from both `AGENTS.md` and
  `.claude/CLAUDE.md`.

## Lifecycle and validation

- Add, rename, or delete the source, Cursor adapter, Claude symlink, Codex
  routing, and references atomically.
- After every shared-rule change, run `bash scripts/sync-cursor-rules.sh` and
  then `bash scripts/check-agents.sh`.
- Keep `AGENTS.md` comfortably below 32 KiB and each shared rule below 12,000
  bytes.
- Reload or start a new runtime session after catalog or activation changes;
  report any UI discovery smoke test that remains manual.
