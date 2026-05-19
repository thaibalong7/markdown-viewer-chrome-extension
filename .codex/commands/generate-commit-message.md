# Generate Commit Message

Use this command to generate commit message candidates from:

1. Current repository changes, both staged and unstaged.
2. The active chat thread context of this session.
3. Optional extra clarification supplied by the user.

Treat the current chat thread as primary context automatically. Use any extra user note only as clarification, not as required input.

## Requirements

- Inspect both staged and unstaged git changes.
- Infer intent from code changes first, then use current chat context to refine wording.
- Focus on why and user impact, not only what changed.
- Keep messages aligned with conventional commit style when possible.

## Output

1. `recommended`: best commit message with subject and body.
2. `alternatives`: 2 additional options.
3. `reasoning`: short explanation of why the recommended message is best.

## Formatting Rules

- Subject line must be 72 characters or fewer.
- Use imperative mood, for example `fix`, `update`, `refactor`, or `add`.
- Body should be 1-3 concise and specific bullet points.
- Mention touched scope or feature only if it improves clarity.
- Avoid generic text such as `update code` or `fix bug`.

## Safety Rules

- If changes look mixed across unrelated concerns, warn and propose split commits.
- If there are no meaningful changes, say so instead of inventing a message.
- Do not run `git commit` automatically.
