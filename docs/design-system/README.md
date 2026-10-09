# Markdown Plus Design System

This directory records the visual contracts currently implemented by Markdown Plus. Runtime source is canonical; this guide and its standalone HTML previews are derived references.

## Find the relevant contract

For UI tasks, start with this map and read only the relevant sections and source files. Agent design review, planning, approval, and migration decisions are governed by the shared [UI design rule](../../.agents/rules/25-ui-design-system.md).

| Task | Read here / preview | Runtime lookup |
| --- | --- | --- |
| Colors, spacing, typography, density, focus, or states | [Semantic tokens](#semantic-tokens) through [Interaction states](#interaction-states); select the relevant subsection. [Foundations](./index.html#colors), [geometry](./index.html#geometry), [interaction](./index.html#interaction) | `src/shared/styles/_tokens.scss` and the affected shared style; `src/viewer/styles/_variables.scss`; theme values in `src/theme/index.js` |
| Buttons, fields, switches, badges, notices, loading | [Implemented shared primitives](#implemented-shared-primitives), [Current component contracts](#current-component-contracts); [Controls](./components.html#controls), [Feedback & containers](./components.html#feedback) | The matching file in `src/shared/react/` and `src/shared/styles/`; follow the specimen's source notes |
| Dialogs, menus, tooltips, or a composed workflow | [Focus, motion, and accessibility](#focus-motion-and-accessibility), [Current component contracts](#current-component-contracts); [Overlays](./components.html#overlays-title), [Patterns](./components.html#patterns) | `src/viewer/react/components/common/`, `src/viewer/react/hooks/useDismissableLayer.js`, `useModalDialog.js`, and the owning surface's component/style |
| Viewer rails, editor, document surface, or responsive composition | [Viewer](#viewer), [Sidebar composition](#sidebar-composition); [Viewer preview](./viewer.html#layout) | `src/viewer/react/components/` and the relevant `src/viewer/styles/` partial; document typography lives under `src/viewer/styles/content/` |
| Viewer commands, Show/Hide controls, or sidebar scrollbars | [Document actions](#document-actions), [Panel toggles](#panel-toggles), [Sidebar scrolling](#sidebar-scrolling); [integration guide](../document-actions.md); [Viewer states](./viewer.html#states) | `document-actions-model.js`, `FloatingActions.jsx`, `RightRail.jsx`, `PanelToggleButton.jsx`, `ViewerScrollbar.jsx`, and their local styles |
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

The approved set contains 49 application glyphs and 8 explorer identities. `src/shared/icons/application-icons.js` owns 24px geometry with 1.8 stroke, round caps and joins; `file-type-icons.js` owns the separate native 16px family with fixed colors and 1.25 stroke. `AppIcon` and `FileTypeIcon` render these definitions declaratively in React. `createAppIconSvg` renders the same trusted definitions through DOM APIs for code blocks, diagrams, and image lightboxes. Viewer icon components remain small compatibility adapters. The Viewer-local Porcelain sidebar toggle uses the dedicated sidebar-chevron pair through an 18 × 24 optical viewport, rendered at 12 × 16px with a 1.5px visible stroke; standard chevrons and application controls keep their existing geometry.

Use 16px artwork in explorer lists, 18–20px for application actions, and 24px for larger specimens. The enclosing control owns target size, accessible name, tooltip, and interaction state. Application glyphs use `currentColor` except the highlighted `folder-select` action; file identities preserve their colors in selected rows and dark themes. Open/Switch folder uses the highlighted `folder-select` action glyph: the familiar gold folder (`#D6A34A`, translucent fill) with a blue opening arrow using `--mdp-link` over a surface-colored backing. This is a deliberate action-specific exception to monochrome application icons, shared by the header, overflow and detail button, while expanded tree folders use the colored open-folder identity variant; Collapse folders uses overlapping layers and a minus rather than directional chevrons. Back to original file and Leave workspace use related document/workspace outlines with an outward return arrow so the navigation target remains recognizable at compact sizes.

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
| Navigation row (Outline / Files) | `36px` / `38px` | `44px` |
| Viewer sidebar toggle hit area | `24 × 44px` | `44 × 44px` |

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
- Shared fields, buttons, primary Viewer actions, and rows use at least `44px` targets on coarse pointers. Porcelain sidebar toggles separate a 12 × 26px visible face from 24 × 44px fine-pointer and 44 × 44px coarse-pointer targets. The auxiliary collapsed Files edge hit area retains its existing geometry.
- Honor reduced motion in skeletons, transitions, and overlays.
- Menus and overlays must support Escape, outside dismissal, focus restoration, and cleanup.

## Layout contracts

### Viewer

The independently resizable Files rail, center document/editor pane, and right rail form the Viewer shell. The right rail combines capability-driven document actions with heading navigation. Files and Outline widths use separate CSS variables and tab-session preferences; collapse preserves the 8px Files interaction gutter or the 60px document-actions rail. Supporting rails adapt before constraining document readability. Existing mobile docks, editor layouts, document capabilities, and settings schema retain their policies.

Read mode can place a compact document-stat row above Markdown, an overlay scrollbar at the active scroll root, and a floating Back to top action after the user has scrolled far enough.

#### Sidebar composition

Expanded desktop reading mirrors the Files two-row rhythm. Files retains its header, details disclosure/card, location/count row, contextual commands, and tree structure. Outline places document actions on the left and the uppercase OUTLINE label on the right of its first row, followed by On this page and the loading/heading count at opposite ends of the second row. It has no additional title row below the commands. The title reserves 60px with an 8px gap; only the remaining command wrapper is measured for overflow.

| Geometry | Fine pointer | Coarse pointer, desktop reading |
| --- | --- | --- |
| Effective top inset | 16px | 16px |
| First / second row | 36px / 44px | 52px / 52px |
| Gap before each list | 12px | 12px |
| Outline / Files navigation rows | 36px / 38px | 44px / 44px |
| First row at panel widths up to 280px | Same single row | 86px, with label above commands |

The narrow touch rule uses panel width, not viewport width: the right-rail container threshold is 257px after its 22px padding and 1px border; Files uses 263px after its 16px padding and 1px border. The controls remain on one line and overflow into More. Files details can add height independently. Shared rhythm variables live in `layout.scss`; Files geometry lives in `explorer.scss`, and heading geometry lives in `toc.scss`. Heading virtual-row estimates match the pointer target heights.

#### Document actions

Direct icons form three groups: Quick access (Updates, Theme), Document (View changes, Edit or Save/Done/Focus, applicable source/rendered controls, Copy), and Output (Print, Export). Unsupported actions are filtered before layout. Updates and Theme remain first when supported; review stays direct when a comparison is available, including retained history. One-pixel dividers separate groups. Dense targets are 28px with 18px glyphs, or 44px on coarse pointers. A prefix remains direct and the suffix enters More in the same order, with export formats flattened. Existing semantic accents remain in the direct row: Theme uses blue for the moon/dark target and amber for the sun/light target; Edit is amber, active editing/focus uses blue, and Save/copied feedback uses green. Ordinary commands retain the quiet default and blue hover treatment.

The collapsed Outline rail retains 60px and aligns its first icon with Files Refresh independently of Files visibility. Top insets are 57.5px fine, 69.5px touch, or 103.5px narrow touch; bottom spacing is 16px. Its horizontal group dividers have 8px block margins, included in the vertical overflow budget. No inline restore strip is added. Catalog ownership, extension workflow, focus, and capability policy are documented in [Document actions](../document-actions.md).

#### Panel toggles

Both sidebars use the accepted Porcelain #22 design through `PanelToggleButton.jsx`. The visible face is 12 × 26px with 6px outer corners; hit areas are 24 × 44px fine and 44 × 44px coarse. Artwork mirrors across Files/Outline and expanded/collapsed states. The centered 12 × 16px chevron uses the shared sidebar-chevron pair with an 18 × 24 optical viewport and 1.5px visible stroke. The 2.1px accent dot sits 4px from the face top and 1.75px toward the chevron tip.

The tab uses semantic surface, muted, border, link, and link-soft colors. Its outer edge retains a solid 1px outline; only the panel-facing edge is open. In `layout.scss`, remove the Files inner edge with `border-left-width: 0` so the mirrored Outline skin can restore that width without losing the solid border style. Hover/focus strengthen the border; the collapsed state uses the link-soft surface. A 580ms light pass runs once on hover, keyboard focus, or activation, with no idle animation or chevron movement. Reduced motion suppresses the effect. Native button semantics, Show/Hide accessible names and tooltips, `aria-controls`, `aria-expanded`, focus return, and restored panel width/scroll position remain part of the contract.

#### Sidebar scrolling

Files and Outline reuse `ViewerScrollbar.jsx` and the existing auto-hide/always-visible setting, matching the document viewer's drag, track-click, Arrow/Page/Home/End behavior and minimum thumb size. The sidebar variant uses an 8px overlay track with a 6px thumb over the stable native list gutter; it portals into the Viewer root so filtered rail backgrounds do not change viewport coordinates. Auto-hide reveals on scrolling or interaction and hides after 1,000ms of inactivity, while focus, hover, or dragging keeps it visible. Non-overflowing lists have no interactive overlay.

Observe virtual-list content as well as the viewport so heading loading, folder expansion/collapse, and file scans update thumb geometry. Collapsing a panel tears down its overlay and observers; reopening restores its list scroll position. The standalone [Viewer preview](./viewer.html) simulates visibility using native scrollbars; it does not execute the React overlay implementation.

#### Files navigation

- Files folder actions retain the gold folder/blue arrow glyph, navigation icons and folder/back detail actions use the link color, and successful Copy uses green feedback. Files uses two compact rows: a Files title with a standalone details disclosure and contextual actions, followed by the current location as plain text (no leading folder icon) and supported-file count beside Collapse folders and Refresh. Folder mode has no badge or Folder tree/Folder files label. Workspace mode keeps the existing green Workspace badge beside Files; it remains visible with details closed and on narrow layouts. The location names the selected workspace root in Workspace mode and the current document’s folder in Folder mode. The workspace root stays stable when navigating nested files; scan entry updates mode and root together, and scanning replaces the settled count with Scanning… rather than a misleading zero. Folder trees can appear in either mode, so tree shape never determines the badge. Shared PanelHeader, Popup and Settings retain their existing composition; Outline uses the local mirrored composition described above.
- The details disclosure is always a separate button with `aria-expanded` and `aria-controls`. Its `file-details` glyph shows an information card with metadata lines and a small chevron: only the chevron turns upward when expanded, keeping the card upright and distinct from folder-tree disclosure arrows. The glyph stays at 16px inside the existing 28px control (44px on coarse pointers). At rest, the closed disclosure inherits the muted icon and transparent background of Files context commands; the expanded disclosure uses `--mdp-text` over the neutral `--mdp-panel-bg`. Shared blue hover feedback and the visible focus ring remain intact; expansion is also conveyed by the chevron direction and `aria-expanded`. With details closed, Open/Switch folder, Copy link and Back/Leave workspace use direct icon buttons; only commands that do not fit enter More. With details open, Copy is an icon button beside the filename. A successful copy temporarily replaces the link glyph with the shared green checkmark feedback used by other Viewer copy controls. Open/Switch folder and Back/Leave workspace are separate full-width labeled buttons stacked inside the same card footer with a 6px gap. Collapsing hides the entire card and returns navigation to an icon in the header (or overflow when space runs out); compact header actions fade and scale in from the disclosure edge with a short stagger. The card's label, filename and plain directory path start on the same left edge; decorative leading file/folder icons are omitted from metadata. Both footer buttons share the same left and right edges. Text actions use matching 16px icon slots, 8px gaps and 32px fine-pointer / 44px coarse-pointer minimum heights. Copy stays disabled for virtual files; its overflow item remains the single-line `Copy link` label and exposes the unavailable reason through its tooltip and accessible name. Navigation retains busy/entry-file restrictions. Details starts closed for new tabs and remembers either choice across navigation/reloads. Long paths show the last two segments, with the full path in the title and accessible label. The existing 200ms height transition and compact-action reveal both respect reduced motion; closing immediately makes the region invisible and inert. Warnings, scan-limit recovery and progress/cancel remain outside hidden details. Overflow menu icons use fixed 16px slots and labels share one start alignment. The menu width is bounded by the rendered Files header rather than the saved sidebar width, keeps an inner edge gap at narrow sizes, and scrolls vertically before leaving the viewport.
- Files aligns the standalone header disclosure, tree Refresh and file-row More on the existing trailing axis: 28px square controls, 4px action gaps, 16px artwork and 44px coarse-pointer targets. The Files sidebar keeps symmetric 8px padding; header and toolbar actions retain an 11px trailing inset. File-row actions deduct the measured native scrollbar gutter from their inset and reserve matching text space. Contextual commands overflow before the Workspace badge truncates; at minimum widths on coarse pointers the header control group can wrap below the intact heading. The directory name truncates before the count/actions. FilesPanel mounts ExplorerPanel directly, with no scroll-viewport horizontal offset. Shared panel flex layout stays in layout.scss and Files geometry stays in explorer.scss. The Viewer preview uses one compiled Files CSS snapshot. Focus rings remain inside icon targets. This responsive command placement and card composition are Files-local, not a new shared PanelHeader or ActionMenu variant.
- Files tree rows use a 10px chevron/depth slot, 2px gap to a 16px identity box and 4px gap to the name. Root file and folder labels align at 35px from the row edge, gaining 11px over the prior geometry; each deeper level adds 10px. Within every tree level, folders appear before files and each group is sorted by name without case sensitivity. The full folder row remains the disclosure target. Navigation rows are 38px on fine pointers and 44px on coarse pointers, and virtual row estimates match those heights so targets do not overlap. Expanding or collapsing one folder, including Collapse folders, animates the virtual list height and stable row positions for 180ms while entering and exiting rows fade with a short vertical offset; the disclosure chevron rotates over 160ms. Reduced motion applies the final tree state immediately. File-row actions reserve text space when visible, with persistent actions on touch. These are Files-local layout contracts; Outline, Popup and Settings retain their existing geometry.

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
- Replace stale component CSS snapshots rather than stacking conflicting old rules below the new implementation. Preserve intentional preview simulation styles separately.
- When an experiment is implemented, refresh the current references from runtime source and remove completed proposal material. A prototype lab explicitly retained by the user must link implemented contracts and distinguish alternative designs and fixture behavior; Git history remains the archive for implementation history.
