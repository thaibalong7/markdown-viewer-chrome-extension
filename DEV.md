# Markdown Plus development guide

This guide is for developers and contributors working on the Chrome MV3 extension built with Vite, `@crxjs/vite-plugin`, React, and SCSS. For Chrome Web Store installation and everyday use, see the [README](README.md#quick-start), which also tracks release availability.

## Find the right documentation

- [Contributing](README.md#contributing): report bugs, suggest improvements, improve documentation or translations, and submit pull requests.
- [Technical documentation index](docs/README.md): find references by subsystem or type of change.
- [Architecture](docs/architecture-overview.md): review entry flows, ownership, and security boundaries before changing runtime code.
- [Website](site/README.md): edit copy, generate localized pages, and verify the website.
- [Releases](docs/releasing.md): build and verify release packages for Chrome Web Store submission.

## Requirements

- Use the Node.js version pinned in `.nvmrc`; run `nvm use` before npm commands to meet the toolchain requirements.
- `npm`.
- Google Chrome 116 or newer, with Developer mode and **Allow access to file URLs** enabled for the extension; see the [browser compatibility audit](docs/browser-compatibility.md).

The main runtime and build stack includes Vite 8, CRXJS, React 19, Sass, Vitest, `markdown-it`, DOMPurify, Shiki, CodeMirror 6, Mermaid, and KaTeX.

## Initial setup

```bash
nvm use
npm install
```

Check the active versions if you encounter engine or native-binding errors:

```bash
node -v
npm -v
```

## Run and load a development build

Source builds and **Load unpacked** are for development, testing, and release QA. Users install the published extension through Chrome Web Store as described in the [README](README.md#quick-start).

Start the development server:

```bash
npm run dev
```

Or continuously rebuild the extension output:

```bash
npm run watch
```

In Chrome:

1. Open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select the repository's `dist/` directory.
3. Open Markdown Plus **Details** and enable **Allow access to file URLs**.
4. Open a `.md`, `.markdown`, `.mdown`, or `.mdc` file in Chrome.

After changing an entry point, the manifest, the service worker, or a dependency, reload the extension at `chrome://extensions` and reload the file tab. HMR handles some UI updates, but it does not replace reloading for every extension entry type.

To verify a production build, run `npm run build` and reload the extension from `dist/`. Use the [release workflow](docs/releasing.md) when you need a release archive and checksum.

## Entry-point map

- **Content/Viewer:** `src/content/index.js` performs a quick `file:` and Markdown-family check, then lazy-loads `src/content/viewer-loader.js` → `src/content/bootstrap.js` → `src/viewer/app.js`.
- **Viewer React:** `src/viewer/react/mount.js` mounts `ViewerApp.jsx`; React owns chrome, panels, actions, the editor shell, and UI state, while the render pipeline owns `.mdp-markdown-body`.
- **Viewer actions and sidebars:** [`docs/document-actions.md`](docs/document-actions.md) defines the catalog, overflow, focus, and ownership; the [Viewer design system](docs/design-system/README.md#viewer) documents Outline, Porcelain toggles, and shared scrollbars.
- **Document formats:** `src/shared/file-types.js` defines activation, renderers, and capabilities; `src/viewer/documents/` owns loading, models, and the renderer registry.
- **Markdown:** `src/viewer/core/` manages the Markdown engine, Shiki, sanitization, and rendering; `src/plugins/` extends parsing and post-render behavior.
- **Explorer/navigation:** `src/viewer/explorer/` manages scans, workspaces, and sessions; `src/viewer/navigation/` classifies links and routes real `?f=` URLs.
- **Editor:** `src/viewer/editor/` contains the CodeMirror bundle, file handles, and scroll synchronization; session policy lives in `src/viewer/app/editorSessionController.js`.
- **Document updates and review:** `src/viewer/app/watchSessionController.js` coordinates polling and applying revisions, `src/viewer/navigation/reading-position.js` preserves reading position, and `src/viewer/review/` plus the `ChangeReview*` components own diffs and review UI. See the full contract in [`docs/document-updates-and-change-review.md`](docs/document-updates-and-change-review.md).
- **Popup:** `src/popup/index.jsx` mounts `PopupApp.jsx` with Recent, Reader, Editor, and Plugins panels.
- **Settings:** `src/options/index.jsx` mounts `OptionsApp.jsx` with General, Themes, Files & Workspace, Privacy & Data, Advanced, and About sections.
- **Background:** `src/background/service-worker.js` wraps responses in envelopes and forwards ordinary routes to `message-router.js`; offscreen fetch wire messages are handled separately.
- **Messaging/settings:** message types are centralized in `src/messaging/index.js`; defaults, schemas, migration, and persistence live in `src/settings/`.
- **Interface languages:** `src/i18n/` owns hierarchical message catalogs, language selection, formatting, and live updates; `public/_locales/` provides extension metadata localized by Chrome. See [Interface languages](docs/internationalization.md) and the [localization writing guide](docs/localization.md).

Viewer SCSS lives in `src/viewer/styles/**/*.scss` and is imported with `?inline` from `src/content/viewer-loader.js`. `src/content/host-print.scss` handles printing on the host page. Do not add or edit generated CSS in `dist/`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite + CRXJS development server. |
| `npm run watch` | Run a production-style build in watch mode. |
| `npm test` | Run the complete Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run build` | Build the production extension in `dist/`. |
| `npm run release` | Create a release package, archive, and checksum using the [release guide](docs/releasing.md). |
| `npm run test:release` | Run tooling tests in `scripts/__tests__/`, including release and website tests. |
| `npm run preview` | Serve the Vite build to inspect web output. |
| `npm run analyze` | Build with the bundle visualizer and generate `dist/stats.html`. |
| `npm run size:report` | Report the total size of `dist/` and its JavaScript assets. |

`vite.config.mjs` lets Vite/CRXJS split chunks, sets `base: './'` so content-script dynamic imports resolve from the extension URL, and enables the visualizer only when `ANALYZE=1` through `npm run analyze`.

## Bundle rules

- Shiki uses explicit language and theme loaders in `src/viewer/core/shiki-config.js`; do not switch to `shiki/bundle/web` or variable dynamic imports that pull in the entire catalog.
- The syntax-theme catalog exposed to custom themes lives in `src/theme/syntax-themes.js` and must match Shiki's loader map.
- Optional Emoji, Footnote, Math, and Mermaid plugins use dynamic imports when enabled. All plugins are currently enabled by default, while heavy implementations remain in lazy chunks.
- Builds emit KaTeX assets into `dist/`, but the browser fetches and evaluates KaTeX JavaScript, CSS, and fonts only when the Math plugin runs; `src/plugins/optional/math.plugin.js` injects CSS at runtime.
- CodeMirror loads only after the user enables the editor and verifies the original file to start an editing session.
- `dist/**` is generated output. Runtime source of truth is `src/**`, `manifest.json`, `vite.config.mjs`, and `package.json`.

After bundle-sensitive changes to Shiki, Mermaid, Math, the editor, plugins, or content entry points, run:

```bash
npm run build
npm run size:report
```

Use the treemap to investigate large chunks:

```bash
npm run analyze
```

## Verification by change type

| Change | Minimum verification |
| --- | --- |
| Pure logic, schemas, routes, renderers, hooks | `npm test` |
| Runtime, packages, manifest, entry points, styles | `npm test` and `npm run build` |
| Shiki, Mermaid, Math, editor, plugins, dependencies | Also run `npm run size:report` |
| Chrome APIs, file pickers, history, Back/Forward, printing/export | Load `dist/` and perform manual smoke tests |
| Watch modes, Change Review, focus/keyboard, external file reads | `npm test`, `npm run build`, and an unpacked-extension smoke test |
| Translations or another interface language | Run i18n tests, review wording by component, and inspect the UI; a new runtime locale also requires full tests, a build, and a size comparison under the [i18n guide](docs/internationalization.md#translation-review-and-verification) |
| Website content or templates | Regenerate HTML and run the [website preflight](site/README.md#preview-and-verification) |

Typical smoke-test checklist:

- Open all four supported Markdown extensions directly and confirm that other file types do not activate the Viewer directly.
- Open sibling files and workspaces, refresh scans, navigate across formats, and test filenames with spaces or Unicode plus Back/Forward for `?f=` routes.
- Collapse and resize Files and Outline independently; check the symmetric two-row headers, outer Porcelain toggle borders on both sides and in both states, command overflow after reserving the OUTLINE label, touch input, and reduced motion. Use the [sidebar/actions checklist](docs/document-actions.md#verification) for auto-hide/always-visible scrollbars, tree/heading loading, and cleanup when panels are hidden; also check Back to top, document statistics, and responsive layout.
- Enable the editor, select the correct and incorrect original files, edit, preview, and save; check unsaved-change confirmations and external-change protection.
- Exercise Document Updates in Ask, Automatic, and Off modes, visible and hidden tabs, repeated updates, empty/missing/oversized files, reading-position continuity, clean/dirty editing sessions, and Save conflicts; open Change Review and check diffs, sections, pinned review pairs, keyboard/focus behavior, and responsive layout.
- Use the [Document Updates checklist](planning/product-feature-roadmap/document-updates-manual-test.md) for fixtures, unverified Chrome cases, and the cold-start connection failure that needs reproduction. While review is open, Automatic mode can still update the article after input becomes idle; a pinned diff changes only when Review latest is selected.
- Toggle plugins, switch Mermaid renderers, open the lightbox, and try Mermaid export.
- Switch built-in and custom themes, syntax themes, and backgrounds; reload the tab to verify persistence.
- Print applicable formats, export Markdown as HTML/Word, and inspect the downloaded files.
- Check Popup recent files, Settings import/export/reset, and behavior with file URL access disabled.
- Switch languages under **Settings → General → Interface language**, test automatic, English, and Vietnamese selections, and verify synchronization across open pages. Preserve drafts, undo history, and document content; also inspect tooltips, active messages, search/replace, and file-selection prompts in the content area. Use the [i18n matrix](docs/internationalization.md#translation-review-and-verification) to cover every surface.

## Adding an interface language

Use the shared [mdp-dev-add-language](.agents/skills/mdp-dev-add-language/SKILL.md) skill, for example: “Use $mdp-dev-add-language to add Japanese to the Markdown Plus interface.” The skill covers locale integration, terminology research using tools in the target language, a complete review for meaning and natural wording, and verification. Add the new language's editorial conventions and terminology to a section in the [shared writing guide](docs/localization.md), without creating a separate Markdown file. Record each implementation's review and test results in its task or pull request. Keys are stable hierarchical identifiers; do not use English sentences as keys. For small Vietnamese wording changes, follow the [shared principles and Vietnamese section](docs/localization.md#vi) and inspect the affected components.

## Troubleshooting

### Viewer does not open local Markdown

Check that **Allow access to file URLs** is enabled in Chrome's extension Details, the extension has been reloaded, and the URL uses `file:` with a `.md`, `.markdown`, `.mdown`, or `.mdc` extension. Other formats open only through the Files explorer after the Viewer is active.

### Changes do not appear

Wait for Vite/CRXJS to finish building, reload the extension at `chrome://extensions`, and reload the local file tab. For service-worker changes, you may also need to close and reopen Popup or Settings after reloading.

If an open document's source falls behind the file on disk, check **Settings → General → Document updates**. Off mode reads only when **Check now** is selected; a workspace opened through the `webkitdirectory` fallback must be selected again because it retains only `File` snapshots, without handles for live rereads.

### The interface displays message keys

If a control displays a string such as `viewer.explorer.header.openFile`, check that the key exists in both the English catalog and the selected language, then verify that the rendering code calls `t()` or receives a message descriptor. `t()` returns the original key when no message is found; changing English wording does not register a new key.

For file-selection prompts in the content area, check that `documentSessionController.showPlaceholder()` keeps the message in `placeholderMessage` and leaves `text` empty; the renderer must switch to `DocumentState`. Do not translate the entire article to hide the problem, because real documents can contain that exact key. Regression coverage lives in `src/i18n/__tests__/localized-ui.test.js` and the document-session/Markdown-renderer tests.

### `rollupOptions` and `rolldownOptions` warnings

Vite 8 may print `Both rollupOptions and rolldownOptions were specified` from CRXJS plugins during tests or builds. This is a known plugin compatibility warning in the current configuration; check the exit code and completion message to distinguish it from an actual build failure.

### Native-binding or optional-dependency errors

These errors often occur when `node_modules` was installed under another Node version. Switch to `.nvmrc`, reinstall from the lockfile, and rebuild:

```bash
nvm use
rm -rf node_modules
npm ci
npm run build
```

Do not delete or regenerate `package-lock.json` unless intentionally updating dependencies.
