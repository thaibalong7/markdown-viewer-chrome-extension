import { getDefaultPluginSettings } from '../plugins/plugin-types.js'
import { DEFAULT_EDITOR_SETTINGS } from '../shared/constants/editor.js'
import { DEFAULT_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB } from '../shared/constants/documents.js'
import {
  DEFAULT_HISTORY_ENABLED,
  DEFAULT_HISTORY_MAX_ENTRIES
} from '../shared/constants/history.js'
import {
  DEFAULT_EXPLORER_MAX_FILES,
  DEFAULT_EXPLORER_MAX_FOLDERS,
  DEFAULT_EXPLORER_MAX_SCAN_DEPTH,
  DEFAULT_EXPLORER_RESPECT_GITIGNORE,
  DEFAULT_EXPLORER_RESTORE_LAST_WORKSPACE
} from '../shared/constants/explorer.js'

export const DEFAULT_SETTINGS = {
  enabled: true,
  layout: {
    showToc: true,
    tocWidth: 280,
    contentMaxWidth: 980
  },
  theme: {
    preset: 'light'
  },
  typography: {
    fontFamily: 'system-ui',
    fontSize: 16,
    lineHeight: 1.7
  },
  plugins: getDefaultPluginSettings(),
  explorer: {
    maxScanDepth: DEFAULT_EXPLORER_MAX_SCAN_DEPTH,
    maxFiles: DEFAULT_EXPLORER_MAX_FILES,
    maxFolders: DEFAULT_EXPLORER_MAX_FOLDERS,
    respectGitignore: DEFAULT_EXPLORER_RESPECT_GITIGNORE,
    restoreLastWorkspace: DEFAULT_EXPLORER_RESTORE_LAST_WORKSPACE
  },
  history: {
    enabled: DEFAULT_HISTORY_ENABLED,
    maxEntries: DEFAULT_HISTORY_MAX_ENTRIES
  },
  documents: {
    maxStandaloneTextFileSizeMiB: DEFAULT_STANDALONE_TEXT_FILE_SIZE_LIMIT_MIB
  },
  editor: { ...DEFAULT_EDITOR_SETTINGS },
  version: 1
}
