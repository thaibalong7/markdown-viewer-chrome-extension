/**
 * Cross-cutting viewer chrome constants (toolbar, scroll padding, sidebar bounds, copy UX).
 * SCSS alignment: `$mdp-toolbar-stack` in `src/viewer/styles/_variables.scss` ↔ toolbar fallback height.
 */

/** Fallback when `.mdp-toolbar` height cannot be measured (px). */
export const MDP_TOOLBAR_HEIGHT_FALLBACK_PX = 49

/** Extra scroll offset below the toolbar for hash jumps and TOC scroll (px). */
export const SCROLL_PADDING_PX = 8

/** Sidebar resize lower bound (px). */
export const SIDEBAR_MIN_WIDTH_PX = 220

/** Sidebar resize upper bound (px). */
export const SIDEBAR_MAX_WIDTH_PX = 520

/** How long code / Mermaid copy buttons stay in the "copied" visual state (ms). */
export const COPY_BUTTON_FEEDBACK_MS = 2500
