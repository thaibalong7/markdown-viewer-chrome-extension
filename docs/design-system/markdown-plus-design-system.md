# Markdown Plus Design System

This document records the visual system that already exists in the Markdown Plus Viewer. The Viewer runtime is the canonical reference. This document and its preview pages are derived references; they must follow runtime source rather than introduce a parallel visual direction.

## Source of truth

Use these sources in this order when values disagree:

1. `src/theme/index.js` — light/dark semantic colors and runtime CSS-variable mapping.
2. `src/shared/react/**` and `src/shared/styles/**` — reusable application primitives and their shared visual contracts.
3. `src/viewer/styles/base.scss` — default variables, focus treatment, toast states, and global Viewer foundations.
4. `src/viewer/styles/_variables.scss` — SCSS-only dimensions and reusable mixins.
5. `src/viewer/styles/layout.scss`, `toc.scss`, `explorer.scss`, `_floating-actions.scss`, and `_editor.scss` — component geometry and responsive behavior.
6. `src/viewer/styles/content/**/*.scss` — rendered-document typography and media styles.
7. This document, `markdown-plus-ui-demo.html`, and `markdown-plus-component-catalog.html` — documentation and visual previews only.

The Popup is a legacy surface and is not a design-system reference. The Settings page consumes the shared application tokens and implemented form/container/feedback primitives; it does not define the core system itself.

## Product character

Markdown Plus is a local-file document reader with developer utilities. Its visual character is:

- content-first and quiet;
- compact around navigation and actions;
- spacious enough inside the document;
- border-led, with shadows reserved for floating layers;
- neutral blue-gray surfaces with blue navigation, green success, amber edit/warning, and red failure/destructive states;
- predictable across long reading, workspace navigation, and editing sessions.

Do not turn application surfaces into a dashboard or marketing page. Avoid decorative gradients, oversized hero typography, permanent top chrome, heavy elevation, and unrelated accent colors.

## Core tokens

### Light theme

These values come from `LIGHT_THEME_COLORS` in `src/theme/index.js`.

| CSS variable | Value | Role |
| --- | --- | --- |
| `--mdp-bg` | `#f6f8fb` | Viewer canvas and side rails |
| `--mdp-surface` | `#ffffff` | Reading/editor surface and controls |
| `--mdp-panel-bg` | `#eef2f6` | Quiet grouped controls and status surfaces |
| `--mdp-panel-strong` | `#e3e9f0` | Stronger hover/pressed surface |
| `--mdp-text` | `#172033` | Primary UI text |
| `--mdp-body-text` | `#273043` | Rendered-document text |
| `--mdp-heading` | `#111827` | Headings and strong labels |
| `--mdp-muted` | `#667085` | Secondary text and idle icons |
| `--mdp-border` | `#dce2ea` | Standard borders and dividers |
| `--mdp-border-strong` | `#c5ced9` | Hover and structural borders |
| `--mdp-link` | `#2563eb` | Links, focus, navigation, active state |
| `--mdp-link-soft` | `#eaf2ff` | Active/selected blue surface |
| `--mdp-accent` | `#16815c` | Saved, copied, and positive state |
| `--mdp-accent-soft` | `#e8f6ef` | Positive-state surface |
| `--mdp-warning` | `#b35c00` | Edit, dirty, warning state |
| `--mdp-warning-soft` | `#fff3dc` | Warning-state surface |
| `--mdp-danger` | `#c2413a` | Error and destructive state |
| `--mdp-code-bg` | `#f2f5f8` | Code and plain-text surface |
| `--mdp-code-text` | `#172033` | Code text |

Table and toast tokens remain part of the runtime contract and should be reused instead of recreating close colors. See `src/theme/index.js` for their exact values.

### Dark theme

| CSS variable | Value | Role |
| --- | --- | --- |
| `--mdp-bg` | `#0d121b` | Viewer canvas and side rails |
| `--mdp-surface` | `#151b26` | Reading/editor surface and controls |
| `--mdp-panel-bg` | `#101722` | Quiet grouped controls and status surfaces |
| `--mdp-panel-strong` | `#1d2735` | Stronger hover/pressed surface |
| `--mdp-text` | `#edf2f7` | Primary UI text |
| `--mdp-body-text` | `#dce4ee` | Rendered-document text |
| `--mdp-heading` | `#f8fafc` | Headings and strong labels |
| `--mdp-muted` | `#9ba9bb` | Secondary text and idle icons |
| `--mdp-border` | `#2d3848` | Standard borders and dividers |
| `--mdp-border-strong` | `#465469` | Hover and structural borders |
| `--mdp-link` | `#7ab7ff` | Links, focus, navigation, active state |
| `--mdp-link-soft` | `#122b4d` | Active/selected blue surface |
| `--mdp-accent` | `#56d39a` | Saved, copied, and positive state |
| `--mdp-accent-soft` | `#123529` | Positive-state surface |
| `--mdp-warning` | `#f4b24e` | Edit, dirty, warning state |
| `--mdp-warning-soft` | `#3b2a0e` | Warning-state surface |
| `--mdp-danger` | `#ff8d85` | Error and destructive state |
| `--mdp-code-bg` | `#0b111a` | Code and plain-text surface |
| `--mdp-code-text` | `#e6edf3` | Code text |

### Semantic color rules

- Blue is for navigation, links, focus, active selection, and neutral in-progress state.
- Green is for successful completion, saved/copied feedback, and positive state.
- Amber is for edit affordances, unsaved state, warnings, and resource limits.
- Red is for errors and destructive actions.
- Do not use raw palette values in new surfaces when a semantic `--mdp-*` variable already expresses the role.
- Use `color-mix()` with the nearest semantic variable for subtle fills and borders; do not create a new near-duplicate hex value.

## Typography

### UI

Use the local system stack already present in Viewer:

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

Do not name `Inter` unless it is deliberately bundled. Otherwise rendering changes depending on fonts installed on the user's machine.

UI hierarchy in the current Viewer:

- panel title: `12px`, weight `750`, uppercase where appropriate;
- Files title: `15px`, weight `750`, normal case;
- row and button label: `13px` to `14px`, weight `600`;
- metadata: `10px` to `12px`;
- tooltip: `12px`, weight `500`;
- status bar: `11px` monospace.

### Document

Rendered Markdown uses user-configurable variables:

- `--mdp-font-family`, default `system-ui`;
- `--mdp-font-size`, default `16px`;
- `--mdp-line-height`, default `1.7`;
- `--mdp-content-max-width`, default `980px`.

The document font must not be reused as the application UI font. Code uses `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.

## Shape, spacing, and elevation

The current SCSS radius scale is canonical:

| SCSS token | Value | Typical use |
| --- | ---: | --- |
| `$radius-default` | `12px` | Toolbars, larger floating surfaces, code blocks |
| `$radius-small` | `8px` | Rows, controls, menus, notices |
| `$radius-tiny` | `6px` | Compact menu items and small controls |

Pills and status dots may use `999px` or `50%`.

Spacing does not currently expose a runtime token scale. New work should compose primarily from `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, and `48px`, while preserving an existing component's measured geometry when extending it.

Elevation rules:

- ordinary content, rails, rows, and controls use borders;
- standard controls may use `--mdp-shadow-subtle`;
- menus, mobile rails, tooltips, and temporary overlays use `--mdp-shadow-float`;
- never use a strong shadow to separate normal in-flow sections.

## Focus and motion

- Global focus treatment is a `2px` solid `--mdp-focus-color` outline with `2px` offset.
- Dense components may use `--mdp-link` directly for their focus outline.
- Hover/pressed transitions are normally `120ms` to `150ms`.
- Toast and mode transitions may use `180ms` or longer where the current Viewer already does so.
- Respect `prefers-reduced-motion`; reduce animations and transitions to effectively instant.
- Do not remove focus indication merely because hover styling exists.

## Iconography

- Use simple stroke icons with `currentColor`, round line caps/joins, and an optical size of `16px–18px` inside standard controls.
- Icons inherit the semantic color of their control; do not assign independent decorative colors.
- Decorative icons use `aria-hidden="true"`. Meaningful standalone icons require an accessible label on the owning control.
- Keep one icon family and stroke weight within a surface. Do not mix emoji, filled pictograms, and line icons as interchangeable controls.
- Status icons reinforce visible text; they never replace it.

## Layout contract

Read mode uses the current three-track shell:

```text
.mdp-root
  .mdp-body
    aside.mdp-sidebar.mdp-sidebar--files
    main.mdp-content-pane
      article.mdp-markdown-body
    aside.mdp-right-rail
      .mdp-floating-actions
      .mdp-sidebar-panel--outline
```

Default tracks:

- Files: `264px` via `--mdp-files-width`;
- content: `minmax(0, 1fr)`;
- right rail / Outline: `280px` via `--mdp-toc-width`;
- actions-only right rail: `60px` via `--mdp-actions-rail-width`.

Both side rails are sticky, full viewport height, independently scrollable where needed, and resizable on desktop. The content pane owns the white reading surface. The article itself stays transparent and centered; it is not an elevated card.

## Components

### Files rail

- Uses the canvas background and a strong right border.
- Header remains sticky inside the panel.
- Workspace context is a bordered, mixed surface; status badges use semantic soft colors.
- File rows intentionally retain the Viewer's current compact runtime density, padding, and `8px` radius. Do not resize or re-space them merely to adopt generalized application-control sizing. Explorer header and copy-link actions expand to `44px` on coarse pointers; file rows do not currently have that override.
- Active file uses a soft blue surface and a `3px` leading blue rail.
- Row actions can appear on hover/focus, but keyboard focus must make them visible.
- Empty/loading states use a dashed border and quiet surface.

### Outline rail

- Document actions sit above Outline in the same right rail.
- Outline rows are `36px` minimum on fine pointers and `44px` on coarse pointers.
- Hierarchy uses `9px` incremental left indentation per heading level.
- Active heading uses the same blue soft fill and leading rail as active files.
- Long labels truncate; the full accessible name must remain available.

### Document actions

The canonical action surface is the compact icon toolbar in the right rail, not an expandable labeled drawer.

- Toolbar: flexible row, `4px` gap, `6px` padding, `12px` radius.
- Icon button: `34px × 34px` on fine pointers, `44px × 44px` on coarse pointers, `8px` radius.
- Idle icons use muted color; hover and pressed states use blue/link semantics.
- Edit uses amber when available but inactive.
- Dirty save uses green with a separate amber dirty indicator.
- Export formats open in a lightweight floating menu.
- Every icon-only action requires an accessible label and tooltip.

### General button

`src/shared/styles/_button.scss` defines the reusable button foundation. The Viewer-specific `.mdp-button` composes its shared mixin, while imperative/shared surfaces can use the emitted `.mdp-ui-button` base class. Add a React wrapper only when a real React consumer needs behavior beyond native button props.

- minimum height `38px` on fine pointers and `44px` on coarse pointers;
- `7px 12px` padding;
- `8px` radius;
- `13px`, weight `600`;
- surface background, standard border, subtle shadow;
- `1px` downward transform when pressed;
- disabled opacity approximately `0.48`.

### Tooltip and menus

- Tooltip: maximum `280px`, `7px 9px` padding, `7px` radius, `12px` type.
- Tooltip uses high-contrast text-colored background and only floating elevation.
- Menus use surface background, standard border, and float shadow. Compact row menus use `8px` radius; the floating export menu uses `12px`.
- Menu items use `36px` to `38px` minimum height and a soft blue hover/focus surface.

### Toast

- Fixed at bottom center, maximum width `420px`.
- Uses semantic info/success/warning/error token groups.
- Uses balanced horizontal padding without a leading rail; its bottom-center placement should read as a compact floating message rather than a side-attached notice.
- Semantic fill, border, readable text, and explicit message wording communicate state without relying only on color.
- Toast is feedback, not a persistent action container.

### Markdown body

- Article background is transparent within the surface-colored content pane.
- Default maximum width is `980px` and is user configurable.
- Desktop padding is `clamp(16px, 2vw, 28px) clamp(20px, 3.5vw, 48px) clamp(36px, 5vw, 64px)`.
- Heading weight is `720`; H1 and H2 use bottom borders for hierarchy.
- Inline code uses the code surface, a subtle border, and `5px` radius.
- Blockquotes use a `3px` blue leading border and a mixed soft-blue fill.
- Code, tables, images, Mermaid, plain text, SQL, and print behavior remain owned by their current content partials.

### Editor

- Edit mode removes Files and Outline and retains an actions-only right rail.
- Split mode is editor / resize handle / preview / actions rail.
- Focus mode is editor / actions rail; preview is hidden.
- Editor and preview scroll independently on desktop.
- Status bar is `30px` high, monospace `11px`, and uses semantic dirty/saving/saved colors.
- Preview typography follows editor settings while editing; reader settings return on exit.
- Under `900px`, split editor and preview stack vertically and the actions rail becomes a floating surface.

## Responsive behavior

Use the runtime breakpoints rather than generic device names:

- `1024px–1279px`: right Outline track is capped at `224px`.
- `< 1024px`: Files becomes a fixed overlay; it is no longer a grid track.
- `< 900px`: Outline is hidden and the right rail becomes actions-only.
- `< 640px`: the right rail becomes a floating bottom-right toolbar; the content pane uses compact padding.
- Coarse pointers: primary row/action targets expand to `44px` where the current component has a coarse-pointer rule.

New application pages such as Settings may use their own page layout, but their colors, type, radii, focus, controls, state semantics, and motion must derive from this system.

## Accessibility contract

- Preserve semantic landmarks and real buttons, links, labels, and form controls.
- Icon-only controls require both an accessible name and a tooltip.
- Do not use color as the only signal for error, success, dirty, active, or disabled state.
- Keep visible keyboard focus on every interactive element.
- Preserve readable contrast for metadata at its actual font size.
- Touch/coarse-pointer targets should reach `44px`; compact desktop controls may follow the current `34px`/`38px` Viewer geometry.
- Honor reduced motion and avoid hover-only access to required actions.

## Extending the system

Before adding a new shared UI element:

1. Start from the semantic variables above.
2. Match the Viewer font, radius, focus, state, and motion contracts.
3. Prefer a shared partial/component under `src/shared/` when both Popup/Settings/Viewer will consume it.
4. Do not import one product surface's complete stylesheet into another.
5. Add a new token only when no existing semantic role fits.
6. Update this document and the relevant preview page after runtime source changes—not before them.

## Component maturity and naming

Every component belongs to one maturity level:

| Level | Meaning | May production code depend on it? |
| --- | --- | --- |
| Runtime | Implemented and exercised in the Viewer | Yes |
| Specified | Defined here and demonstrated in the catalog, but not yet extracted into shared runtime code | Not until implemented |
| Legacy | Existing UI that predates this system, currently the Popup | No; migrate away from it |

Shared application components use the neutral `mdp-ui-*` class prefix and live under `src/shared/react/` plus `src/shared/styles/`. Viewer-specific classes remain `mdp-*`; page-specific layout classes may remain `settings-*` or `popup-*`, but their primitives should compose the shared components.

Do not copy CSS from either preview page into product pages. The catalog is a specification. Implement each shared primitive once, add focused tests, and then consume it from Settings or a refreshed Popup.

## Complete component catalog

This is the required component set for the extension's current and foreseeable product surfaces.

| Category | Components | Maturity |
| --- | --- | --- |
| Foundations | semantic tokens, typography, spacing, radii, elevation, focus, motion, icons | Runtime |
| Actions | text button, icon button, button group, split/menu action, file-picker action | Runtime + specified |
| Forms | field, input, number input, select, textarea, checkbox, radio, switch, search field, field error | Runtime + specified |
| Navigation | Files/Outline rows, application side navigation, tabs, breadcrumbs, pagination | Runtime + specified |
| Containers | app shell, page header, section/card, settings row, action footer, divider | Runtime + specified |
| Data display | badge, status, key/value metadata, table, code/value display | Runtime + specified |
| Feedback | inline notice, toast, progress, spinner, skeleton, empty state, error state | Runtime + specified |
| Overlays | tooltip, menu/popover, dialog, destructive confirmation | Runtime + specified |

Components such as avatars, calendars, date pickers, steppers, and large data grids are not part of the product's current domain. Add them only when a concrete feature requires them, using the extension rules in this document.

## Shared interaction states

Every interactive component must define the applicable states instead of relying on browser defaults accidentally:

| State | Visual rule |
| --- | --- |
| Default | Standard semantic text, surface, and border |
| Hover | Stronger border or soft semantic fill; never layout movement except the existing `1px` button press |
| Pressed | Soft blue active fill or `translateY(1px)` for buttons |
| Focus-visible | `2px` semantic focus outline with `2px` offset |
| Selected/current | Soft blue fill, stronger text, and an indicator beyond color when practical |
| Disabled | Approximately `0.48–0.55` opacity, no active transform, `not-allowed` cursor |
| Busy | Preserve component width, replace or accompany the label with progress, set `aria-busy` |
| Invalid | Danger border plus adjacent error text; never border color alone |
| Success | Accent color plus text/icon confirmation |

## Application-level component specifications

The following components are specified for future Settings and Popup implementation. Their visual examples live in `markdown-plus-component-catalog.html`; `markdown-plus-ui-demo.html` remains focused on the canonical Viewer shell.

### Button

Anatomy: optional leading icon, label, optional trailing icon/spinner.

Sizes:

- default: minimum `38px`, `7px 12px`, `13px`, `8px` radius;
- large/touch: minimum `44px`, `9px 14px`;
- compact: minimum `32px`, only inside dense toolbars or table rows.

Variants:

- primary: `--mdp-link` background and `--mdp-surface` text;
- secondary: surface background, standard border, primary text;
- quiet: transparent border/background, muted text;
- danger: danger text and mixed danger hover surface;
- icon-only: square, accessible label and tooltip required.

Use one primary action per local decision area. Save may be primary while saved feedback remains green; checked/selected is blue, not green.

### Text link

- Inline links use `--mdp-link`, a visible underline, and the shared focus treatment.
- Navigation links may remove the underline only when their container and current state make the role unambiguous.
- External/new-tab behavior must be communicated in accessible text or an icon with an accessible description.
- Do not style a button as an inline link when it performs a non-navigation action unless the surrounding pattern clearly calls for a quiet action.

### Button group and menu action

- Use a flex group with `4px` gap for independent actions.
- Use an attached split/menu action only when the secondary choices are variants of the main action.
- Menu triggers expose `aria-haspopup`, `aria-expanded`, and restore focus when dismissed.
- File import uses a visible button or label; do not leave a transparent native file input in the tab order.

### Field

Anatomy: label, control, optional helper, optional validation message. Label and error text must be programmatically associated with the control.

- default control height: `44px` for Settings and other form-heavy pages;
- horizontal padding: `10px 12px`;
- standard border and `8px` radius;
- surface background and primary text;
- placeholder uses muted text but must remain readable;
- numeric values and technical paths may use the mono stack;
- invalid fields use danger border plus a `12px` error message;
- disabled fields use the shared disabled state and remain legible.

Textarea uses the same field shell, a minimum height of `96px`, vertical resize by default, and mono only for structured/code input.

Related fields use `fieldset` and `legend` when they form one question. Visual grouping must not replace the semantic group name.

### Search field

- Uses the normal field shell with a leading search icon and optional clear action.
- Clear is a real button with an accessible name.
- Result counts are metadata, not placeholder text.
- Search in compact overlays may use `30px–34px` controls, matching the current CodeMirror search surface.

### Checkbox and radio

- Visual control: `18px–20px`; interactive label row: at least `38px` and `44px` on coarse pointers/form pages.
- Checked/selected uses link blue. Green is reserved for successful outcomes.
- The visible text and control are part of the same label target.
- Indeterminate checkbox must have a distinct mark and `aria-checked="mixed"` where applicable.

### Switch

- Interactive wrapper: minimum `44px` high.
- Track: `46px × 26px`; thumb: `20px`.
- Off uses border/panel colors; on uses `--mdp-link`.
- The setting name remains visible next to the switch and belongs to the same label target.
- Use switches only for immediate boolean changes. Use checkbox when submission is deferred with a larger form.

### Select

- Uses the same height, border, radius, typography, focus, disabled, and invalid treatment as text fields.
- Prefer native select for short, static option lists.
- A custom combobox is allowed only when search, rich options, or virtualization is required.

### Application side navigation

- Default row height: `44px` minimum; two-line rows may use `56px–60px`.
- Active item uses soft blue fill, strong text, and a `3px` leading rail.
- Optional description uses muted `11px–12px` text with sufficient contrast.
- On narrow layouts, convert the navigation to tabs or a native select without changing section ownership.

### Tabs

- Use for peer views within the same local context, not for unrelated application destinations.
- Minimum height: `38px`, or `44px` on coarse pointers.
- Active tab uses strong text and either a `2px` underline or soft-blue contained state.
- Implement `role="tablist"`, `role="tab"`, `aria-selected`, roving focus, and associated tab panels.

### Breadcrumbs and pagination

- Breadcrumbs are for hierarchical location only; truncate middle segments before the current item.
- Pagination is only for genuinely paged collections. Use compact secondary buttons, expose current page with `aria-current="page"`, and do not use it for the current short recent-files list.

### Page header

- Contains product/page identity, optional description, status, and local actions.
- Use an opaque surface or canvas; avoid decorative glass treatment in normal page flow.
- Page title should normally stay within `24px–30px`; avoid marketing-scale hero headings.
- On narrow layouts, status/actions may wrap to a second row.

### Section/card

- Standard container: surface background, standard border, `12px` radius, no default shadow.
- Use `8px` radius for nested groups.
- Header/body/footer remain optional; do not add chrome when spacing alone communicates grouping.
- Settings rows use a two-column label/control layout on wide screens and one column on narrow screens.
- Avoid stacking a separate card around every single field.

### Divider and disclosure

- Divider is a `1px` `--mdp-border` line used only when spacing is insufficient to communicate separation.
- Do not place dividers between every item in an already separated list.
- Disclosure uses a real button with `aria-expanded` and `aria-controls`, or native `details/summary` for simple non-modal content.
- The chevron rotates without being the only expanded/collapsed signal; disclosure content remains in normal document flow.

### Action footer

- Separates commit/reset actions from form fields using a top border and mixed panel surface.
- Primary action aligns to the logical end; reset/quiet action aligns to the start.
- Stack full-width actions on narrow screens, keeping primary first in keyboard order even if visual order changes.

### Badge and status

- Badge: compact label for category or state, not an action.
- Default badge uses panel background and muted text; blue/green/amber/red variants follow semantic roles.
- Status combines dot/icon plus text. Never communicate status with a dot alone.
- Avoid all-caps below `10px`; use letter spacing sparingly.

### Metadata and code/value display

- Key/value metadata uses muted `11px–12px` labels and primary values; technical values may use monospace.
- Paths, IDs, and long values truncate visually but preserve the complete accessible value and copy behavior where useful.
- Short code/value chips use the code surface and tiny radius; multiline code uses the existing Viewer code-block treatment.

### Inline notice

Variants: info, success, warning, error.

- Uses semantic soft fill, border or `3px` leading rail, and readable text.
- Contains optional title and recovery action.
- `role="alert"` is reserved for urgent, newly introduced errors; ordinary helper notices remain non-live content.

### Progress and spinner

- Reuse `Spinner` / `LoadingState` from `src/shared/react/LoadingState.jsx` and `src/shared/styles/_loading.scss` rather than redefining animation or geometry per surface.
- Determinate progress uses a labeled bar and exposes `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
- Indeterminate progress uses a spinner or skeleton and `aria-busy`; do not show fake percentages.
- Spinner inherits current text color and does not replace the accessible loading label.
- Long operations need a cancel action when cancellation is supported.

### Skeleton

- Reuse `src/shared/react/Skeleton.jsx` and `src/shared/styles/_skeleton.scss`.
- Match the approximate geometry of the content being loaded.
- Hide decorative skeleton segments from assistive technology and label the loading region once.
- Disable shimmer through reduced-motion behavior.

### Empty and error states

- Reuse the `mdp-ui-state*` classes from `src/shared/styles/_feedback.scss`. Add a React wrapper only when multiple React consumers need shared behavior beyond this markup contract.
- Empty state explains what is absent and, when useful, presents one next action.
- Error state names the failure in user-safe language and offers retry/recovery where possible.
- Use a dashed quiet container for small in-panel states; use a bordered section for page-level states.
- Do not use an illustration merely to fill space.

### Table

- Use for comparable values with real column relationships.
- Keep headers visible and concise; align numbers consistently and use tabular numerals.
- Wrap wide tables in a horizontal scroll container instead of shrinking text.
- Row actions use compact buttons but remain keyboard accessible.
- Do not use a table for simple settings rows.

### Tooltip

- Supplements an already accessible control; it does not supply the only accessible name.
- Appears after the shared delay, does not receive focus, and dismisses on blur/pointer leave/Escape as appropriate.
- Maximum width `280px`, `12px` text, high-contrast background.

### Menu/popover

- Menu contains actions; popover may contain structured non-modal controls or information.
- Use surface background, border, float shadow, and `8px–12px` radius.
- Support click-outside, Escape, focus restoration, and viewport collision handling.
- Minimum item height: `36px`, or `44px` for coarse-pointer contexts.

### Dialog and destructive confirmation

- Use a native or equivalently accessible modal dialog with title, optional description, focus trap, Escape behavior, and focus restoration.
- Width should normally clamp between `320px` and `520px`.
- Footer contains secondary cancel and one primary decision.
- Destructive confirmation uses danger styling on the confirming action and names the affected data explicitly.
- Do not use browser `confirm()` once the shared dialog primitive exists.

## Component implementation order

Continue the application layer in this order. Steps 1–4 now have a runtime baseline in `src/shared/` and Settings; the named components that are not yet needed remain specified rather than prematurely implemented:

1. Shared application tokens and field/button foundations.
2. Button, IconButton, Field, Select, Checkbox, Radio, and Switch.
3. Section/card, settings row, page header, side navigation, and action footer.
4. Badge/status, notice, progress, empty/error state, and shared skeleton adoption.
5. Menu/popover and Dialog/ConfirmDialog.
6. Rebuild Popup from the same primitives; Settings is already migrated.

Each implemented component needs keyboard behavior, accessible naming, light/dark examples, disabled/busy/error states where relevant, and focused style or component tests.
