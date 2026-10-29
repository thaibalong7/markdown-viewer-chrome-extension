# Building a release

Run `nvm use` and install the locked dependencies with `npm ci` before releasing. The release script requires `zip` and `unzip` on PATH (available on macOS; install both on Linux). It builds locally and does not commit, tag, push, or upload anything.

## Interactive workflow

```bash
npm run release
```

The script asks whether to bump the current version (default: no). If yes, choose `patch` (default), `minor`, `major`, or `revision`. For example, from `0.1.0`, these produce `0.1.1`, `0.2.0`, `1.0.0`, or `0.1.0.1`. A successful bump updates `package.json`, the root version and `packages[""].version` in `package-lock.json`, and `manifest.json`. Dependency versions remain unchanged. If the source manifest already has `version_name`, a bump resets it to the new numeric version. About reads the packaged manifest, so no UI version constant needs updating.

The bump menu explains each choice and previews its result from the current version: `patch` for bug fixes and small corrections, `minor` for new features that keep existing usage compatible, `major` for breaking changes that require users to adjust or migrate, and `revision` for a small follow-up release that increments only the fourth number. Use Up/Down to move and Enter to confirm; `patch` is selected initially. Choices exceeding Chrome's version limits are disabled and skipped. Ctrl+C or Escape cancels before any source version changes. Terminals without cursor support (`TERM=dumb`) and redirected output use a numbered prompt instead, accepting `1`/`2`/`3`/`4` or the full name. Noninteractive input still requires `--bump`.

Interactive terminals show colored choices, prompts, and numbered build steps: green for patch/success, cyan for minor/progress, magenta for major, blue for revision, yellow for warnings, and red for failures. Labels remain explicit without color. Colors are disabled for redirected output, `TERM=dumb`, or when `NO_COLOR` is set; for example, `NO_COLOR=1 npm run release`.

Choosing no keeps all source version files byte-for-byte unchanged. The build receives a UTC timestamp with milliseconds, for example `0.1.0-20261029T123456789Z`, in the archive name and the packaged manifest's `version_name`. Chrome's numeric `version` stays `0.1.0`. The timestamp distinguishes local testing builds; publishing an update to Chrome Web Store requires increasing the numeric version. See Chrome's [version and version_name rules](https://developer.chrome.com/docs/extensions/reference/manifest/version).

## Fourth version component

`revision` creates a numeric Chrome version such as `0.1.0.1`, then `0.1.0.2`. Each numeric component must stay within Chrome's range of 0–65535. When a four-part version is present, patch/minor/major bumps keep four parts and reset the lower components: from `0.1.0.2`, patch produces `0.1.1.0`, minor produces `0.2.0.0`, and major produces `1.0.0.0`.

The same numeric version is stored in `package.json`, both lockfile locations, and `manifest.json`: for example, all contain `0.1.0.2`. Release filenames, the packaged manifest, About, and `release.json` use that same version. This private extension project follows Chrome's numeric version convention; version changes are handled by this script rather than `npm version` or an npm publishing workflow. No SemVer metadata suffix or separate package-version mapping is used.

## Noninteractive workflow

```bash
npm run release -- --bump patch
npm run release -- --bump minor
npm run release -- --bump major
npm run release -- --bump revision
npm run release -- --bump none
```

CI and other noninteractive callers must supply `--bump`. Tests run by default; explicitly add `--skip-tests` only when appropriate, for example after an equivalent verification run. The metadata records whether tests ran successfully or were skipped. Use `npm run release -- --help` for usage.

## Output and verification

Each build creates a directory under the git-ignored `releases/`, for example:

```text
releases/markdown-plus-v0.1.0-20261029T123456789Z/
  extension/                                    # Load unpacked in Chrome
  markdown-plus-v0.1.0-20261029T123456789Z.zip     # manifest.json at ZIP root
  markdown-plus-v0.1.0-20261029T123456789Z.zip.sha256
  release.json
```

Bumped builds use a directory and ZIP name such as `markdown-plus-v0.2.0` or `markdown-plus-v0.1.0.2`, without a timestamp. Existing release directories are never overwritten. `release.json` records the numeric/display versions, bump choice, UTC build start time, Git commit, whether the working tree had changes before the bump, test status, archive filename, and SHA-256. Local changes are included in the build; the script reports them rather than requiring a clean worktree. Git fields are `null` when Git information is unavailable.

The script checks version consistency before starting, runs `npm test`, builds production output into a temporary release directory, checks the generated manifest version and referenced entry files, creates a ZIP containing the extension files directly at its root, and verifies archive integrity before publishing the completed directory. Analysis reports are disabled for this build. The normal development `dist/` directory is preserved.

For caught errors or normal SIGINT/SIGTERM cancellation, the script removes partial output and restores version-file snapshots. It preserves concurrent manual edits and reports when a version needs restoring manually. A release lock prevents concurrent release scripts. A hard kill or power loss cannot run cleanup: ensure no release is active, review the three source version files, and remove stale `releases/.release.lock` and `releases/.building-*` directories before retrying. Do not blindly discard unrelated local changes.

Load the generated `extension/` directory through Chrome's **Load unpacked** and smoke-test file access, opening Markdown, Popup/Settings, and any changed flows before uploading a bumped ZIP to the Web Store. Automated build and ZIP checks do not replace Chrome smoke testing.
