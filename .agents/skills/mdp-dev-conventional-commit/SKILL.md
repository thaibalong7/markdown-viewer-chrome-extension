---
name: mdp-dev-conventional-commit
description: >-
  Generate Conventional Commit message candidates for Markdown Plus from the
  current git diff and active conversation. Use when the user asks for a commit
  message, conventional commit, generate-commit-message, or commit wording.
---

# Markdown Plus Conventional Commit

Generate commit-message candidates without committing.

## Workflow

1. Confirm the current repository root is Markdown Plus before reading git data.
2. Inspect `git status --short`, staged changes, and unstaged changes. If the
   user specifies a narrower scope, inspect only that scope.
3. Infer intent from the diff first and use the active conversation only to
   clarify why the change exists.
4. If unrelated concerns are mixed, recommend split commits before proposing a
   combined message.
5. If there is no meaningful diff, say so instead of inventing a message.

## Convention

Use this structure by default:

```text
<type>(optional-scope): <imperative subject>

- <specific impact or reason>
- <notable implementation or user-facing detail>

Optional-footer: value
```

Allowed types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`,
`build`, `ci`, `chore`, `ai`, and `revert`.

- Use `ai` for agent rules, skills, prompts, adapters, commands, or other AI
  collaboration configuration.
- Prefer a short lowercase product scope such as `viewer`, `editor`,
  `explorer`, `plugins`, `settings`, `popup`, `background`, `content`, `docs`,
  or `build`. Omit vague or cross-cutting scopes.
- Add `!` and a `BREAKING CHANGE:` footer only when the diff proves an
  incompatible behavior, API, or settings migration.
- Keep the subject imperative, specific, without a trailing period, and at most
  72 characters.
- Use 1-3 concise body bullets only when they add useful why, impact, or
  implementation detail.
- Add issue footers only when supported by user input or repository context.

## Output

Return:

1. `recommended`: the strongest complete message.
2. `alternatives`: two materially different options.
3. `reasoning`: a brief explanation of the recommended type, scope, and focus.

Do not run `git commit` or `git push` unless the user explicitly asks.
