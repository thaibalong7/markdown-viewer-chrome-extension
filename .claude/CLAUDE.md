# Markdown Plus — Claude Code

Shared rules live in `.agents/rules/` and are exposed to Claude Code through
symlinks in `.claude/rules/`. Shared skills live in `.agents/skills/` and are
exposed through symlinks in `.claude/skills/`.

Always-on rules:

- `00-project-context.md`
- `10-environment-build-and-assets.md`

Other project rules activate through their `paths` metadata. Long workflows,
including conventional commit generation and issue-focused change pruning, live
in skills rather than commands or always-on rules.

Before creating, editing, deleting, renaming, or moving a shared skill or skill
reference, read `.agents/rules/skill-lifecycle.md` completely. Before changing a
shared rule, adapter, root routing, or validation tooling, read
`.agents/rules/rule-lifecycle.md` completely.
