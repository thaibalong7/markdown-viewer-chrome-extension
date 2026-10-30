# Markdown Plus — Theme System

This is the complete technical guide to the current Markdown Plus theme system for maintainers, contributors, and AI coding agents. It describes the implementation in source code, rather than a roadmap. If documentation conflicts with runtime code, follow `src/**` and update the documentation in the same change.

Read this alongside the [Architecture Overview](./architecture-overview.md) to understand themes within the extension. This guide covers theme details; the Architecture Overview documents system-wide ownership and runtime flows.

## 1. Product goals and principles

A Markdown Plus theme is a complete visual definition. Each theme owns its interface colors, the theme used for code highlighting, and its own background scene.

The system distinguishes two kinds of themes:

- Built-in themes are packaged with the extension, defined in source code, and read-only for users.
- Custom themes are created, named, recolored, configured with backgrounds, and saved by users in Settings.

Settings owns theme authoring. Popup selects existing themes, including built-in themes and saved custom themes. Popup has no color, gradient, or background-image inputs.

The following invariants apply:

- Backgrounds belong to individual themes, rather than a global appearance setting.
- `theme.activeId` identifies the active theme.
- Built-in and custom themes pass through the same resolution step before the Viewer uses them.
- Custom themes inherit non-editable tokens from a built-in `baseId`; the default Shiki theme follows that base but can be overridden with an allowlisted bundled syntax theme.
- Settings can synchronize through `chrome.storage.sync`, while custom-theme binary image assets stay in IndexedDB on the current device.
- Settings do not accept arbitrary CSS, inline SVG, or remote image URLs.

## 2. Source map

| Responsibility | Primary source |
| --- | --- |
| Built-in palettes, registry, theme resolution, CSS variables | `src/theme/index.js` |
| File identity hues and light/dark shades, published as `--mdp-file-icon-*` by `createStyleVars()` | `src/shared/icons/file-type-colors.js` |
| Selectable syntax-theme catalog and base mappings | `src/theme/syntax-themes.js` |
| Background types and descriptor-to-scene resolution | `src/theme/backgrounds.js` |
| Client for background-service image asset management | `src/theme/theme-asset-client.js` |
| Default settings and settings version | `src/settings/default-settings.js` |
| Validation and normalization | `src/settings/settings-schema.js` |
| Migration, merge, save, reset | `src/settings/settings-service.js` |
| Sync index, theme records, byte budget, and completeness | `src/settings/settings-storage-format.js` |
| Chrome storage, local recovery cache, and record cleanup | `src/settings/settings-storage.js` |
| Settings UI for custom-theme management | `src/options/sections/ThemeSettings.jsx` |
| Dedicated custom-theme editor | `src/options/sections/ThemeEditor.jsx`, `ThemeColorFields.jsx`, `ThemeBackgroundFields.jsx` |
| Live miniature Viewer preview for theme authoring | `src/options/sections/ThemePreview.jsx` |
| Theme and image asset save workflow | `src/options/hooks/useSettingsForm.js` |
| Popup theme selector | `src/popup/panels/ReaderPanel.jsx` |
| Background asset IndexedDB service | `src/background/theme-asset-service.js` |
| Settings and asset message routes | `src/background/message-router.js` |
| Message types and caller wrappers | `src/messaging/index.js` |
| Validate/read/parse image | `src/shared/background-image.js` |
| Background resolution and rendering in the Viewer | `src/viewer/react/components/BackgroundScene.jsx` |
| Scene placement in the shell and glass-surface activation | `src/viewer/react/components/ViewerShell.jsx` |
| Scene CSS, animation, and print behavior | `src/viewer/styles/_background-scene.scss` |
| Surface transparency with visual backgrounds | `src/viewer/styles/layout.scss` |
| Applying CSS variables to the Viewer | `src/viewer/app/viewerStyles.js` |
| Choosing style-only updates or full renders | `src/shared/settings-diff.js` |
| Shiki mappings and bundled theme loaders | `src/viewer/core/shiki-config.js` |
| Mermaid theme variables | `src/viewer/mermaid/mermaid-render-service.js` |
| Live settings broadcasts to the content script | `src/content/viewer-loader.js` |

For theme changes, read `src/theme/index.js` → `src/theme/backgrounds.js` → `src/settings/settings-schema.js` → the affected UI surface or renderer. For data-structure changes, also read `src/settings/settings-service.js` to determine whether migration and a version bump are needed.

## 3. Persisted settings model

Theme settings currently use schema version `2`, with this minimal shape:

```js
{
  theme: {
    activeId: 'light',
    customThemes: []
  },
  version: 2
}
```

`DEFAULT_SETTINGS` lives in `src/settings/default-settings.js`. The public schema and JSON export remain at version `2`, with inline `theme.customThemes`. Storage format `1` splits data into the `mdViewer.settings.index.v1` index and individual `mdViewer.theme.<sha256>` descriptors; the index contains preferences, `theme.activeId`, theme references in library order, and previous-generation references. The reader verifies record completeness and hashes before reconstructing settings, then runs migration → default merging → safe normalization.

`settingsService` prefers `chrome.storage.sync` and uses `chrome.storage.local` as the backend only when the sync API is unavailable. Quota or write-rate errors do not switch backends automatically. Save/import checks byte sizes for keys, JSON, envelopes, individual items, total storage, and item counts, including legacy/obsolete records and other quota-consuming data. Estimates account for UTF-8, Chromium escaping, and number-representation overhead; Chrome API errors are still handled because preflight cannot lock out other writers. Binary image assets remain in IndexedDB, outside theme records and the cache.

Legacy `mdViewer.settings` remains readable through version 1/2 migration. The first successful save/reset publishes the new format; the legacy key is retired only after successful readback. Read/merge/write/reset operations are serialized in the service worker so partial saves on the same device do not overwrite each other. Post-commit cleanup keeps current and previous-generation references and deletes only adapter records observed before the commit; it does not use `storage.clear()` or remove recent history. Cleanup/cache/notification failures after persistence are logged, rather than reported as false save failures that would make the UI roll back an already-referenced image.

The local key `mdViewer.settings.lastComplete.v1` stores the latest complete snapshot for the sync backend. If the index or referenced records arrive out of order, Settings/Popup warn through the shared Notice and the Viewer uses a warning Toast; the cached snapshot remains readable, but save/reset is blocked until current data is complete. A new device without a valid cache receives an explicit load error and does not write defaults to remote storage. A late-deleted record can be restored from cache when its content exactly matches the hash referenced by the index; an old cache never overwrites the index. The background observer receives `storage.onChanged` and broadcasts only validated snapshots. Concurrent edits on two devices have no application-level merge or transaction; a resolved `sync.set()` does not confirm that another device has finished synchronizing.

### `theme.activeId`

`activeId` must reference one of two kinds of IDs:

- An existing key in `BUILT_IN_THEMES`, such as `light`, `dark`, or `aurora-glass`.
- An existing `id` in `theme.customThemes`.

When loading with `invalid: 'default'`, a missing active ID falls back to `light`. During ordinary saves, a missing active ID raises `SettingsValidationError`.

### `theme.customThemes`

Each custom theme has this shape:

```js
{
  id: 'custom:midnight-1234',
  name: 'Midnight',
  baseId: 'dark',
  syntaxThemeId: null,
  colors: {
    background: '#101827',
    surface: '#172033',
    panelBg: '#111827',
    text: '#f8fafc',
    bodyText: '#e2e8f0',
    heading: '#ffffff',
    muted: '#94a3b8',
    border: '#334155',
    codeBg: '#0f172a',
    codeText: '#e2e8f0',
    link: '#67e8f9',
    accent: '#c4b5fd'
  },
  background: {
    type: 'gradient',
    startColor: '#101827',
    endColor: '#312e81',
    angle: 135,
    motion: 'system',
    overlayOpacity: 0.1
  }
}
```

Field meanings:

| Field | Meaning |
| --- | --- |
| `id` | Stable identity for selecting, updating, and deleting a theme. Do not use `name` as identity. |
| `name` | User-defined display name, 1–48 characters after trimming. |
| `baseId` | Built-in theme supplying non-overridden tokens and the Shiki fallback when no syntax override is set. |
| `syntaxThemeId` | `null` to follow the `baseId` Shiki mapping, or the ID of one of 30 bundled syntax themes. |
| `colors` | Editable semantic color overrides. Persisted data may be sparse. |
| `background` | Structured descriptor for this theme's background scene. |

Custom theme IDs must match `^custom:[a-z0-9][a-z0-9-]{7,127}$`. `createCustomThemeDraft()` generates an ID with `crypto.randomUUID()` when available, or falls back to a timestamp and random value. New drafts set `syntaxThemeId: null` to follow the base; older theme data without this field normalizes to the same behavior.

At most 32 custom themes are accepted. IDs must be unique within `customThemes`.

## 4. Built-in theme model

Built-in themes are defined in `src/theme/index.js` through three layers:

1. Palette constants such as `LIGHT_THEME_COLORS`, `DARK_THEME_COLORS`, and `AURORA_GLASS_THEME_COLORS`.
2. `BUILT_IN_THEMES`, which maps built-in IDs to palettes.
3. `BUILT_IN_THEME_DEFINITIONS`, the complete registry of `id`, `name`, `colors`, and `background`.

A resolved built-in theme has this shape:

```js
{
  id: 'aurora-glass',
  name: 'Aurora Glass',
  source: 'built-in',
  baseId: 'aurora-glass',
  syntaxThemeId: 'night-owl',
  colors: { /* full semantic palette */ },
  background: {
    type: 'gradient',
    variant: 'aurora',
    motion: 'system',
    overlayOpacity: 0.08
  }
}
```

Current built-in themes:

| Id | Label |
| --- | --- |
| `light` | Light |
| `high-contrast-light` | High Contrast Light |
| `dark` | Dark |
| `high-contrast-dark` | High Contrast Dark |
| `sakura` | Sakura |
| `matcha` | Matcha |
| `solarized-dark` | Solarized Dark |
| `vscode-dark` | Dark (VS Code) |
| `dracula` | Dracula |
| `gruvbox` | Gruvbox |
| `night-owl` | Night Owl |
| `min-dark` | Min (Dark) |
| `aurora-glass` | Aurora Glass |

Each built-in theme has its own background descriptor. Currently, `aurora-glass` uses the `aurora` gradient preset; the others use `DEFAULT_THEME_BACKGROUND`, with `type: 'none'`.

Architecturally, built-in themes can use `none`, `solid`, or `gradient`, just like custom themes, through registry descriptors. Packaged built-in images and animated images are not fully supported at the time of writing; the image renderer currently loads only IndexedDB `assetId` values. The [packaged-image extension section](#19-supporting-packaged-images-for-built-in-themes) below describes how to add packaged assets.

Built-in themes cannot be edited directly in Settings. Users create and edit custom themes based on a built-in theme. This keeps the built-in registry stable and makes migration and fallback behavior predictable.

## 5. Palettes and semantic color tokens

Palettes use semantic names rather than component-specific names. A complete built-in palette currently contains these token groups:

| Group | Tokens |
| --- | --- |
| Color scheme | `colorScheme` |
| Backgrounds and surfaces | `background`, `surface`, `panelBg`, `panelStrong` |
| Text | `text`, `bodyText`, `heading`, `muted` |
| Border | `border`, `borderStrong` |
| Code | `codeBg`, `codeText` |
| Links and accents | `link`, `linkSoft`, `accent`, `accentSoft` |
| Warning and danger | `warning`, `warningSoft`, `danger` |
| Table | `tableBorder`, `tableHeaderBg`, `tableRowAltBg` |
| Toast info | `toastInfoBg`, `toastInfoText`, `toastInfoBorder` |
| Toast success | `toastSuccessBg`, `toastSuccessText`, `toastSuccessBorder` |
| Toast warning | `toastWarningBg`, `toastWarningText`, `toastWarningBorder` |
| Toast error | `toastErrorBg`, `toastErrorText`, `toastErrorBorder` |
| Optional scrollbar colors | `scrollbarThumb`, `scrollbarThumbHover` |

The Files/Outline Porcelain #22 toggle directly uses `--mdp-surface`, `--mdp-muted`, `--mdp-border`, `--mdp-link`, and `--mdp-link-soft` in `src/viewer/styles/layout.scss`. Panel toggles have no separate palette or tokens; custom themes inherit the same semantic mapping without schema or migration changes. See the [panel-toggle contract](./design-system/README.md#panel-toggles).

Files/Outline share `ViewerScrollbar` and the Viewer's `scrollbarThumb` / `scrollbarThumbHover` colors; the sidebar variant changes only geometry. The existing auto-hide/always-visible option controls both lists, without another preference. See the [sidebar-scrolling contract](./design-system/README.md#sidebar-scrolling).

Settings exposes only the tokens listed in `EDITABLE_THEME_COLOR_FIELDS`:

- `background`
- `surface`
- `panelBg`
- `text`
- `bodyText`
- `heading`
- `muted`
- `border`
- `codeBg`
- `codeText`
- `link`
- `accent`

In Settings, `codeBg` and `codeText` are labeled as inline/fallback code colors to distinguish them from the Shiki theme. They apply to inline code, fences without Shiki highlighting, and source/fallback views; highlighted fenced-code colors are configured separately through `syntaxThemeId`.

Other tokens are inherited from `baseId`. `resolveThemeById()` merges the built-in base palette first, then applies custom `colors` overrides.

GitHub Alerts in Markdown use the existing toast text/background/border sets: Note and Important use info, Tip uses success, Warning uses warning, and Caution uses error. Titles, text, headings, links, and list markers use the status foreground on an opaque status background, including when custom themes change document/link colors or use image/gradient backgrounds; code and tables retain their existing specialized palettes. No new color fields or migration are needed: custom themes inherit status pairs from `baseId`, and CSS variables update alerts when themes change. Geometry and icons belong to the [Markdown alerts contract](./design-system/README.md#markdown-alerts).

All custom colors must be six-digit hexadecimal values in `#RRGGBB` form. The schema rejects alpha hex, named colors, `rgb()`, CSS variables, and CSS expressions.

### Distinguishing `colors.background` from `theme.background`

These similarly named fields have different responsibilities:

- `colors.background` is a semantic color token. It becomes `--mdp-bg` and supplies the Viewer's basic/fallback background.
- `theme.background` is a scene descriptor, such as a gradient or local image placed behind Viewer surfaces.

`background.type: 'none'` does not remove the Viewer's background; it still uses `colors.background`. `background.type: 'solid'` creates a separate visual scene and enables translucent/glass surfaces, so it is not equivalent to changing only `colors.background`.

## 6. From palettes to CSS variables

`createStyleVars(settings)` resolves the active theme and produces CSS custom properties. `applyThemeSettings(target, settings)` writes them to the Viewer root.

Key mappings:

| Palette token or setting | CSS variable |
| --- | --- |
| `colorScheme` | `--mdp-color-scheme` |
| `colors.background` | `--mdp-bg`, `--mdp-viewer-background` |
| `surface` | `--mdp-surface`, `--mdp-content-surface` |
| `panelBg` | `--mdp-panel-bg`, `--mdp-sidebar-surface` |
| `text` | `--mdp-text` |
| `bodyText` | `--mdp-body-text` |
| `heading` | `--mdp-heading` |
| `border` | `--mdp-border` |
| `borderStrong` | `--mdp-border-strong` |
| `muted` | `--mdp-muted` |
| `codeBg`, `codeText` | `--mdp-code-bg`, `--mdp-code-text` |
| `link`, `linkSoft` | `--mdp-link`, `--mdp-link-soft` |
| `accent`, `accentSoft` | `--mdp-accent`, `--mdp-accent-soft` |
| Typography settings | `--mdp-font-family`, `--mdp-font-size`, `--mdp-line-height` |
| Layout settings | `--mdp-content-max-width`, `--mdp-toc-width` |

Secondary tokens have safe fallbacks in `createStyleVars()`. For example, custom themes do not need to store `accentSoft`; when absent, the resolver uses `panelBg` or `background` according to the fallback chain.

`applyReaderStyles()` in `src/viewer/app/viewerStyles.js` applies theme variables, sidebar width, and typography. Because variables live on the Viewer root, the article, Files panel, Outline, editor, floating actions, scrollbars, and toasts can share one semantic palette.

## 7. Theme resolution

Key public helpers in `src/theme/index.js`:

| Helper | Responsibility |
| --- | --- |
| `getActiveThemeId(settings)` | Read the active ID, with a default fallback. |
| `getCustomThemeById(settings, id)` | Find a custom theme by identity. |
| `resolveThemeById(settings, id)` | Normalize a built-in or custom theme into a complete resolved theme. |
| `resolveActiveTheme(settings)` | Resolve the active theme. |
| `getThemeColorsForSettings(settings)` | Get resolved colors for the Viewer/Mermaid. |
| `getSyntaxThemeIdForSettings(settings)` | Get the resolved bundled syntax-theme ID, including custom overrides or base fallbacks. |
| `getThemeOptions(settings)` | Build separate built-in/custom option lists for the UI. |
| `createCustomThemeDraft(baseId, name)` | Create a custom-theme draft from a built-in base. |
| `createThemeAssetId()` | Generate a separate ID for a local image asset. |
| `createStyleVars(settings)` | Convert resolved colors and layout/typography to CSS variables. |
| `applyThemeSettings(target, settings)` | Write variables to a DOM target. |

Resolution flow:

```text
settings.theme.activeId
  -> built-in id?
       -> BUILT_IN_THEME_DEFINITIONS[id]
  -> custom id?
        -> base palette from BUILT_IN_THEMES[baseId]
       -> merge custom colors
        -> use custom background
   -> not found
       -> resolve default `light`
```

A resolved theme always has `id`, `name`, `source`, `baseId`, a complete `colors` palette, and `background`. Callers should not merge palettes or look up custom themes themselves when an existing helper covers the use case.

## 8. Background descriptor

Supported background types are declared by `BACKGROUND_TYPES` in `src/theme/backgrounds.js`:

- `none`
- `solid`
- `gradient`
- `image`

Common fields:

| Field | Values | Meaning |
| --- | --- | --- |
| `type` | A `BACKGROUND_TYPES` value | Selects the descriptor shape. |
| `motion` | `system`, `on`, `off` | Scene motion policy. |
| `overlayOpacity` | Number from `0` to `0.8` | Dark overlay over the scene to maintain readability. |

Theme Studio allows decimal dimming and gradient-angle values through native inputs with `step="any"`, matching the schema. The default `overlayOpacity: 0.08` and imported values such as angle `135.25` must submit successfully; do not use a `0.05` step or integer step that makes the browser block saving before validation/service calls.

Default descriptor:

```js
{
  type: 'none',
  motion: 'system',
  overlayOpacity: 0.08
}
```

### None

```js
{
  type: 'none',
  motion: 'system',
  overlayOpacity: 0.08
}
```

`resolveBackgroundScene()` returns `kind: 'none'` and `visual: false`. `BackgroundScene` mounts no scene DOM, and the Viewer uses opaque palette surfaces.

### Solid

```js
{
  type: 'solid',
  color: '#111827',
  motion: 'system',
  overlayOpacity: 0.08
}
```

Solid scenes do not animate but still have `visual: true`, so the Viewer enables translucent content/sidebar surfaces and backdrop blur.

### Gradient

Custom linear gradient:

```js
{
  type: 'gradient',
  startColor: '#312e81',
  endColor: '#0f766e',
  angle: 135,
  motion: 'system',
  overlayOpacity: 0.08
}
```

`angle` must be between 0 and 360. The resolver builds `linear-gradient(...)` from validated values; persisted settings contain no raw gradient CSS.

Built-in Aurora uses an internal preset:

```js
{
  type: 'gradient',
  variant: 'aurora',
  motion: 'system',
  overlayOpacity: 0.08
}
```

The resolver converts `variant: 'aurora'` into multiple radial gradients and a trusted linear gradient defined in source. Settings does not expose arbitrary `variant` values. When creating a custom theme from Aurora, `createCustomThemeDraft()` converts the Aurora preset into an ordinary editable linear gradient.

### Image or animated image

```js
{
  type: 'image',
  assetId: 'theme-asset:12345678',
  assetRevision: 1720000000000,
  fit: 'cover',
  position: 'center',
  repeat: false,
  motion: 'system',
  overlayOpacity: 0.08
}
```

| Field | Rule |
| --- | --- |
| `assetId` | Required; must match `^theme-asset:[a-z0-9][a-z0-9-]{7,127}$`. |
| `assetRevision` | Non-negative safe integer; invalidates the image-loading effect when the asset changes. |
| `fit` | `cover`, `contain`, or `auto`. |
| `position` | `center`, `top`, `bottom`, `left`, or `right`. |
| `repeat` | Boolean; when true, uses a tiled CSS background instead of `<img>`. |

Accepted image MIME types are PNG, JPEG, WebP, AVIF, GIF, and APNG. Files must be larger than 0 and no larger than 5 MiB. SVG is not accepted as a custom background.

`isAnimatedImageBlob()` marks GIF and APNG as animated, checks chunk markers for animated PNG/WebP, and checks `avis` for AVIF. This is practical motion detection, rather than a complete media parser.

### Motion behavior

Gradient and image scenes are marked `animated: true` to receive CSS drift unless `motion` is `off`. CSS `prefers-reduced-motion: reduce` always disables drift. Intrinsically animated images are also hidden when motion is disabled or the operating system requests reduced motion.

Currently, `motion: 'on'` does not override `prefers-reduced-motion`; the accessibility preference still takes precedence. When a tab is hidden, `is-paused` pauses CSS drift. The browser controls throttling of intrinsic GIF/APNG/WebP animation on hidden pages.

### Visual surfaces

When a scene has `visual: true`, `ViewerShell` adds `mdp-root--has-visual-background`. `layout.scss` then changes sidebar and content surfaces to `color-mix(..., transparent)` and enables `blur(16px) saturate(122%)`. With background `none`, surfaces return to opaque palette colors.

The background scene uses `position: fixed` and `z-index: 0`, and receives no pointer events. `.mdp-body` uses `z-index: 1`. The scene is hidden when printing.

## 9. Local image asset lifecycle

Image descriptors and binary images are deliberately stored separately:

```text
Theme descriptor
  -> Chrome Sync index + individual theme records; local backend only when the sync API is unavailable
  -> contains only assetId + presentation metadata

Binary image
  -> IndexedDB `markdown-plus-assets`
  -> object store `background-assets`
  -> record keyed by assetId on the current device
```

### Upload and save

Settings flow:

```text
ThemeSettings selects a File
  -> useSettingsForm.saveCustomTheme()
  -> validateThemeBackgroundFile()
  -> FileReader creates a data URL
  -> SAVE_THEME_ASSET message
  -> background message router
  -> themeAssetService.saveThemeAsset()
  -> parse the data URL back into a Blob and validate it
  -> write the Blob + animated flag to IndexedDB
  -> save the theme descriptor with assetId and assetRevision
```

The service stores only runtime data: `id`, `blob`, and the `animated` flag.

Uploads are stored before settings. If saving settings fails, Options attempts to delete the uploaded asset to avoid an orphan. When replacing an image, the old asset is deleted after the new settings are saved successfully.

### Loading in the Viewer

```text
resolveActiveTheme()
  -> resolveBackgroundScene()
  -> BackgroundScene sees kind=image
  -> GET_THEME_ASSET message
  -> IndexedDB record is converted to a data URL
  -> Viewer parses the data URL into a Blob
  -> URL.createObjectURL(blob)
  -> render <img> or a tiled background
  -> URL.revokeObjectURL() when the scene changes or the component unmounts
```

If an asset is missing or IndexedDB is unavailable, the Viewer logs a warning through the shared logger and omits the image. The palette background remains underneath, so the UI retains a background.

### Delete and reset

When deleting a custom theme, Options deletes its referenced asset after settings are saved successfully. If the theme is active, the active ID switches to `baseId` before deletion.

A full settings reset makes the background router call both `settingsService.resetSettings()` and `themeAssetService.clearThemeAssets()`. If IndexedDB cleanup fails, settings still reset and the cleanup error is logged as a warning.

### Sync, export, and import

Binary assets do not synchronize across devices. An image-theme descriptor can arrive on another device through sync without a matching IndexedDB `assetId`; the image will not display there.

Settings export currently produces only settings JSON, without binary assets. JSON import does not restore image binaries either. Full portability for image-backed themes would require a future asset-packaging/export format.

Settings import currently does not garbage-collect old assets that lose their references. Saving/deleting themes through Settings and full resets have their own cleanup; new workflows that modify `customThemes` directly must explicitly manage the asset lifecycle.

## 10. Settings UI and custom-theme workflow

Theme authoring lives in Settings → Themes, composed of `OptionsApp.jsx`, the `ThemeSettings.jsx` library screen, and the `ThemeEditor.jsx` detail view. The default screen contains only the active-theme selector and custom-theme list with Use, Edit, and Delete actions; Add or Edit opens the editor, while Cancel/Save returns to the library.

The theme editor uses a two-column workbench on wide screens: controls on the left and a sticky `ThemePreview` on the right; on narrow screens, the preview moves above the controls. It receives the custom-theme draft directly from React state, so valid values appear immediately without saving or changing the actual active theme. The editor warns before Back or Cancel would discard a modified draft.

`ThemePreview` is a deliberate miniature of the Viewer, including Files, the document surface, Outline, headings, body text, links, blockquotes, code blocks, tables, borders, accent states, and the background scene. It uses `createStyleVars()` and `resolveBackgroundScene()` like the runtime Viewer instead of maintaining a separate palette. Draft colors that are temporarily invalid hex values fall back to their built-in base tokens in the preview; save-time schema validation remains authoritative.

The preview reflects gradients, solid scenes, dimming, motion, image fit, position, and repeat. Newly selected images use temporary object URLs that are revoked when the file changes or the component unmounts; saved image assets load through `theme-asset-client`. The preview does not persist files, alter asset lifecycles, or broadcast settings. Animated images are hidden when draft motion is `off`, matching Viewer safety behavior; CSS motion still respects `prefers-reduced-motion`.

Users can:

- Select the active theme.
- Create a custom theme from the active theme's base.
- Name a custom theme.
- Choose a built-in base theme.
- Edit the 12 exposed semantic color tokens.
- Select a background type and configure its fields.
- Upload a local static or animated image.
- Save or delete a custom theme.

Selecting “Add custom theme” uses `resolveActiveTheme(settings).baseId` as the base. If the active theme is custom, the new theme uses the same built-in base instead of cloning the entire active custom theme.

`createCustomThemeDraft()` copies the current values of the 12 editable tokens from the built-in base. When `baseId` changes, `rebaseCustomThemeDraft()` reloads all 12 color inputs from the new built-in base and updates the source of non-editable tokens. With “Follow base theme” selected for code highlighting, the Shiki mapping follows the new base; an explicit syntax-theme override is preserved.

The theme editor offers “Follow base theme” or one of 30 bundled syntax themes. The catalog favors popular VS Code and community families such as GitHub, VS Code Plus, One, Dracula, Monokai, Tokyo Night, Catppuccin, Nord, Solarized, Material, Ayu, Gruvbox, Night Owl, Rosé Pine, and Everforest. The selector groups choices by light/dark, and the live preview tokenizes sample code with the resolved Shiki theme; it uses a separate JavaScript regex engine to avoid depending on WASM execution permission on the extension's Options page. This choice applies to fenced code and standalone SQL; CodeMirror retains its own highlighting.

After a successful save, the saved custom theme becomes active. Creation and updates are distinguished by checking whether the draft ID already exists in `settings.theme.customThemes`.

Built-in themes do not appear in the custom-theme editor and cannot be renamed or deleted. Maintainers change source to update a built-in theme for everyone; users create custom themes for personalization.

## 11. Popup and quick theme toggle

Popup's Reader panel calls `getThemeOptions(settings)` to build options, then groups built-in themes into “Light themes” and “Dark themes” by `colorScheme`; saved custom themes appear under “My themes”. Selecting a theme saves only `{ theme: { activeId } }`.

Popup shows a small preview based on resolved `surface/background`, `text`, and `link` colors. It identifies the palette without rendering background images or gradient scenes.

“Reset reader UI” in Popup restores the default `activeId`, typography, and layout without deleting `customThemes`. It resets selection and reader preferences, rather than the entire theme library.

The Viewer's floating quick toggle is deliberately limited to `light` ↔ `dark` by `getLightDarkThemeToggleTarget()`. If a custom theme or another built-in theme is active, the helper returns `null` and the toggle leaves the theme unchanged. Popup/Settings selectors can still select every theme.

## 12. Persistence and live update flow

Popup and Options do not access `chrome.storage` directly. They call `saveSettings()` in `src/settings/settings-client.js`; the client sends `SAVE_SETTINGS`, the background router calls the settings service, then broadcasts `SETTINGS_UPDATED` to tabs.

```text
Popup or Settings
  -> saveSettings(partial)
  -> SAVE_SETTINGS
  -> settingsService.saveSettings()
  -> deepMerge(current, partial)
  -> normalizeSettings()
  -> chrome.storage
  -> SETTINGS_UPDATED broadcast
  -> content/viewer-loader.js
  -> MarkdownViewerApp.updateSettings()
```

`MarkdownViewerApp.updateSettings()` updates React state and CSS variables immediately, then asks `needsFullRender()` whether Markdown must be rendered again.

Background-only changes to the active custom theme take the style-only path without a full Markdown render. Changes to the active palette, `baseId`, or resolved `syntaxThemeId` require a full render because Shiki code colors are embedded in HTML and Mermaid can depend on theme colors.

Changing an inactive custom theme still changes the settings object, but `needsFullRender()` compares resolved active themes and can skip a full render when the active palette/base is unchanged.

## 13. Shiki, Mermaid, and the editor

### Shiki

Shiki does not build syntax themes from custom color tokens. The theme resolver prefers a custom `syntaxThemeId` when present; when it is `null` or absent, `src/theme/syntax-themes.js` maps the built-in/base ID to a bundled Shiki theme. `src/viewer/core/shiki-config.js` allows only catalog IDs; the runtime highlighter initializes with the `github-light` fallback and loads the active theme as needed.

Examples:

| Reader base | Shiki theme |
| --- | --- |
| `light` | `github-light` |
| `dark` | `github-dark` |
| `sakura` | `rose-pine-dawn` |
| `matcha` | `everforest-light` |
| `vscode-dark` | `dark-plus` |
| `aurora-glass` | `night-owl` |

Every built-in ID must map to a Shiki theme in the explicit loader allowlist. Custom themes may store only `null` or an ID from that same allowlist; raw theme JSON, CSS, and remote theme URLs are rejected. Adding a Shiki theme requires updating both catalog metadata and static import loaders; do not use variable dynamic imports that could pull the entire theme set into the bundle.

### Mermaid

The Official Mermaid renderer uses resolved theme colors to build `themeVariables`; `colorScheme` determines Mermaid's base/default mode. Custom color overrides therefore affect diagrams.

Beautiful Mermaid reads actual CSS variables from the Viewer root, including font, background, foreground, border, accent, muted, and panel background. Typography changes can require rerendering when Beautiful Mermaid is active.

### Editor and Viewer chrome

The CodeMirror editor theme and Viewer chrome use `--mdp-*` variables instead of a separate theme system. Semantic-token changes therefore consistently affect the article, editor, panels, controls, toasts, and scrollbars.

## 14. Validation, migration, and compatibility

`normalizeSettings()` is the schema boundary for save/import and safe loading. With `invalid: 'throw'`, invalid data produces `SettingsValidationError` with `fieldErrors`. With `invalid: 'default'`, the loader attempts recovery through safe fallbacks and discards invalid custom themes.

Key validation rules:

- Theme objects must be plain objects.
- `customThemes` must be an array with at most 32 items.
- Custom IDs must match the required pattern and be unique.
- Names must contain 1–48 characters.
- `baseId` must be an existing built-in ID.
- `syntaxThemeId` must be `null`/absent or an allowlisted bundled syntax-theme ID.
- Only editable color keys are retained; colors must use `#RRGGBB`.
- Background type, motion, fit, and position must be allowlisted.
- Gradient angles range from 0 to 360.
- Overlay opacity ranges from 0 to 0.8.
- Images must have a valid asset ID and a non-negative revision.
- Legacy `appearance.background` is removed during normalization.

Settings version 1 used `theme.preset` and could include global `appearance.background`. Migration to version 2 performs:

```text
theme.preset -> theme.activeId
theme.customThemes -> retain if an array, otherwise use []
appearance.background -> remove
version -> 2
```

If a future change makes the persisted shape incompatible, bump both `DEFAULT_SETTINGS.version` and `CURRENT_SETTINGS_VERSION`, and add an explicit migration in `migrateSettings()`. Do not use deep merging as a substitute for migration across a breaking schema change.

## 15. Security and privacy boundaries

The theme system permits only structured data. Do not add settings fields accepting raw CSS, raw HTML, JavaScript URLs, arbitrary data URLs, or remote URLs.

Gradient CSS is built in a trusted resolver from a validated angle and two hex colors. Built-in Aurora CSS comes from source code, rather than persisted input.

Custom images are limited by a MIME allowlist and a 5 MiB cap at both the UI read boundary and background storage boundary. The background service reparses data URLs before writing Blobs to IndexedDB; data is not trusted simply because it came from Options.

Custom SVG is prohibited because SVG has a more complex attack surface and external-resource behavior than raster images. Future SVG support would require a dedicated threat model and sanitizer, rather than merely another MIME type.

Remote image URLs are not currently supported. Adding them introduces privacy, network-permission, CSP, caching, tracking, and availability concerns; do not enable them through a generic string field.

## 16. Adding a built-in theme

Minimum checklist:

1. Create a complete palette constant in `src/theme/index.js` or use an appropriate helper such as `createDarkThemePalette()`.
2. Add `id -> palette` to `BUILT_IN_THEMES`.
3. Add a label to `BUILT_IN_THEME_LABELS`.
4. Configure a background descriptor in `BUILT_IN_THEME_DEFINITIONS`. As more themes gain their own backgrounds, consider replacing the current Aurora ternary with an explicit `BUILT_IN_THEME_BACKGROUNDS` map to keep the registry readable.
5. Add the built-in/base ID to `BASE_THEME_TO_SYNTAX_THEME_ID` in `src/theme/syntax-themes.js`.
6. If the Shiki ID is not already bundled, add a catalog entry to `SYNTAX_THEME_DEFINITIONS` and an explicit loader to `SHIKI_THEME_LOADERS` in `src/viewer/core/shiki-config.js`, then assess bundle size.
7. Confirm that `getThemeOptions()` automatically includes the new theme in Popup and Settings selectors.
8. Add/update tests for palettes, contrast, backgrounds, Shiki mappings, and option rendering.
9. Run tests, a production build, and a size report when adding Shiki or runtime assets.

Example approach for a built-in solid background:

```js
const BUILT_IN_THEME_BACKGROUNDS = Object.freeze({
  'paper-night': Object.freeze({
    type: BACKGROUND_TYPES.SOLID,
    color: '#111827',
    motion: BACKGROUND_MOTION.OFF,
    overlayOpacity: 0.05
  })
})
```

The registry then selects the descriptor from the map, falling back to `DEFAULT_THEME_BACKGROUND`. Freeze or clone descriptors at the resolver boundary so callers cannot mutate built-in definitions.

## 17. Changing or adding editable colors

To expose an existing token to custom themes:

1. Add a `{ key, label }` entry to `EDITABLE_THEME_COLOR_FIELDS`.
2. Ensure every built-in palette supplies a valid value for that key or an explicit fallback in `createStyleVars()`.
3. `ThemeSettings` automatically renders color inputs from this list.
4. The schema automatically allows the key because it builds `EDITABLE_COLOR_KEYS` from the same list.
5. Add resolution and CSS-variable mapping tests.

To create an entirely new semantic token:

1. Add the token to every built-in palette or palette-building helper.
2. Map the token to a CSS variable in `createStyleVars()`.
3. Use the variable in the consuming component/SCSS.
4. Decide whether the token is customizable or inherited only from the base.
5. Verify contrast and fallbacks for every theme.

Components should not read `BUILT_IN_THEMES` directly or hard-code theme IDs. Use semantic CSS variables or resolved-theme helpers.

## 18. Adding a background type

A new background capability must cover all of these boundaries:

1. Add the enum/type and relevant defaults in `src/theme/backgrounds.js`.
2. Extend `normalizeBackgroundSettings()` with allowlisted validation and hard bounds.
3. Extend `resolveBackgroundScene()` to convert persisted descriptors into trusted render-only scenes.
4. Add authoring controls in `ThemeSettings.jsx`.
5. Extend `BackgroundScene.jsx` and `_background-scene.scss` if the new renderer needs different DOM/styles.
6. Review asset services/message routes if the type uses binary resources.
7. Update cleanup, reset, replacement, and import/export behavior.
8. Verify reduced motion, hidden-page behavior, printing, and fallbacks.
9. Add unit tests for schemas, resolvers, renderer styles, asset routing, and Settings UI.
10. If the persisted shape changes incompatibly, bump the settings version and add a migration.

Keep descriptors declarative and serializable. Do not store React props, DOM objects, Blobs, object URLs, or arbitrary CSS text in settings.

## 19. Supporting packaged images for built-in themes

The current image path supports only local `assetId` values, so do not simulate built-in images by writing assets into the user's IndexedDB. A durable extension would use a discriminated source:

```js
// Custom/user asset
{
  type: 'image',
  source: {
    kind: 'local',
    assetId: 'theme-asset:12345678',
    revision: 1
  },
  fit: 'cover',
  position: 'center',
  repeat: false,
  motion: 'system',
  overlayOpacity: 0.08
}

// Trusted built-in asset
{
  type: 'image',
  source: {
    kind: 'bundled',
    path: 'theme-backgrounds/cosmos.webp'
  },
  fit: 'cover',
  position: 'center',
  repeat: false,
  motion: 'system',
  overlayOpacity: 0.08
}
```

Custom-settings validation should permit only `source.kind: 'local'`. `source.kind: 'bundled'` must come only from the trusted built-in registry, with paths restricted to a specific asset directory rather than arbitrary URLs.

`BackgroundScene` could use the theme asset client for local sources and `chrome.runtime.getURL(path)` for bundled sources. Static packaged files should live under `public/theme-backgrounds/`; update `manifest.json` `web_accessible_resources` in the same change if required by the runtime access model.

Moving from flat `assetId` to nested `source` is a schema change. If implemented, bump the settings version and migrate old custom-image descriptors to `source: { kind: 'local', assetId, revision }`.

## 20. Errors and fallbacks

| Situation | Current behavior |
| --- | --- |
| Missing active ID during safe loading | Fall back to `light`. |
| Invalid custom base ID during safe loading | Fall back to the default base. |
| Invalid custom theme during safe loading | Remove the invalid item from the list. |
| Invalid background type during safe loading | Fall back to `none`. |
| Missing image asset | Log a warning, omit the image, and retain the palette background. |
| Asset upload succeeds but settings save fails | Attempt to delete the uploaded asset. |
| Deleting the active custom theme | Switch the active ID to its base theme, then delete it. |
| Settings reset succeeds but IndexedDB cleanup fails | Keep the settings reset and log the cleanup failure. |
| A runtime helper cannot resolve a theme ID | Resolve the default `light` theme. |

Do not silently swallow asynchronous errors. User-facing Settings flows put errors in status UI; the background service returns an `{ ok: false, error }` response envelope; Viewer asset loading logs warnings through `logger`.

## 21. Testing map

| Scope | Primary tests |
| --- | --- |
| Built-in palettes, resolution, CSS vars, contrast | `src/theme/__tests__/theme-vars.test.js` |
| Background descriptor → scene | `src/theme/__tests__/backgrounds.test.js` |
| Theme asset messaging client | `src/theme/__tests__/theme-asset-client.test.js` |
| Settings normalization and validation | `src/settings/__tests__/settings-schema.test.js` |
| Migration, merge, storage | `src/settings/__tests__/settings-service.test.js` |
| Byte quota, codec, cache, migration failure, concurrency | `src/settings/__tests__/settings-storage-format.test.js`, `settings-storage.test.js` |
| Remote storage events and incomplete snapshots | `src/background/__tests__/settings-sync-observer.test.js` |
| Image rollback after quota/import failures | `src/options/__tests__/settings-form-storage.test.js` |
| Settings authoring markup | `src/options/__tests__/theme-settings.test.js` |
| Popup selector | `src/popup/__tests__/popup-primitives.test.js` |
| Full-render invalidation | `src/shared/__tests__/settings-diff.test.js` |
| Shiki mapping | `src/viewer/core/__tests__/shiki-config.test.js` |
| Background layer/glass/scrollbar CSS | `src/viewer/styles/__tests__/background-scene.test.js` |
| Asset message routes and reset cleanup | `src/background/__tests__/message-router.test.js` |
| File validation and animation detection | `src/shared/__tests__/background-image.test.js` |

Standard verification commands, after selecting the Node.js version pinned in `.nvmrc`:

```bash
npm test
npm run build
npm run size:report
```

Theme behavior changes require at least `npm test`. Packaged/runtime asset changes also require `npm run build`. Adding Shiki themes, bundled images, or dependencies also requires `npm run size:report` and a before/after comparison.

Manual smoke tests should include:

- Select every built-in theme in Popup and confirm live Viewer updates.
- Create, rename, edit, and delete custom themes in Settings.
- Change the base theme and confirm that code blocks use the correct Shiki mapping.
- Try `none`, `solid`, `gradient`, static images, and animated images.
- Check `cover`, `contain`, `auto`, position, and repeat.
- Check `system/on/off` motion with operating-system reduced-motion preferences.
- Reload the extension/tab and confirm that descriptors and assets still work on the same device.
- Reset reader UI and confirm that the custom-theme library remains intact.
- Reset all settings and confirm that custom themes/assets are deleted.
- Print a document and confirm that visual backgrounds are absent.

## 22. Review checklist for people and AI agents

Before merging a theme change, answer these questions:

- Does the new data belong to the palette, background descriptor, or asset storage?
- Is it owned by each theme, or has it accidentally become global appearance state?
- Do built-in and custom themes follow the same resolver contract?
- Is Popup still selection-only, or have authoring controls crept back in?
- Does the schema reject raw CSS, remote URLs, and invalid colors?
- Are assets cleaned up on replacement, deletion, reset, and save failure?
- Do assets need sync/export/import, or are they local-only? Do the UI and documentation make this clear?
- Does the change affect Shiki, Mermaid, or render invalidation?
- Does it require a settings-version bump and migration?
- Does every new built-in ID have a Shiki mapping and test coverage?
- Have reduced motion, tab visibility, printing, and missing-asset fallbacks been checked?
- Are unrelated worktree changes preserved and generated `dist/**` files left unedited?

## 23. Contract summary

The system contract can be summarized as:

```text
Theme = identity + base + semantic colors + owned background

Settings:
  author custom themes
  store descriptors

Popup:
  select only

Resolver:
  built-in/custom -> one complete runtime theme

Viewer:
  CSS variables + background scene + Shiki/Mermaid integration

Local asset service:
  store binary images by assetId on this device
```

Preserve this contract when adding features to avoid returning to the old model of a global background setting unrelated to individual themes.
