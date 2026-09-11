# Agent Config Layout — Markdown Plus

This document is the durable design for sharing skills and rules across Cursor,
Claude Code, Codex, and Antigravity in this repository.

## 1. Design goals

- Keep one editable source for every shared skill and rule.
- Use thin adapters only where an agent cannot read the shared source natively.
- Keep repeatable multi-step workflows in skills, not commands or always-on
  rules.
- Make add, edit, rename, and delete operations atomic and statically verifiable.

## 2. Repository layout

```text
repo/
├── AGENTS.md                         # Codex contract and rule router
├── agent-config-layout.md            # this design document
├── .agents/
│   ├── skills/                       # source of truth for shared skills
│   │   └── <skill-name>/
│   │       ├── SKILL.md
│   │       ├── references/           # optional
│   │       ├── scripts/              # optional
│   │       └── assets/               # optional
│   └── rules/                        # source of truth for shared rules
│       └── <rule-name>.md
├── .cursor/rules/
│   └── <rule-name>.mdc               # generated file, never hand-edited
├── .claude/
│   ├── CLAUDE.md                     # Claude pointer and lifecycle routing
│   ├── skills/<skill-name>           # symlink to .agents/skills/<skill-name>
│   └── rules/<rule-name>.md           # symlink to .agents/rules/<rule-name>.md
└── scripts/
    ├── sync-cursor-rules.sh
    └── check-agents.sh
```

Do not recreate `.cursor/commands/` or `.codex/commands/`. The former
`generate-commit-message` and `review-fix-prune` workflows are now shared skills.

## 3. Skills

### Source and discovery

`.agents/skills/<name>/` is the only real source for a shared skill.

| Agent | Skill surface |
|---|---|
| Cursor | Native `.agents/skills/` |
| Codex | Native `.agents/skills/` |
| Antigravity | Native `.agents/skills/` |
| Claude Code | `.claude/skills/<name>` symlink |

Do not create `.cursor/skills/`, `.codex/skills/`, copied `SKILL.md` files, or a
second source for the same skill.

### Package contract

- Keep packages flat at `.agents/skills/<name>/`.
- Folder and frontmatter `name` must match, use kebab-case, and stay within 64
  characters.
- Frontmatter `description` says both what the skill does and when it applies.
- Keep the body focused on essential workflow and guardrails.
- Put conditional detail in `references/`, reusable deterministic automation in
  `scripts/`, and files intended for output in `assets/`.
- Use relative resource paths and do not depend on vendor-only syntax.
- Use `mdp-dev-*` for Markdown Plus development workflows and `mdp-agent-*` for
  agent configuration or governance workflows.

Current skills:

| Skill | Replaces | Purpose |
|---|---|---|
| `mdp-dev-conventional-commit` | `generate-commit-message` command | Generate Conventional Commit candidates from the active diff and conversation |
| `mdp-dev-review-fix-prune` | `review-fix-prune` command | Audit and prune a change set to the smallest safe issue fix |

### Skill lifecycle

Before changing a skill or reference, read
`.agents/rules/skill-lifecycle.md` completely.

- Add: create source package, Claude symlink, and references together.
- Edit: change only the source package.
- Rename: update folder, frontmatter, symlink, and consumers together.
- Delete: remove source, symlink, and stale references together.
- Validate each skill with the skill-creator `quick_validate.py` and run
  `bash scripts/check-agents.sh`.

## 4. Rules

### Source and adapters

`.agents/rules/<name>.md` is the only real source for a shared rule.

| Agent | Rule surface |
|---|---|
| Antigravity | Native `.agents/rules/*.md` |
| Cursor | Generated `.cursor/rules/*.mdc` |
| Claude Code | `.claude/rules/*.md` symlinks |
| Codex | Explicit routing in `AGENTS.md` |

Cursor adapters are generated copies because Cursor requires `.mdc` and symlink
handling is not used as the repository contract. Regenerate them with:

```bash
bash scripts/sync-cursor-rules.sh
```

Never edit a generated Cursor adapter as the source.

### Portable frontmatter

Scoped rule example:

```yaml
---
description: "What this rule governs."
alwaysApply: false
globs:
  - "src/example/**/*.js"
paths:
  - "src/example/**/*.js"
trigger: glob
---
```

Always-on rule example:

```yaml
---
description: "Always-required project context."
alwaysApply: true
trigger: always_on
---
```

- Cursor uses `alwaysApply` and `globs`.
- Claude Code uses `paths`; omit `paths` for always-on rules.
- Antigravity uses `trigger` and `globs`.
- Codex does not auto-discover this folder, so `AGENTS.md` must explicitly list
  every always-on rule and route scoped rules by frontmatter.

### Root routing files

`AGENTS.md` stays small and contains the Codex start-of-request gate, conflict
order, shared-surface ownership, and lifecycle routes. It must remain below 32
KiB. Do not duplicate complete rule bodies there.

`.claude/CLAUDE.md` is a thin Claude-specific pointer. It lists always-on rule
names and routes agent-config lifecycle work without copying their bodies.

A project `GEMINI.md` is unnecessary unless Antigravity needs a deliberate
override that should not affect the other agents.

### Rule lifecycle

Before changing a shared rule, adapter, router, or validator, read
`.agents/rules/rule-lifecycle.md` completely.

- Add: create source, generate Cursor adapter, create Claude symlink, and update
  Codex routing together.
- Edit: edit source only, then regenerate and validate.
- Rename/delete: remove stale adapters and symlinks in the same task.
- Keep each rule below 12,000 bytes for cross-agent portability.

## 5. Validation

After any shared-rule edit:

```bash
bash scripts/sync-cursor-rules.sh
bash scripts/check-agents.sh
```

The validator checks:

- skill folder/frontmatter names and flat layout;
- Claude skill and rule symlink targets;
- Cursor rule content equality and stale adapters;
- required Codex and Claude lifecycle routing;
- absence of old command directories and duplicate Cursor skill sources;
- broken symlinks and document-size limits.

Static checks do not prove runtime discovery. After a catalog or activation
change, open a new Codex/Claude session or reload Cursor/Antigravity before
claiming that UI/runtime discovery was verified.

## 6. Change checklist

- [ ] Read the applicable lifecycle rule before changing agent config.
- [ ] Edit only the source under `.agents/`.
- [ ] Keep skill paths relative and rule activation metadata aligned.
- [ ] Update all adapters, symlinks, routing, and references atomically.
- [ ] Search for stale command names or old paths.
- [ ] Run the sync and integrity scripts.
- [ ] Run skill validation for each new or substantially changed skill.
- [ ] Record runtime discovery as manual if no fresh-session smoke test was run.
