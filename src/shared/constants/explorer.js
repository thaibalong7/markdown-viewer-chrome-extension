/**
 * Explorer: virtual URL prefixes + **single source of truth** for scan limits.
 * `src/settings/default-settings.js` reuses these for `DEFAULT_SETTINGS.explorer`; scanners use the same
 * values when `settings.explorer.*` is missing or non-finite after merge.
 */

/** Workspace virtual file href prefix (directory picker / webkitdirectory without real `file:` URLs). */
export const MDP_WS_FILE = 'mdp-ws-file:'

/** Workspace virtual directory href prefix. */
export const MDP_WS_DIR = 'mdp-ws-dir:'

/** Default max folder depth (persisted default + runtime fallback). */
export const DEFAULT_EXPLORER_MAX_SCAN_DEPTH = 4

/** Default max supported files when `settings.explorer.maxFiles` is unset or invalid. */
export const DEFAULT_EXPLORER_MAX_FILES = 2000

/** Default max folders visited when `settings.explorer.maxFolders` is unset or invalid. */
export const DEFAULT_EXPLORER_MAX_FOLDERS = 500

/** Default policy for applying nested `.gitignore` rules during workspace scans. */
export const DEFAULT_EXPLORER_RESPECT_GITIGNORE = true

/** Default policy for restoring a file-backed workspace when a viewer mounts. */
export const DEFAULT_EXPLORER_RESTORE_LAST_WORKSPACE = true
