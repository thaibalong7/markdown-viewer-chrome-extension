# Review Fix Prune

Use this command to review all current git changes for the issue described by the user.

## Goal

1. Keep only changes that directly fix the issue.
2. Identify and remove redundant, risky, or unrelated edits.
3. Preserve behavior outside issue scope.

## Checklist

- Inspect staged and unstaged diffs.
- For each changed hunk, label it as:
  - `REQUIRED`: directly contributes to fixing the issue.
  - `OPTIONAL`: nice-to-have but not required for the fix.
  - `REDUNDANT`: no measurable value to the fix.
  - `RISKY`: can cause regression or side effects.
- Propose concrete removals for `REDUNDANT` and `RISKY` hunks.
- Apply cleanup edits to remove unnecessary code.
- Re-check the diff to confirm only issue-focused changes remain.

## Guardrails

- Do not add new features.
- Do not perform broad refactors unless strictly required by the fix.
- Do not modify `dist/**` by hand.
- Keep imports, naming, and style consistent with neighboring code.
- If uncertain, prefer smaller and safer changes.

## Output Format

1. Scope understanding, in 1-2 sentences.
2. Findings by file, grouped as `REQUIRED`, `OPTIONAL`, `REDUNDANT`, and `RISKY`.
3. Cleanup actions applied.
4. Residual risks and quick test plan.
