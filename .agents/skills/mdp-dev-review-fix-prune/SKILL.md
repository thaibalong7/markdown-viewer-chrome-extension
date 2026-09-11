---
name: mdp-dev-review-fix-prune
description: >-
  Review Markdown Plus git changes against a stated issue, remove redundant or
  risky edits, and retain only the focused fix. Use for review-fix-prune,
  issue-focused cleanup, regression-risk pruning, or requests to minimize a fix.
---

# Markdown Plus Review, Fix, and Prune

Review and clean the current change set so it contains the smallest safe fix
for the issue described by the user.

## Required context

- Confirm the current repository root is Markdown Plus.
- Establish the issue or intended behavior from the user request and active
  conversation. If that scope cannot be determined safely, ask one concise
  question before mutating files.
- Inspect staged and unstaged diffs. Preserve unrelated user changes.

## Review workflow

1. Read the project rules that apply to every changed file before judging or
   editing it.
2. Classify each changed hunk:
   - `REQUIRED`: directly contributes to the issue fix.
   - `OPTIONAL`: useful but not required for this fix.
   - `REDUNDANT`: adds no measurable value to the fix.
   - `RISKY`: broadens behavior or creates plausible regression risk.
3. Explain concrete removals for `REDUNDANT` and `RISKY` changes.
4. Apply cleanup edits that are clearly within the requested issue scope.
   Never discard unrelated pre-existing work; if ownership is ambiguous, leave
   it intact and report it.
5. Re-read the diff and run focused tests appropriate to the retained change.
   Follow repository rules for when the full test suite, build, or size report
   is required.

## Guardrails

- Do not add unrelated features or perform broad refactors.
- Preserve behavior outside the stated issue.
- Do not hand-edit `dist/**`.
- Keep imports, naming, architecture boundaries, and neighboring style intact.
- Prefer a smaller safe change when evidence does not justify a broader one.
- Do not commit or push unless explicitly requested.

## Output

Report:

1. Scope understanding in 1-2 sentences.
2. Findings by file, grouped by `REQUIRED`, `OPTIONAL`, `REDUNDANT`, and
   `RISKY`; omit empty groups.
3. Cleanup actions applied.
4. Verification performed, residual risks, and any manual checks still needed.
