# Codex operating contract — Markdown Plus

This repository shares agent configuration across Cursor, Claude Code, Codex,
and Antigravity. Shared skills use `.agents/skills/` as their source of truth;
shared rules use `.agents/rules/`. Never treat generated `.cursor/rules/` files
as durable rule sources.

## Start-of-request gate

Before a substantive answer, plan, tool action, or file change, perform this
gate. Preliminary read-only discovery calls may come first:

1. Read these always-on rules completely:
   - `.agents/rules/00-project-context.md`
   - `.agents/rules/10-environment-build-and-assets.md`
2. Infer working scope from the request, referenced paths, and files that will
   be read or changed.
3. Inspect frontmatter under `.agents/rules/*.md`; read every scoped rule whose
   `globs` or `paths` matches the working scope before acting on those files.
4. For any shared-skill lifecycle or skill-reference change, read
   `.agents/rules/skill-lifecycle.md`. For any shared-rule, adapter, routing, or
   validation-tooling change, read `.agents/rules/rule-lifecycle.md`.
5. If the request names a skill or matches a skill description, read the full
   `.agents/skills/<name>/SKILL.md` and its required resources before acting.

Do not claim a rule or skill was applied unless it was actually read during the
current request. Files already read in this thread may be reused while their
content remains present and unchanged.

## Rules and skills

- Cursor, Codex, and Antigravity discover shared skills from `.agents/skills/`.
  Claude Code uses symlinks under `.claude/skills/`.
- Antigravity reads `.agents/rules/` directly. Cursor uses generated
  `.cursor/rules/*.mdc`; Claude uses `.claude/rules/*.md` symlinks; Codex uses
  this routing gate.
- Explicitly named skills must be used. Skills may also activate when their
  descriptions match the request.
- Do not replace a selected skill's required phases, gates, or checklist with an
  improvised workflow.
- Announce selected skills briefly before actions caused by them.

## Conflict handling

Within repository guidance, apply this order:

1. User instruction for the current request.
2. More specific scoped rule.
3. Always-on workspace rule.
4. Selected skill defaults.
5. General model behavior.

Higher-level safety, permission, and sandbox constraints still apply. If two
applicable repository rules remain incompatible, stop at the affected decision
and ask the user.

## Working behavior

- Never run `git commit` or `git push` unless explicitly requested.
- Preserve unrelated user changes in the worktree.
- Read/review/explain requests do not authorize file mutation.
- Implementation requests should be verified proportionally; report files
  changed and checks run.
- Keep agent-config lifecycle changes atomic: source, adapters, routing,
  references, and validation must be updated in the same task.

Detailed layout and rationale live in `agent-config-layout.md`. After changing a
shared rule, run `bash scripts/sync-cursor-rules.sh` and
`bash scripts/check-agents.sh`. Refresh agent sessions after catalog changes.
