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

## Commit Message Convention

Use Conventional Commits by default:

```text
<type>(optional-scope): <imperative subject>

- <specific impact or reason>
- <notable implementation or user-facing detail>

Optional-footer: value
```

Allowed types:

- `feat`: user-facing feature or capability.
- `fix`: bug fix or behavior correction.
- `refactor`: internal restructuring without intended behavior change.
- `perf`: performance improvement.
- `test`: test-only change.
- `docs`: documentation-only change.
- `style`: formatting or styling with no behavior change.
- `build`: build system, dependency, bundling, or tooling change.
- `ci`: CI workflow/configuration change.
- `chore`: maintenance that does not fit the above.
- `ai`: AI collaboration metadata or tooling, such as skills, commands, agent rules, MCP setup, prompts, or assistant workflow configuration.
- `revert`: revert a previous commit.

Scope rules:

- Use a short lowercase scope when it improves clarity, for example `viewer`, `editor`, `explorer`, `plugins`, `settings`, `popup`, `background`, `content`, `docs`, or `build`.
- Omit the scope when the change is cross-cutting or the scope would be vague.
- Use `!` after type or scope for breaking changes, for example `feat(settings)!: migrate schema`.

Subject rules:

- Start with lowercase imperative wording after the type, for example `fix(viewer): preserve scroll after render`.
- Do not end the subject with a period.
- Keep the subject specific enough to explain the main intent without reading the body.

Body and footer rules:

- Include a body when it clarifies why the change exists, user impact, tradeoffs, or notable implementation details.
- Use 1-3 bullets for the body unless the change is trivial.
- Use `BREAKING CHANGE:` footer for incompatible behavior, API, storage, or migration changes.
- Use issue footers only when evident from context, for example `Refs #123` or `Closes #123`.

## Output

1. `recommended`: best commit message with subject and body.
2. `alternatives`: 2 additional options.
3. `reasoning`: short explanation of why the recommended message is best.

## Formatting Rules

- Subject line must be 72 characters or fewer.
- Use the conventional format `type(scope): subject` unless there is a clear reason not to.
- Body should be 1-3 concise and specific bullet points.
- Mention touched scope or feature only if it improves clarity.
- Avoid generic text such as `update code` or `fix bug`.

## Safety Rules

- If changes look mixed across unrelated concerns, warn and propose split commits.
- If there are no meaningful changes, say so instead of inventing a message.
- Do not run `git commit` automatically.
