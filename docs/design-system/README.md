# Markdown Plus Design System

This directory records the visual contracts currently implemented by Markdown Plus. Runtime source is canonical; this guide and its standalone HTML previews are derived references.

## Find the relevant contract

For UI tasks, start with this map and read only the relevant sections and source files. Agent design review, planning, approval, and migration decisions are governed by the shared [UI design rule](../../.agents/rules/25-ui-design-system.md).

| Task | Read here / preview | Runtime lookup |
| --- | --- | --- |
| Colors, spacing, typography, density, focus, or states | [Semantic tokens](#semantic-tokens) through [Interaction states](#interaction-states); select the relevant subsection. [Foundations](./index.html#colors), [geometry](./index.html#geometry), [interaction](./index.html#interaction) | `src/shared/styles/_tokens.scss` and the affected shared style; `src/viewer/styles/_variables.scss`; theme values in `src/theme/index.js` |
| Buttons, fields, switches, badges, notices, loading | [Implemented shared primitives](#implemented-shared-primitives), [Current component contracts](#current-component-contracts); [Controls](./components.html#controls), [Feedback & containers](./components.html#feedback) | The matching file in `src/shared/react/` and `src/shared/styles/`; follow the specimen's source notes |
| Dialogs, menus, tooltips, or a composed workflow | [Focus, motion, and accessibility](#focus-motion-and-accessibility), [Current component contracts](#current-component-contracts); [Overlays](./components.html#overlays-title), [Patterns](./components.html#patterns) | `src/viewer/react/components/common/`, `src/viewer/react/hooks/useDismissableLayer.js`, `useModalDialog.js`, and the owning surface's component/style |
| Viewer rails, editor, document surface, or responsive composition | [Layout contracts](#layout-contracts); [Viewer preview](./viewer.html) | `src/viewer/react/components/` and the relevant `src/viewer/styles/` partial; document typography lives under `src/viewer/styles/content/` |
| Settings or Popup layout | [Layout contracts](#layout-contracts); [Patterns](./components.html#patterns) | `src/options/` or `src/popup/`, with shared primitives/styles for controls |
| Icons or file identities | [Icon system](#icon-system); [Application icons](./icons.html#application-icons), [File-type icons](./icons.html#file-type-icons) | `src/shared/icons/application-icons.js`, `file-type-icons.js`, `create-app-icon.js`; React adapters under `src/shared/react/` |
| Reader themes, semantic-color mapping, backgrounds, or syntax themes | [Semantic tokens](#semantic-tokens), then the matching section of [Theme system](../theme-system.md) | `src/theme/`; use the ownership map in the theme guide for settings and asset lifecycle |
| Approved changes to this reference set | [Extending the system](#extending-the-system), [Maintaining the previews](#maintaining-the-previews) | Source notes in the affected specimen; icon snapshots use `scripts/sync-design-system-icons.mjs` |

The README is the text contract and lookup map; `index.html` visualizes foundations, `components.html` catalogs primitives and patterns, `icons.html` inventories glyphs, and `viewer.html` shows composition. These are references, not runtime component implementations. Search for the relevant heading, component name, selector, or token before reading a large HTML page. Inspect the owning implementation and its consumers to verify the contract; expand to other pages only when the change crosses their boundaries.

## Browse the system

Open [Overview & foundations](./index.html) in a browser as the common entry point. All HTML pages are standalone, embed their styles and scripts, and work without a build or external assets. Their navigation links the same four destinations.

| Page | Purpose |
| --- | --- |
| [Overview](./index.html) | Entry point, principles, semantic colors, typography, spacing, and interaction states |
| [Components](./components.html) | Controls, feedback and containers, then patterns; states, usage notes, source paths, and simulated interactions |
| [Icons](./icons.html) | Current application glyphs and a separate explorer/file-type family, with search, theme, and size previews |
| [Viewer preview](./viewer.html) | Current Viewer composition, rail toggles, theme, and dirty-editor dialog; actions simulate feedback |

The component catalog embeds CSS snapshots from the shared, Popup, and Viewer SCSS sources cited in each section. The icon inventory and other preview glyphs are generated from `src/shared/icons/application-icons.js` and `file-type-icons.js` by `node scripts/sync-design-system-icons.mjs`. Preview layout and simulated actions are documentation-only; they do not read or write workspace files.

For the persisted theme schema, built-in/custom resolution, background descriptors, local asset lifecycle, and theme extension workflow, see [`theme-system.md`](../theme-system.md).

## Source of truth

Use these sources in order when values disagree:

1. `src/theme/index.js` and `src/theme/backgrounds.js` for complete reader themes, background descriptors, and runtime CSS-variable mapping.
2. `src/shared/react/**` and `src/shared/styles/**` for reusable application primitives.
3. `src/viewer/styles/**` for Viewer foundations, layout, document typography, and components.
4. `src/options/options.scss` and `src/popup/popup.scss` for surface-specific layout.
5. This guide and the HTML pages in this directory for explanation and preview only.

## Product character

Markdown Plus is a local-file document reader with developer tools. Its visual language is:

- content-first and quiet;
- compact around navigation and actions;
- spacious inside the document surface;
- border-led, with shadows reserved for floating layers;
- neutral blue-gray surfaces with blue navigation, green success, amber edit/warning, and red failure/destructive states;
- predictable across reading, workspace navigation, and editing.

Avoid decorative gradients in application chrome, marketing-scale headings, permanent top chrome, heavy elevation, and unrelated accent colors in application surfaces. User-authored theme backgrounds are an explicit canvas layer and do not change this chrome rule.

## Semantic tokens

Viewer color values are owned by the resolved active built-in or custom theme in `src/theme/index.js`. Shared application fallbacks live in `src/shared/styles/_tokens.scss`.

| Token | Role |
| --- | --- |
| `--mdp-bg` | Application canvas and rails |
| `--mdp-surface` | Reading surface, controls, cards |
| `--mdp-panel-bg` | Quiet grouped/status surface |
| `--mdp-panel-strong` | Hover and stronger grouped surface |
| `--mdp-text` | Primary application text |
| `--mdp-body-text` | Rendered-document text |
| `--mdp-heading` | Headings and strong labels |
| `--mdp-muted` | Secondary text and idle icons |
| `--mdp-border` | Standard borders and dividers |
| `--mdp-border-strong` | Hover and structural borders |
| `--mdp-code-bg`, `--mdp-code-text` | Inline code and non-Shiki fallback code |
| `--mdp-link` | Links, focus, navigation, active state |
| `--mdp-link-soft` | Selected/navigation surface |
| `--mdp-accent` | Saved, copied, and positive state |
| `--mdp-accent-soft` | Positive-state surface |
| `--mdp-warning` | Editing, dirty state, and warnings |
| `--mdp-warning-soft` | Warning/editing surface |
| `--mdp-danger` | Errors and destructive actions |
| `--mdp-table-*` | Rendered table border, header, and alternating rows |
| `--mdp-toast-*` | Info, success, warning, and error toast variants |
| `--mdp-scrollbar-thumb*` | Overlay scrollbar idle and hover treatment |

Use semantic variables instead of adding near-duplicate raw colors. Blue communicates navigation or selection, green successful completion, amber editing/warnings, and red errors or destructive actions.

## Icon system

The approved set contains 43 application glyphs and 8 explorer identities. `src/shared/icons/application-icons.js` owns 24px monochrome geometry with 1.8 stroke, round caps and joins; `file-type-icons.js` owns the separate native 16px family with fixed colors and 1.25 stroke. `AppIcon` and `FileTypeIcon` render these definitions declaratively in React. `createAppIconSvg` renders the same trusted definitions through DOM APIs for code blocks, diagrams, and image lightboxes. Viewer icon components remain small compatibility adapters.

Use 16px artwork in explorer lists, 18–20px for application actions, and 24px for larger specimens. The enclosing control owns target size, accessible name, tooltip, and interaction state. Application glyphs use `currentColor`; file identities preserve their colors in selected rows and dark themes. Expanded folders use the open-folder variant; Collapse folders uses overlapping layers and a minus rather than directional chevrons.

| Explorer identity | Fixed color |
| --- | --- |
| Folder / open folder | `#D6A34A` |
| Markdown | `#60A5FA` |
| Plain text | `#64748B` |
| SQL / SVG | `#F472B6` |
| Mermaid | `#F59E0B` |
| Raster image | `#C084FC` |

Keep SVG geometry in these local definitions. Do not introduce per-surface copies, icon fonts, or external icon assets. After a glyph changes, run `node scripts/sync-design-system-icons.mjs`, then verify the standalone references. The script refreshes icon galleries and marked SVGs in the component and Viewer previews from runtime source.

## Typography

Application UI uses the system font stack defined in source. Do not name a font that is not bundled, because output would depend on the user's machine.

Current hierarchy:

- panel title: approximately `12px`, strong weight;
- Files title: approximately `15px`, strong weight;
- row and button labels: `13px`–`14px`;
- metadata and status: `10px`–`12px`;
- tooltips: `12px`;
- editor status: compact monospace text.

Rendered document typography is user-configurable through `--mdp-font-family`, `--mdp-font-size`, and `--mdp-line-height`. Code uses the runtime monospace stack.

## Shape, spacing, and elevation

- Use compact `6px`–`8px` radii for controls and `10px`–`12px` for larger surfaces.
- Prefer `4px`, `8px`, `12px`, `16px`, and `24px` spacing increments.
- Use borders and background contrast for structure before adding shadows.
- Reserve stronger elevation for menus, tooltips, toast, and full-screen overlays.
- Interactive controls may use a subtle `translateY(1px)` pressed state without layout shift.

## Control density

Choose control geometry from its interaction context instead of applying page-form sizing to every surface.

| Context | Fine pointer | Coarse pointer |
| --- | --- | --- |
| Dense editor or utility toolbar | `28px` | `44px` |
| Compact icon action | `34px` | `44px` |
| Shared page input or button | `36px`–`38px` | `44px` |
| Navigation row | `36px`–`38px` | `44px` |

- Transient editor and utility toolbars should use the dense tier on fine pointers. A focused workflow such as Find/Replace may use one right-anchored floating surface so it stays close to IDE conventions without turning the entire editor edge into a toolbar.
- Choose toolbar rows by task hierarchy: cohesive utilities can adapt to available width, while paired workflows such as Find and Replace may keep one deliberate row per task even when more width is available. Move secondary modes into a quieter footer row instead of extending the primary task row.
- On fine pointers, target at most `40px` for a single toolbar row and `80px` for two primary task rows, excluding an optional compact secondary-options footer.
- Preserve `44px` targets for coarse pointers even when the same controls render more densely with a mouse or trackpad.
- Floating editor utilities must remain inside the editor bounds, fall back toward full available width on narrow panes, and preserve pointer interaction only on the utility surface so the surrounding editor stays usable.

## Focus, motion, and accessibility

- Preserve semantic landmarks and native buttons, links, labels, and form controls.
- Every icon-only control needs an accessible name and tooltip.
- Use a visible `2px` focus outline with offset for keyboard interaction.
- Do not communicate active, dirty, success, or failure states through color alone.
- Shared fields, buttons, primary Viewer actions, and rows use at least `44px` targets on coarse pointers. The current edge panel toggles and collapsed Files hit area use a compact `32px` coarse-pointer geometry; do not make new primary controls that small.
- Honor reduced motion in skeletons, transitions, and overlays.
- Menus and overlays must support Escape, outside dismissal, focus restoration, and cleanup.

## Layout contracts

### Viewer

- The Files panel is an independently resizable left rail.
- The center pane owns the rendered document and editor layouts.
- The right rail combines capability-driven document actions with the Outline.
- Files and Outline widths use separate CSS variables and tab-session preferences; collapsing Files preserves a narrow interaction gutter, while collapsing Outline preserves the actions rail.
- Files has a disclosure icon in the existing Folder/Workspace status row of its single context card. It adds no heading row or enclosing card. The Files header spans the panel: heading, expanded actions and notices have a 2px inline inset, while the context card spans the available width directly, without negative margins. Details starts expanded and remembers its state through file navigation and reloads in the tab session. Minimizing retains a one-line card with its mode badge, contextual icon actions, and expand control; the filename and descriptive status are omitted from this row. The minimized card reduces vertical padding from 10px to 4px, giving a roughly 38px fine-pointer height while preserving icon target sizes; padding animates with the disclosure and honors reduced motion. Expanded controls remain in the metadata/body; minimized controls replace them, with hidden body content immediately invisible and inert during the 200ms height animation. Copy, Open/Switch folder, and Back/Leave commands share a measured width budget with the badge and disclosure, use 28px fine-pointer or 44px coarse-pointer targets, and move into the existing overflow menu pattern when space is insufficient. New secondary commands start in overflow, and an empty overflow trigger is omitted. The badge can truncate at the narrowest widths to preserve control targets. Tree controls stay immediately above the list, after the complete context section; progress/cancel and warnings remain accessible. Empty lists recover through the same contextual Open/Switch folder command. Reduced motion disables transitions. Shared PanelHeader, Outline, Popup, and Settings keep their existing composition.
- Files aligns detail disclosure, tree Refresh and file-row More actions on a shared trailing axis: 28px square controls, 4px action gaps, 16px artwork, and 44px targets on coarse pointers. The Files sidebar has fixed, symmetric 8px inline padding. The context card has symmetric 10px internal inline padding in both expanded and minimized states; its 1px border makes the action axis 11px from the outer card edge. The tree toolbar uses that same inset. File-row actions deduct the measured native gutter from their inset to meet this axis, reserving matching text space when visible; scrollbar measurements never change the sidebar or context card padding. FilesPanel mounts ExplorerPanel directly, and the scroll viewport has no horizontal offset. Shared panel flex layout is owned by `layout.scss`; Files geometry is owned by `explorer.scss`. Its context-padding variable drives the trailing action axis, and all icon buttons share one geometry rule with a single coarse-pointer size override. The Viewer preview uses one compiled Files CSS snapshot without competing handwritten Files rules. Files and Outline use the same thin scrollbar mixin, including width and colors. Icons remain centered, and icon-action focus rings sit inside their targets. Copy, Open/Switch folder and Back/Leave remain direct whenever all fit, including wide touch layouts; narrower layouts retain Open first and move lower-priority commands to overflow. The same geometry applies to the expanded Copy action.
- Files tree rows use a 10px chevron/depth slot, 2px gap to a 16px identity box and 4px gap to the name. Root file and folder labels align at 35px from the row edge, gaining 11px over the prior geometry; each deeper level adds 10px. The full folder row remains the disclosure target. Navigation rows are 38px on fine pointers and 44px on coarse pointers, and virtual row estimates match those heights so targets do not overlap. File-row actions reserve text space when visible, with persistent actions on touch. These are Files-local layout contracts; Outline, Popup and Settings retain their existing geometry.
- Read mode can place a compact document-stat row above Markdown, an overlay scrollbar at the active scroll root, and a floating Back to top action after the user has scrolled far enough.
- Responsive layouts collapse or hide supporting rails before constraining document readability.

### Settings

- Settings uses page-level side navigation and bordered content sections.
- The Themes section is the sole authoring surface for named custom themes, their semantic colors, and their structured backgrounds.
- Shared fields, buttons, switches, badges, notices, loading, and status primitives come from `src/shared/`.
- Wide settings rows may use label/control columns; narrow layouts stack them. Document updates uses the shared `mdp-ui-select` in a 180–220px control column, with an associated label and description; it expands to available width when stacked.

### Popup

- Popup geometry remains compact and local to `src/popup/popup.scss`.
- The Popup selects built-in and saved custom themes but does not author theme colors or backgrounds.
- Shared primitives provide consistent controls and feedback without importing the Settings or Viewer stylesheet wholesale.

## Implemented shared primitives

The reusable React layer under `src/shared/react/` currently provides:

- `Button`
- `Switch`
- `NumberField`
- `Badge`
- `Notice`
- `LoadingState` and `Spinner`
- `SkeletonLine` and `SkeletonBlock`
- `useFileSchemeAccess`

Shared SCSS under `src/shared/styles/` covers tokens, buttons, forms, containers, status, loading, feedback, and skeletons. Viewer-specific primitives stay under `src/viewer/react/components/common/` when their behavior is not application-wide.

## Interaction states

| State | Contract |
| --- | --- |
| Default | Standard semantic text, surface, and border |
| Hover | Stronger border or soft semantic fill without layout movement |
| Pressed | Soft active fill or the shared subtle button press |
| Focus-visible | Shared visible focus outline |
| Selected/current | Soft blue fill plus strong text or another non-color cue |
| Disabled | Reduced emphasis, no active transform, non-interactive cursor |
| Busy | Stable width, progress feedback, and `aria-busy` where appropriate |
| Invalid | Danger treatment plus adjacent error text |
| Success | Accent treatment plus text or icon confirmation |

## Current component contracts

- Buttons use shared variants and preserve accessible labels while busy.
- File list refresh keeps its list strokes stationary while only the circular arrow rotates around its own center. Busy controls retain the link color, expose `aria-busy`, and prevent repeat activation; reduced motion keeps the arrow static.
- Document update dialogs share a neutral `--mdp-overlay-scrim`; the scrim does not derive from text color, so dark themes keep a dark overlay. Change Review additions/removals and update badges/notices use the theme's paired status foreground/background colors, including custom themes, rather than mixing status text onto an unrelated surface. Modal cards retain opaque theme surfaces over image and gradient backgrounds.
- Leaving a dirty editor uses a custom modal with the shared card, warning badge, and action footer. “Keep editing” receives initial focus; “Discard changes” uses the danger button. Escape and outside press cancel, focus returns to the edit action, and native dialog modality contains focus and blocks background interaction. Discard is disabled during Save; clean editors exit directly.
- Number fields keep validation text associated with their inputs.
- Switches are used for immediate boolean settings and include visible labels.
- Badges identify category or state; they are not actions.
- Notices present informational, warning, success, or error feedback with text.
- Loading states distinguish progress, empty content, and recoverable failure.
- Skeletons approximate final geometry, are hidden from assistive technology, and respect reduced motion.
- Viewer menus/tooltips use Viewer-specific implementations with root-aware dismissal and cleanup. Document updates uses a document-and-clock icon while it opens status details, then flips to a document-and-download icon when one click will apply a pending revision in read mode. A short-lived, clickable speech bubble announces the first pending transition without repeating for continuous writes; edit mode keeps the protected panel flow. Its status card uses the shared card, badge, notice, and button contracts with a 320px bound, expanding to 336px for the protected editor flow. A dedicated sync icon runs the manual check from the header position nearest the trigger pointer, while only the primary pending-update action occupies the lower action row. The card closes through the trigger, outside press or `Escape`, so its header does not need a separate close control. Motion respects `prefers-reduced-motion`.
- Change Review composes the shared card, badge, notice, status, button, and empty/error-state contracts inside a Viewer-owned two-pane comparison layout. Diff tables, source gutters, changed-area navigation, and responsive stacking remain Viewer-specific; modal focus and dismissal use the shared Viewer dialog. Loading a disk revision from edit mode uses the same shared warning/danger semantics and action footer in both the status popover and confirmation dialog.
- Document statistics use selectable muted text, hide for empty/non-Markdown/edit-mode content, and remain out of print output.
- Overlay scrollbars support drag, track click, Arrow/Page/Home/End keys, auto-hide or always-visible policy, and a minimum thumb size.
- Back to top appears only on a scrollable read surface after a distance threshold, uses smooth scrolling unless reduced motion is requested, and stays out of edit and print modes.

## Extending the system

Use the shared [UI design rule](../../.agents/rules/25-ui-design-system.md) for the lookup, proposal, scope decision, implementation, and reference-update workflow. This directory describes implemented contracts; proposed designs stay under `planning/` until implemented. Use the source notes in the affected preview to refresh its embedded component CSS and SVG snapshots when the accepted runtime contract changes.

## Maintaining the previews

- Keep these HTML references self-contained. No preview framework, CDN, or runtime dependency is required.
- Preserve the common navigation and its current-page marker across all four reference pages. The small duplicated shell is documentation-only; update it together when navigation changes.
- Keep component names, previews, states, usage notes, and source paths together. Group examples by Controls, Feedback & containers, and Patterns instead of creating a page for every primitive.
- Preserve file-type colors independently of application icon emphasis. Document existing grid and stroke differences accurately; future proposals stay under `planning/`.
- Verify local links and anchors, inline script syntax, light/dark appearance, keyboard interaction, and narrow layouts after restructuring previews.
- When an experiment is implemented, refresh the current references from runtime source and remove completed proposal material. Git history remains the archive.
