---
description: Generate git commit messages from current diff and current chat context
argument-hint: [optional extra note]
---

Generate commit message candidates from:
1) current repository changes (staged + unstaged), and
2) the active chat thread context of this session.

Treat the current chat thread as the primary context automatically.
Use `$ARGUMENTS` only as optional extra clarification, not as required input.

Requirements:
- Inspect both staged and unstaged git changes.
- Infer intent from code changes first, then use current chat context to refine wording.
- Focus on WHY and user impact, not only WHAT changed.
- Keep messages aligned with conventional commit style when possible.

Output:
1. `recommended`: best commit message (subject + body)
2. `alternatives`: 2 additional options
3. `reasoning`: short explanation of why recommended message is best

Formatting rules:
- Subject line <= 72 chars.
- Use imperative mood (e.g. "fix", "update", "refactor", "add").
- Body is 1-3 bullet points, concise and specific.
- Mention touched scope (module/feature) only if it improves clarity.
- Avoid generic text like "update code" or "fix bug".

Safety rules:
- If changes look mixed across unrelated concerns, warn and propose split commits.
- If there are no meaningful changes, say so instead of inventing a message.
- Do not run git commit automatically.
