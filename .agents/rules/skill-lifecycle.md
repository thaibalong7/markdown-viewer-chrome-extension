---
description: "Lifecycle for shared Markdown Plus skills, Claude adapters, naming, references, and validation."
alwaysApply: false
globs: ".agents/skills/**,.claude/skills/**,.agents/rules/**,.cursor/rules/**,.claude/rules/**,AGENTS.md,.claude/CLAUDE.md,agent-config-layout.md,scripts/check-agents.sh"
paths:
  - ".agents/skills/**"
  - ".claude/skills/**"
  - ".agents/rules/**"
  - ".cursor/rules/**"
  - ".claude/rules/**"
  - "AGENTS.md"
  - ".claude/CLAUDE.md"
  - "agent-config-layout.md"
  - "scripts/check-agents.sh"
trigger: glob
---

# Shared Skill Lifecycle

Apply these guardrails when creating, editing, deleting, renaming, or moving a
shared skill or a reference to one. Detailed rationale lives in
[`agent-config-layout.md`](../../agent-config-layout.md).

## Ownership and layout

- The only durable source is `.agents/skills/<skill-name>/`.
- Keep `.agents/skills/` flat. Every package has exactly one root `SKILL.md`.
- Folder name must exactly match frontmatter `name`; use kebab-case and no more
  than 64 characters.
- Do not create a shared skill or adapter under `.cursor/skills/` or
  `.codex/skills/`.
- Expose every shared skill to Claude Code with
  `.claude/skills/<skill-name> -> ../../.agents/skills/<skill-name>`.
- Cursor, Codex, and Antigravity read `.agents/skills/` directly.

## Skill design

- The description states what the skill does and when it applies, including
  discriminating trigger phrases without becoming a catch-all.
- Keep `SKILL.md` focused. Put substantial conditional detail in `references/`,
  deterministic reusable automation in `scripts/`, and output resources in
  `assets/`.
- Use relative paths from the skill root. Do not depend on vendor-only syntax
  for the shared workflow to work.
- Namespace Markdown Plus development workflows as `mdp-dev-*` and agent
  configuration/governance workflows as `mdp-agent-*`.

## Lifecycle

- **Add:** create the source package, Claude symlink, and all required references
  in the same task.
- **Edit:** change only the source package and ensure referenced resources still
  resolve.
- **Rename/move:** update folder, frontmatter name, Claude symlink, and all
  consumers atomically; remove the old adapter after the new target validates.
- **Delete:** remove source, Claude symlink, and stale references together.
- Search old names and paths before finishing. Keep an old name only as an
  intentional `Legacy keywords:` discovery hint.

## Validation and freshness

- Run the active agent's skill-creator validator when available. Do not hard-code
  a user-specific global skill path into repository scripts or instructions.
- Run `bash scripts/check-agents.sh` for repository-wide integrity.
- After changing the skill catalog, use a new session or reload the relevant
  runtime before claiming discovery was smoke-tested.
