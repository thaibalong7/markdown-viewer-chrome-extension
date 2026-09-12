# Multi-format Viewer Architecture

Status: Implemented — Phases 0–7 complete  
Scope: `.md`, `.markdown`, `.mdown`, `.mdc`, `.txt`, `.mermaid`, raster images, and `.svg`  
Implementation strategy: incremental; each phase must be independently reviewable and releasable

## 1. Product goal

Evolve Markdown Plus from an application that assumes every open document is Markdown into a local-file viewer with format-specific renderers, while preserving the current Markdown experience and keeping future formats inexpensive to add.

The first release supports:

- Markdown family: `.md`, `.markdown`, `.mdown`, and `.mdc`
- Plain text: `.txt`
- Mermaid source: `.mermaid`
- Raster images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.bmp`, `.ico`, and `.apng`
- Vector image: `.svg`

The extension continues to be local-file-first. No new host permission is required by this design.

## 2. Product behavior

### 2.1 Activation rule

Only Markdown-family files activate the extension when opened directly as a `file:` URL:

| File type | Direct `file:` URL activates viewer | Listed in Files explorer | Opens inside active viewer |
| --- | ---: | ---: | ---: |
| `.md`, `.markdown`, `.mdown` | Yes | Yes | Yes |
| `.mdc` | Yes | Yes | Yes |
| `.txt` | No | Yes | Yes |
| `.mermaid` | No | Yes | Yes |
| Raster image | No | Yes | Yes |
| `.svg` | No | Yes | Yes |

Keeping `.markdown` and `.mdown` as activating extensions preserves the current behavior. “Markdown-family” below refers to all four Markdown extensions unless stated otherwise.

The practical consequence of this rule is intentional: if a user opens `README.md`, then selects `notes.txt` from the Files explorer, `notes.txt` is shown inside the existing viewer. If that tab is reloaded while its URL points at `notes.txt`, Chrome shows its native/raw behavior because `.txt` is not an activation format.

### 2.2 Format behavior

| Format | Default view | Alternate view | Outline | Edit | Markdown HTML/Word export |
| --- | --- | --- | ---: | ---: | ---: |
| Markdown family | Parsed Markdown | Existing editor modes | Yes | Yes for writable local files | Yes |
| `.txt` | Raw text in a `<pre>` | None | No | No in the first release | No |
| `.mermaid` | Rendered diagram | Raw Mermaid source | No | No in the first release | No |
| Raster image | Contained image view with existing zoom/lightbox behavior | None | No | No | No |
| `.svg` | Image view | None; raw SVG is never exposed as markup | No | No | No |

Print can remain available for all rendered formats after it is verified format by format. Format-specific actions must be driven by capabilities rather than by URL checks.

### 2.3 Mermaid behavior

- A `.mermaid` document opens in rendered mode.
- A single accessible toggle in the document action rail switches between “View source” and “View diagram”.
- Raw mode uses `textContent` in a `<pre><code>` block. It does not pass through Markdown or `innerHTML`.
- Standalone Mermaid is a document capability, so it renders even when the optional Mermaid-in-Markdown plugin is disabled.
- Standalone Mermaid and Mermaid fenced blocks share one lazy-loaded rendering service, sanitizer, theme mapping, error presentation, lightbox, and export actions.
- A render failure shows a safe error plus the original source and leaves the source-copy action available.

### 2.4 Image behavior

- Images use `object-fit: contain`, preserve intrinsic aspect ratio, and never upscale unless the user enters the existing lightbox.
- Raster formats and SVG may share most UI, but SVG remains a separate registered format so its security policy and future behavior cannot accidentally drift with raster images.
- SVG bytes are never assigned to `innerHTML` and are never mounted as inline SVG. A local `file:` URL or a temporary object URL is assigned to an `<img src>`.
- Animated formats such as GIF and APNG remain animated.
- Unsupported or corrupt images render an accessible error state with the file name.

## 3. Current architectural pressure points

The current runtime is cleanly layered, but document type is implicit and fixed to Markdown in several ownership areas:

- `src/content/index.js` and `src/content/bootstrap.js` own the Markdown-only activation gate.
- `src/shared/markdown-detect.js` is also used as an explorer extension allowlist.
- sibling, recursive, directory-handle, and `webkitdirectory` scanners independently filter Markdown extensions.
- `MarkdownViewerApp` stores `this.markdown` rather than a current-document object.
- `createRenderController()` always calls `renderDocument()` and always builds a Markdown TOC.
- explorer navigation always loads text and calls `setMarkdown()`.
- link resolution classifies every non-Markdown local target as an asset that should not be intercepted.
- React shell actions infer editing and exporting availability from `file:` rather than document capabilities.
- workspace virtual readers can return a `File`, which is already sufficient for both text and binary/object-URL loading, but the navigation layer currently always calls `.text()`.

Adding one conditional for every new format in each of these places would make later formats expensive and error-prone. The solution is one lightweight file-type registry, one document loading boundary, and renderer adapters behind a stable contract.

## 4. Target architecture

```text
                     lightweight metadata only
file URL/name ───────> file-type registry
       │                │              │
       │                ├─ activation  ├─ explorer inclusion/icons
       │                └─ capabilities└─ loader/renderer ids
       │
       ▼
document navigator ──> document loader ──> loaded document
                                                │
                                                ▼
                                      document render controller
                                                │
                         ┌──────────────────────┼──────────────────────┐
                         ▼                      ▼                      ▼
                  Markdown handler        text/Mermaid handlers   image/SVG handlers
                         │                      │                      │
             existing sanitized path    safe DOM/shared engine       `<img>` only
                         │                      │                      │
                         └──────────────────────┼──────────────────────┘
                                                ▼
                                  existing light-DOM article host
                                                │
                                                ▼
                                  React chrome reads capabilities
```

### 4.1 Lightweight file-type registry

Proposed source: `src/shared/file-types.js`.

This module is safe for the thin content-script gate to import. It contains metadata and pure path/name classification only; it must not statically import React, Mermaid, Shiki, DOMPurify, or a renderer.

Suggested descriptor shape:

```js
{
  id: 'mermaid',
  extensions: ['mermaid'],
  activation: 'explorer-only', // or 'direct'
  contentKind: 'text',         // 'text' | 'image'
  rendererId: 'mermaid',
  capabilities: {
    outline: false,
    edit: false,
    exportDocument: false,
    print: true,
    viewModes: ['rendered', 'raw'],
    zoom: true
  }
}
```

Required pure APIs:

```js
getFileTypeFromName(name)
getFileTypeFromUrl(url)
isDirectActivationUrl(url)
isExplorerSupportedFile(nameOrUrl)
getDocumentCapabilities(fileTypeId)
```

Classification rules:

- case-insensitive extensions;
- ignore query and fragment when classifying a real URL;
- decode only for display, not before URL parsing;
- reject directories, extensionless files, non-`file:` external URLs, and unknown extensions;
- virtual workspace URLs carry the original encoded relative filename and use the same classifier;
- the registry is the only durable extension allowlist.

Adding a future format should normally require one descriptor, one lazily loaded renderer, styles, and focused tests—not edits to every scanner and navigation branch.

### 4.2 Document model

Replace the implicit `markdown + currentFileUrl` pair with an explicit current document. Keep serializable identity separate from temporary runtime resources.

```js
// Stable document identity and UI state
{
  href: 'file:///project/diagram.mermaid',
  displayName: 'diagram.mermaid',
  fileTypeId: 'mermaid',
  sourceKind: 'file-url', // 'file-url' | 'workspace-file'
  viewMode: 'rendered'
}

// Loaded payload owned by the document session
{
  document: { /* identity above */ },
  text: 'flowchart LR ...', // text types only
  assetUrl: null,           // image types only
  revokeAssetUrl: null      // present for object URLs
}
```

Do not place object URLs, `File`, or `FileSystemFileHandle` objects in React state or history state. The document session owns them and revokes temporary URLs on navigation, failed load, and `destroy()`.

The initial document constructed by bootstrap is a Markdown-family document whose `text` comes from the current extraction flow.

### 4.3 Document loader

Proposed source: `src/viewer/documents/document-loader.js`.

Contract:

```js
loadDocument({ href, fileType, workspaceReader, signal })
  -> Promise<LoadedDocument>
```

Behavior:

- text-backed real `file:` documents reuse `FETCH_FILE_AS_TEXT`;
- text-backed virtual documents call `File.text()` or `handle.getFile().text()`;
- real `file:` images use the normalized `file:` URL directly as `<img src>`;
- virtual images call `getFile()` if needed, validate the registered format/MIME, and create an object URL;
- abort or supersede stale loads so a slower file cannot replace a newer selection;
- distinguish empty text from load failure; an empty `.txt` is valid;
- return user-safe errors without logging file contents.

The initial implementation does not need a new binary background message. If manual Chrome validation shows that direct local image URLs cannot load in the mounted file page, add a narrowly scoped `FETCH_FILE_AS_BLOB`/data transport in a later patch, with file-size limits and tests; do not overload the text route.

### 4.4 Document renderer registry

Proposed source: `src/viewer/documents/renderer-registry.js`.

The registry maps `rendererId` to a dynamic import. This preserves the cheap activation gate and avoids putting Mermaid code on the startup path for Markdown files without Mermaid content.

```js
const rendererLoaders = {
  markdown: () => import('./renderers/markdown-document-renderer.js'),
  text: () => import('./renderers/text-document-renderer.js'),
  mermaid: () => import('./renderers/mermaid-document-renderer.js'),
  image: () => import('./renderers/image-document-renderer.js')
}
```

Each renderer implements:

```js
render({ loadedDocument, articleEl, settings, services, signal })
  -> Promise<{
       tocItems?: Array,
       cleanup?: () => void,
       interactionProfile?: 'markdown' | 'image' | 'none'
     }>
```

Rules for the contract:

- a renderer owns only the article subtree, never the React chrome;
- the render controller invokes the previous renderer's cleanup before replacing content;
- asynchronous render completion is protected by the existing render token plus an `AbortSignal`;
- renderers use DOM APIs and `textContent` by default;
- only the Markdown renderer may use the existing sanitized `renderIntoElement()` boundary;
- Mermaid SVG goes through the shared Mermaid SVG sanitizer before insertion;
- the handler result, not a DOM rescan, decides whether an outline is available.

### 4.5 Preserve the Markdown pipeline

The Markdown adapter must delegate to the current sequence unchanged:

```text
renderDocument()
  -> plugin preprocess
  -> markdown-it
  -> plugin HTML postprocess
  -> sanitizeHtml()
  -> renderIntoElement()
  -> plugin afterRender
  -> image preparation
  -> TOC hydration
```

`.mdc` selects this exact adapter. There is no second parser, special frontmatter parser, or alternate sanitizer.

During migration, `MarkdownViewerApp` can retain compatibility accessors such as `getMarkdown()` internally, but document identity and format decisions must come from the current document. Compatibility accessors should be removed once the editor has been moved to document capabilities.

### 4.6 Shared Mermaid engine

The current Mermaid plugin mixes reusable diagram rendering with Markdown-fence discovery and plugin lifecycle work. Extract only the reusable parts to a format-neutral module, for example:

```text
src/viewer/mermaid/
  mermaid-render-service.js
  mermaid-sanitizer.js
  mermaid-error-view.js
```

The optional Markdown plugin remains responsible for:

- locating and hoisting `language-mermaid` fences;
- lazy intersection observation inside Markdown;
- plugin lifecycle integration.

The shared service becomes responsible for:

- lazy import and initialization of official/beautiful Mermaid renderers;
- theme/options resolution;
- rendering one source string into a supplied node;
- SVG sanitization;
- safe error output;
- reusable chart actions/lightbox attachment.

The standalone renderer calls the same service directly for its one document-level chart. This avoids generating fake fenced Markdown and prevents the standalone format from depending on whether a Markdown plugin is enabled.

### 4.7 Document session controller

Proposed source: `src/viewer/app/documentSessionController.js`.

It owns:

- current document identity and loaded payload;
- navigation/load cancellation;
- render-mode changes such as Mermaid rendered/raw;
- cleanup of object URLs and renderer resources;
- title and current-file updates;
- capability publication to the React shell;
- coordination with the existing editor session for Markdown-family files.

Explorer navigation changes from `setMarkdown() + render()` to one bridge call:

```js
openDocument(href, { hash, replaceHistory, forceReload })
```

This is the key boundary that keeps explorer code format-agnostic.

### 4.8 Capability-driven React chrome

Publish a small `documentUiState` to the React mount:

```js
{
  displayName,
  fileTypeId,
  capabilities,
  viewMode,
  loading,
  error
}
```

React behavior:

- Outline is visible only when both reader settings and `capabilities.outline` allow it.
- Edit/save/focus are visible only when `capabilities.edit` and the current source are writable.
- HTML/Word export appears only for `capabilities.exportDocument`.
- Mermaid mode toggle appears only when multiple `viewModes` are registered.
- Copy link, Files panel, and refresh remain generic where the backing source supports them.
- Labels say “Files” and “supported files”, not “Markdown files”.

This keeps current layout ownership intact: React continues to own chrome, while renderer adapters imperatively own the article subtree.

### 4.9 Explorer and workspace changes

All four scan paths must use `isExplorerSupportedFile()`:

1. same-folder sibling scan;
2. recursive `file:` directory listing scan;
3. File System Access directory-handle scan;
4. `webkitdirectory` file-list scan.

Explorer file nodes should include `fileTypeId`. This supports type-specific icons and avoids reclassifying names in every component.

Rename Markdown-specific helpers and UI copy as they are touched:

- `countMarkdownFilesInTree` -> `countViewableFilesInTree`;
- `pruneExplorerFoldersWithoutMarkdown` -> `pruneExplorerFoldersWithoutViewableFiles`;
- `injectCurrentMarkdownAtRootIfMissing` -> `injectCurrentDocumentAtRootIfMissing`;
- `markdownFileTitleFromUrl` -> `documentTitleFromUrl`;
- “No markdown files…” -> “No supported files…”.

The scan file limit counts every supported file. `.gitignore`, hidden-file filtering, depth limits, cancellation, virtualization, active-row reveal, and expanded-state persistence remain unchanged.

### 4.10 Navigation and history

Generalize the resolver from Markdown targets to supported document targets:

```text
same-document hash
self link
supported document (real file)
supported document (virtual workspace)
external
unhandled asset
unsafe/unsupported
```

Regular Markdown links to a supported local document may open it inside the active viewer. Embedded Markdown images remain embedded images and are not intercepted as document navigation.

For a real `file:` target, keep the current `pushState`/`replaceState` best-effort behavior. Back/forward should call `openDocument()` and re-resolve the file type. Virtual workspace documents remain session-only and do not pretend to be browser-loadable URLs.

Only direct-activation Markdown-family URLs are recorded in the existing popup file history for the first release. This preserves the promise that history entries can bootstrap the viewer when opened in a new tab. A separate “recent documents inside viewer” feature can be designed later if needed.

## 5. Proposed module map

Names may be adjusted during implementation, but ownership should remain equivalent.

```text
src/shared/
  file-types.js                         # pure registry and classification

src/content/
  index.js                              # calls isDirectActivationUrl()
  bootstrap.js                          # creates initial LoadedDocument
  raw-content-extractor.js              # generalized text naming, same behavior

src/viewer/documents/
  document-loader.js                    # text/file/object-URL loading
  document-errors.js                    # normalized safe errors
  renderer-registry.js                  # lazy renderer lookup
  renderers/
    markdown-document-renderer.js       # adapter over existing renderer
    text-document-renderer.js           # DOM + textContent
    mermaid-document-renderer.js        # rendered/raw modes
    image-document-renderer.js          # raster and SVG through <img>

src/viewer/mermaid/
  mermaid-render-service.js             # extracted shared rendering core
  mermaid-sanitizer.js
  mermaid-error-view.js

src/viewer/app/
  documentSessionController.js          # current doc, load, mode, cleanup
  renderController.js                   # format dispatch and render race safety

src/viewer/react/
  ...                                   # consumes documentUiState/capabilities
```

Do not move all existing Mermaid code or rename every Markdown symbol in one patch. Extract only what the next phase consumes, then prune obsolete compatibility names after behavior is covered.

## 6. Security, reliability, and performance constraints

### 6.1 Security invariants

- Only registered extensions are loadable through internal document navigation.
- Real internally loaded documents must remain `file:` URLs; virtual ones must exist in the active workspace reader map.
- Markdown keeps the existing DOMPurify boundary.
- Plain text and raw Mermaid use `textContent` only.
- Mermaid SVG is sanitized by the shared sanitizer.
- Source SVG is displayed as an image resource, never injected as DOM markup.
- No renderer may add untracked global listeners; cleanup is mandatory.
- Logs include format and URL metadata only, never full document source.

### 6.2 Resource lifecycle

- Abort previous document loads and ignore stale render completions.
- Revoke virtual image object URLs when leaving a document or destroying the app.
- Disconnect Mermaid observers/lightboxes/actions during renderer cleanup.
- Close the generic image lightbox on document changes.
- Keep `MarkdownViewerApp.destroy()` idempotent.

### 6.3 Bundle discipline

- The content entry imports only lightweight registry metadata.
- Mermaid remains dynamically imported.
- Image and text handlers should be small chunks or may be statically grouped if the production size report proves that is cheaper.
- Run `npm run size:report` before and after the Mermaid extraction and document-renderer rollout.

### 6.4 Large files

Before final hardening, define explicit limits and error states rather than silently truncating:

- retain current Markdown extraction behavior until a dedicated limit migration is approved;
- reject or warn on unexpectedly large standalone text/Mermaid files;
- do not base64-encode real local images unless a tested browser limitation requires it;
- rely on browser image decoding and show a load error rather than reading full image bytes into JavaScript memory.

## 7. Incremental implementation plan

Every phase below should be a separate focused change. Do not begin a later phase until the previous phase's automated checks and listed manual smoke tests pass.

### Phase 0 — Characterization tests and fixtures

Goal: lock down existing Markdown behavior before changing ownership.

Work:

- add small local fixtures for Markdown navigation, empty content, Unicode/spaces, and workspace virtual files;
- add characterization tests for direct activation, extension matching, sibling/workspace filtering, current navigation, capability visibility assumptions, and cleanup;
- capture baseline `npm run size:report` output.

Exit criteria:

- no production behavior changes;
- `npm test` and `npm run build` pass;
- current Markdown direct-open, sibling navigation, editor, TOC, Mermaid fence, refresh, and Back/Forward smoke tests pass.

### Phase 1 — File-type registry and `.mdc`

Goal: establish one extension source of truth and deliver the lowest-risk new format.

Work:

- add the lightweight registry and pure tests;
- migrate activation and all explorer scan filters to registry APIs;
- register `.mdc` as Markdown-family with direct activation;
- make `.mdc` use the existing Markdown parser, plugins, sanitizer, outline, editor, and save filename handling;
- add file type metadata to explorer nodes while keeping the current icon initially;
- preserve `.md`, `.markdown`, and `.mdown` behavior.

Exit criteria:

- opening `.mdc` directly mounts the viewer;
- `.mdc` appears in sibling, recursive, directory-handle, and `webkitdirectory` scans;
- `.mdc` renders identically to the same bytes saved as `.md`;
- unknown extensions remain excluded;
- unit tests, build, and a real Chrome `.mdc` smoke test pass.

### Phase 2 — Document model and Markdown renderer adapter

Goal: remove the app-level assumption that every future document is a Markdown string without changing visible Markdown behavior.

Work:

- introduce current-document identity, document UI state, renderer registry, and document session controller;
- wrap the existing Markdown render pipeline in the Markdown document renderer;
- replace explorer bridge `setMarkdown() + render()` with `openDocument()`;
- publish capabilities to React and gate current actions through them;
- keep editor integration limited to Markdown-family documents;
- add render-race, cleanup, navigation, action-visibility, and destroy tests.

Exit criteria:

- no intentional UI or Markdown output change;
- stale navigation cannot overwrite the latest document;
- editor dirty state is safely resolved before switching documents;
- all existing tests plus `npm run build` pass.

This is an architectural phase and should not be combined with a new renderer.

### Phase 3 — Plain `.txt` viewer

Goal: validate the generic text loader and safe non-Markdown DOM rendering.

Work:

- register `.txt` as explorer-only;
- add the raw text renderer using `<pre><code>` and `textContent`;
- include `.txt` in every explorer scan path and generic navigation resolver;
- provide empty, loading, error, long-line, Unicode, and large-file states;
- hide outline, edit, and Markdown export for `.txt`.

Exit criteria:

- `.txt` never auto-activates when opened directly;
- selecting a `.txt` from an active viewer shows byte-equivalent decoded text with whitespace preserved and no Markdown parsing;
- HTML-looking text is displayed, not executed;
- refresh and Markdown -> text -> Markdown navigation work.

### Phase 4 — Raster image viewer

Goal: validate non-text loading and resource cleanup before SVG is admitted.

Work:

- register the raster extension allowlist as explorer-only;
- add image renderer states and reuse the existing image lightbox;
- use direct local URLs for real files and object URLs for virtual `File`/handle sources;
- revoke object URLs on navigation/destroy;
- add type-aware explorer icon/label support.

Exit criteria:

- all registered raster formats appear in all scan modes;
- real and virtual images render with correct aspect ratio;
- corrupt/missing images show a safe error;
- repeated navigation does not leak object URLs or lightbox listeners;
- direct image tabs remain native Chrome image tabs.

### Phase 5 — SVG image viewer

Goal: add SVG with an explicit stricter security contract.

Work:

- register `.svg` separately as explorer-only;
- route it through the image renderer's `<img>` resource path;
- add tests proving source SVG is never passed to `innerHTML` and no raw-mode capability exists;
- manually test SVGs containing scripts, event attributes, external references, broken XML, large viewboxes, and no intrinsic dimensions.

Exit criteria:

- SVG displays as an image in both real and virtual workspaces;
- there is no raw/source toggle;
- script-bearing SVG content does not become executable DOM in the viewer;
- direct `.svg` tabs remain handled by Chrome.

### Phase 6 — Standalone `.mermaid` viewer and raw toggle

Goal: add the most behavior-rich new renderer after the generic boundaries are proven.

Work:

- extract the reusable Mermaid service from the optional Markdown plugin with parity tests;
- register `.mermaid` as explorer-only;
- implement standalone rendered mode, safe error state, and raw mode;
- add the capability-driven action-rail toggle;
- retain lazy loading and theme updates;
- ensure changing renderer/theme or document cancels/cleans the previous render.

Exit criteria:

- standalone `.mermaid` renders even when Mermaid-in-Markdown is disabled;
- the toggle is keyboard-accessible, accurately reports pressed/mode state, and does not lose source;
- Mermaid fenced blocks in Markdown retain lazy render, actions, lightbox, export, renderer preference, and error behavior;
- malformed Mermaid is recoverable through raw view;
- tests, build, real Chrome smoke tests, and size comparison pass.

### Phase 7 — Integrated navigation and product polish

Goal: make the multi-format experience consistent after every renderer is stable.

Work:

- finish generic internal-link interception for supported document targets;
- verify refresh, active file, folder switching, Back/Forward, and return-to-original behavior across type changes;
- replace remaining user-facing “Markdown files” copy where it refers to the generic explorer;
- finalize per-type icons, loading/empty/error states, mobile layout, print visibility, and keyboard focus restoration;
- update `README.md` and `docs/project-overview-for-ai.md` to reflect the implemented architecture;
- remove temporary Markdown-only compatibility adapters that are no longer used.

Exit criteria:

- the complete format matrix passes in sibling, recursive real workspace, directory-handle workspace, and `webkitdirectory` workspace modes;
- no action appears for a capability the current document does not support;
- `npm test`, `npm run build`, and `npm run size:report` pass with reviewed output;
- extension reload/reinjection and app teardown leave no duplicated UI or listeners.

## 8. Test matrix

### 8.1 Automated tests

- registry classification: case, Unicode, encoded spaces, query/hash, virtual URLs, unknown types, directories;
- scanner parity: every scan path includes exactly the registered explorer formats;
- activation: only registered `activation: 'direct'` types pass the thin gate;
- loader: real text response, virtual `File`, virtual handle, object URL creation/revocation, abort, empty file, load error;
- renderer dispatch and cleanup;
- Markdown `.md`/`.mdc` output parity;
- TXT HTML/script-like strings remain text;
- SVG renderer never receives/inserts source markup;
- Mermaid rendered/raw transitions, failure fallback, and stale-render cancellation;
- capability-driven outline/editor/export/toggle visibility;
- cross-format navigation, refresh, current-file highlighting, and history behavior.

### 8.2 Manual Chrome matrix

For each supported format, test:

- normal filename, uppercase extension, spaces, percent characters, and Unicode;
- same-folder explorer;
- recursive `file:` workspace;
- folder picker returning handles;
- `webkitdirectory` fallback;
- light and dark themes;
- missing/deleted file followed by refresh;
- rapid switching among large files;
- extension disable/enable and extension reload;
- “Allow access to file URLs” disabled, then enabled.

Additional Mermaid cases: valid chart, invalid chart, both renderers, raw toggle, export, lightbox.  
Additional image cases: portrait, panorama, tiny image, transparency, animation, corrupt bytes.  
Additional SVG cases: script/event payload, external resource reference, no dimensions, huge viewbox.

## 9. Explicit non-goals for the first rollout

- auto-activating `.txt`, `.mermaid`, image, or `.svg` tabs;
- a generic code editor for `.txt` or `.mermaid`;
- inline execution or raw DOM display of source SVG;
- arbitrary MIME sniffing or showing every unknown file;
- PDF, audio, video, office documents, or source-code formats;
- remote HTTP(S) document takeover;
- changing the current Markdown parser or Markdown plugin semantics;
- redesigning the viewer shell while adding format support.

Inline relative assets inside a virtual folder-picker Markdown document are a related but distinct concern. The new document loader/object-URL ownership makes a later asset resolver possible, but that behavior should receive its own phase and tests instead of being hidden inside the standalone image work.

## 10. Future extension recipe

After the architecture is in place, a new format should follow this checklist:

1. Add a registry descriptor with explicit activation, content kind, renderer id, and capabilities.
2. Add or reuse a document loader strategy.
3. Add a lazy renderer that obeys cleanup and DOM-safety contracts.
4. Add format styles under `src/viewer/styles/**/*.scss`.
5. Add an icon/label only through registry metadata or a centralized presentation map.
6. Test every explorer source, navigation, failure, teardown, and capability state.
7. Run tests, production build, and size report when the renderer is bundle-sensitive.
8. Update the project overview when the runtime ownership boundary actually changes.

This keeps extension classification, discovery, loading, rendering, and UI policy connected by contracts without coupling their implementations.

## 11. Recommended first implementation slice

Start with Phase 0 and Phase 1 only. They create the regression safety net, centralize extension knowledge, and ship `.mdc` through the already-proven Markdown path. Do not begin the document-renderer refactor or `.txt` in that same change. This gives the next review a stable baseline for judging the architectural migration independently from new rendering behavior.
