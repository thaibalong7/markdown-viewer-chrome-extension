import { getDefaultPluginSettings } from '../plugins/plugin-types.js'
import { DEFAULT_EDITOR_SETTINGS } from '../shared/constants/editor.js'
import {
  DEFAULT_EXPLORER_MAX_FILES,
  DEFAULT_EXPLORER_MAX_FOLDERS,
  DEFAULT_EXPLORER_MAX_SCAN_DEPTH
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
    maxFolders: DEFAULT_EXPLORER_MAX_FOLDERS
  },
  editor: { ...DEFAULT_EDITOR_SETTINGS },
  version: 1
}
