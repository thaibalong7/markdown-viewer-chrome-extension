---
description: Review changed code, keep only real issue fixes, remove redundant changes
argument-hint: [issue context]
---

Review all current git changes for this issue: $ARGUMENTS.

Goal:
1. Keep only changes that directly fix the issue.
2. Identify and remove redundant, risky, or unrelated edits.
3. Preserve behavior outside issue scope.

Checklist:
- Inspect staged and unstaged diffs.
- For each changed hunk, label it as:
  - REQUIRED (directly contributes to fixing the issue)
  - OPTIONAL (nice-to-have but not required for the fix)
  - REDUNDANT (no measurable value to the fix)
  - RISKY (can cause regression / side effects)
- Propose concrete removals for REDUNDANT and RISKY hunks.
- Apply cleanup edits to remove unnecessary code.
- Re-check diff to confirm only issue-focused changes remain.

Guardrails:
- Do not add new features.
- Do not perform broad refactors unless strictly required by the fix.
- Do not modify `dist/**` by hand.
- Keep imports, naming, and style consistent with neighboring code.
- If uncertain, prefer smaller and safer changes.

Output format:
1. Scope understanding (1-2 sentences)
2. Findings by file (REQUIRED / OPTIONAL / REDUNDANT / RISKY)
3. Cleanup actions applied
4. Residual risks and quick test plan
