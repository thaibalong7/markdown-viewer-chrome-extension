# Markdown Plus 1.0.0.1 — release record

## Scope and status

Small bug-fix revision of [1.0.0](./release-1.0.0.md), packaged on **2026-11-03**. It keeps the change review dialog in view when scrolling outside the card and contains long affected-section lists, which now scroll independently of the keyboard hint. The displayed extension version also omits the previous build timestamp. See [release notes](../../CHANGELOG.md) and the localized [website release pages](../../site/releases/index.html#v1-0-0-1).

The local package is complete. Chrome Web Store upload, approval, and public availability have not been verified for this version. The existing Store item remains [Markdown Plus](https://chromewebstore.google.com/detail/markdown-plus/afbdmkpldpbkmmhejjlajocpneaiipmk), extension ID `afbdmkpldpbkmmhejjlajocpneaiipmk`.

## Local package evidence

The release script recorded the following in [release.json](../../releases/markdown-plus-v1.0.0.1/release.json). Artifacts live in git-ignored `releases/` and may be unavailable in a fresh clone.

| Field | Recorded value |
| --- | --- |
| Numeric / display version | `1.0.0.1` / `1.0.0.1` |
| Bump | `revision` |
| Build start | `2026-11-03T02:13:33.517Z` — 09:13:33.517 in Vietnam |
| Source commit | `957955439e9425c2b17a2c131c6ad35624b7cfcc` |
| Worktree before bump | Dirty; local changes were included in the build. |
| Tests | `passed`, as recorded by the release script. |
| Archive | [markdown-plus-v1.0.0.1.zip](../../releases/markdown-plus-v1.0.0.1/markdown-plus-v1.0.0.1.zip) |
| Unpacked build | [extension/](../../releases/markdown-plus-v1.0.0.1/extension/) |
| SHA-256 | `2768beeb5991112edf8da04ea0921ba8867698050851cab864ee3d2cf142a720` |

The documentation update independently verified the archive's SHA-256 against both metadata and the `.sha256` file, checked ZIP integrity/CRC, and confirmed `manifest.json` at the archive root. It did not rebuild the extension or rerun the extension test suite.

## Verification still to record

Manual browser QA and a fresh production dependency audit are not recorded for this package. In particular, verify scrolling over the review backdrop, long affected-section lists, keyboard-hint visibility, and narrow layouts against this exact ZIP. Follow the [release verification workflow](../releasing.md#updating-the-published-extension) for remaining checks and record the public version/date after Store publication.
