# Markdown Plus Design System

This document records the visual contracts currently implemented by Markdown Plus. Runtime source is canonical; this document and `design-system-demo.html` are derived references.

## Source of truth

Use these sources in order when values disagree:

1. `src/theme/index.js` for reader presets and runtime CSS-variable mapping.
2. `src/shared/react/**` and `src/shared/styles/**` for reusable application primitives.
3. `src/viewer/styles/**` for Viewer foundations, layout, document typography, and components.
4. `src/options/options.scss` and `src/popup/popup.scss` for surface-specific layout.
5. This document and `design-system-demo.html` for explanation and preview only.

## Product character

Markdown Plus is a local-file document reader with developer tools. Its visual language is:

- content-first and quiet;
- compact around navigation and actions;
- spacious inside the document surface;
- border-led, with shadows reserved for floating layers;
- neutral blue-gray surfaces with blue navigation, green success, amber edit/warning, and red failure/destructive states;
- predictable across reading, workspace navigation, and editing.

Avoid decorative gradients, marketing-scale headings, permanent top chrome, heavy elevation, and unrelated accent colors in application surfaces.

## Semantic tokens

Viewer color values are owned by the light and dark presets in `src/theme/index.js`. Shared application fallbacks live in `src/shared/styles/_tokens.scss`.

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
| `--mdp-link` | Links, focus, navigation, active state |
| `--mdp-link-soft` | Selected/navigation surface |
| `--mdp-accent` | Saved, copied, and positive state |
| `--mdp-warning` | Editing, dirty state, and warnings |
| `--mdp-danger` | Errors and destructive actions |
| `--mdp-code-bg` | Code and plain-text surface |

Use semantic variables instead of adding near-duplicate raw colors. Blue communicates navigation or selection, green successful completion, amber editing/warnings, and red errors or destructive actions.

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

## Focus, motion, and accessibility

- Preserve semantic landmarks and native buttons, links, labels, and form controls.
- Every icon-only control needs an accessible name and tooltip.
- Use a visible `2px` focus outline with offset for keyboard interaction.
- Do not communicate active, dirty, success, or failure states through color alone.
- Keep coarse-pointer targets at least `44px`; compact desktop controls may use the current `34px`–`38px` geometry.
- Honor reduced motion in skeletons, transitions, and overlays.
- Menus and overlays must support Escape, outside dismissal, focus restoration, and cleanup.

## Layout contracts

### Viewer

- The Files panel is an independently resizable left rail.
- The center pane owns the rendered document and editor layouts.
- The right rail combines capability-driven document actions with the Outline.
- Files and Outline widths use separate CSS variables and session preferences.
- Responsive layouts collapse or hide supporting rails before constraining document readability.

### Settings

- Settings uses page-level side navigation and bordered content sections.
- Shared fields, buttons, switches, badges, notices, loading, and status primitives come from `src/shared/`.
- Wide settings rows may use label/control columns; narrow layouts stack them.

### Popup

- Popup geometry remains compact and local to `src/popup/popup.scss`.
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
- Number fields keep validation text associated with their inputs.
- Switches are used for immediate boolean settings and include visible labels.
- Badges identify category or state; they are not actions.
- Notices present informational, warning, success, or error feedback with text.
- Loading states distinguish progress, empty content, and recoverable failure.
- Skeletons approximate final geometry, are hidden from assistive technology, and respect reduced motion.
- Viewer menus/tooltips use Viewer-specific implementations with root-aware dismissal and cleanup.

## Extending the system

When adding a UI element:

1. Start with existing semantic tokens and interaction states.
2. Keep surface-specific layout local.
3. Promote a component or style to `src/shared/` only when multiple surfaces share the contract.
4. Preserve keyboard behavior, accessible naming, light/dark behavior, and reduced motion.
5. Update this document and the demo after the runtime implementation changes.

The design documentation describes implemented contracts. Future component ideas belong in an active plan, not in this document or the demo.
