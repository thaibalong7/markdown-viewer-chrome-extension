# Release notes

## Unreleased — Find and workspace search

Implemented in the current source; no release version or Chrome Web Store publication has been assigned to these changes.

- Find in the reading surface with Cmd/Ctrl+F, while preserving the focused editor's native Find/Replace.
- Search supported text-file contents in the current Files folder/workspace with Ctrl+Shift+F, including the active unsaved draft, without replacing the sidebar header or asking for the same folder again.
- Combine case, whole-word and diacritic matching; use compact file-grouped excerpts, line numbers, keyboard navigation and distinct current-match highlighting.
- Retain disabled prior results during debounced updates; run Enter/Search again immediately, revalidate selected hits, preserve list focus, and open a source fallback for matches hidden by Markdown rendering.
- Reuse bounded RAM caches and prepared Unicode maps, run workspace matching in a packaged local Worker, batch result updates, and bound file reads before decoding/serialization.
- Correct same-file result focus, outdated displayed-document navigation and Find indexing at its text limit. Cache reuse does not add persistent indexing or continuous workspace watching; Search again rereads known files, while Refresh file list updates membership. Snapshot-only workspaces require folder reselection for fresh contents.

See the [user workflow](README.md#find-in-a-document-or-across-files) and [technical contract](docs/search.md) for defaults, shortcuts, limits and remaining release QA.

## 1.0.0.1 — Change review scrolling fix

Packaged on **November 3, 2026** as a small bug-fix revision of 1.0.0. Chrome Web Store publication has not been verified for this version.

- Keep the change review dialog in view when scrolling over the area outside it.
- Let the affected-section list scroll independently so long lists do not push the keyboard hint out of view or overflow the comparison layout.
- Display the clean version `1.0.0.1` without a build timestamp.

Maintainers: see the [1.0.0.1 release record](docs/chrome-web-store/release-1.0.0.1.md) for package metadata and verification status.

## 1.0.0 — First Chrome Web Store release

[Install Markdown Plus](https://chromewebstore.google.com/detail/markdown-plus/afbdmkpldpbkmmhejjlajocpneaiipmk) · [Website](https://thaibalong7.github.io/markdown-viewer-chrome-extension/) · [User guide](https://thaibalong7.github.io/markdown-viewer-chrome-extension/guide/)

The public Store listing checked on **November 1, 2026** showed **Updated November 1, 2026** and display version `1.0.0-20261030T075747621Z`.

- Read local Markdown with an outline, syntax highlighting, tables, task lists, math, footnotes, GitHub-style alerts, and Mermaid diagrams.
- Browse folders and related Markdown, text, SQL, DBML, Mermaid, and image files in Files.
- Choose light, dark, or custom themes, typography, and device-local background images.
- Follow external edits with Ask, Automatic, or Off update modes and review source changes.
- Opt in to the experimental Markdown editor with live preview and save to an explicitly connected original file.
- Export Markdown as HTML or Word-compatible `.doc`, export Mermaid as SVG/PNG, and print supported documents or save PDF through Chrome.
- Use the interface in English, Vietnamese, or Simplified Chinese.

### Setup

Requires **Chrome 116 or newer**. After installation, open the extension's Details page, enable **Allow access to file URLs**, then open or reload a local `.md`, `.markdown`, `.mdown`, or `.mdc` file. Other supported formats open through Files after the Markdown viewer is active.

### Known limitations

- Editing is experimental and off by default. Select and verify the original file and grant write permission before saving. Failed saves keep the draft; they do not download a replacement copy.
- Custom background-image binaries stay on the device and are excluded from JSON backups. Choose the image again on another device.
- HTML/Word exports containing Math may need external CSS/fonts; offline rendering can differ. Word-compatible `.doc` export is not native DOCX.
- Live document updates check the visible active document and support files up to **5 MiB**. Snapshot-only workspaces may need to be selected again.

Documents are processed locally without a developer-operated upload service. Preferences may sync through Chrome; recent paths, file connections, and background images stay on the device. Referenced remote resources and exported Math can contact third-party hosts. See the [privacy policy](https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/).

Maintainers: see the [release record](docs/chrome-web-store/release-1.0.0.md), [packaging workflow](docs/releasing.md), and [remaining work](planning/chrome-web-store/README.md).
