import { t } from '../i18n/index.js'
import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'
import { triggerDownload } from '../shared/download.js'

export function confirmResetAllSettings() {
  return window.confirm(t(
    'options.optionsActions.resetAllMarkdownPlusSettingsToTheirDefaults'
  ))
}

export function confirmClearRecentFiles() {
  return window.confirm(t(
    'options.optionsActions.clearAllRecentFilePathsStoredByMarkdown'
  ))
}

export async function clearRecentFiles() {
  const response = await sendMessage({ type: MESSAGE_TYPES.CLEAR_FILE_HISTORY })
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to clear recent files.')
  }
  return response.data
}

export function readSettingsFile(file) {
  if (!file) throw new Error('Choose a settings JSON file to import.')
  if (file.size > 1024 * 1024) {
    throw new Error('Settings files must be smaller than 1 MiB.')
  }
  return file.text()
}

export function exportSettingsFile(settings) {
  const json = `${JSON.stringify(settings, null, 2)}\n`
  return triggerDownload({
    blob: new Blob([json], { type: 'application/json;charset=utf-8' }),
    filename: 'markdown-plus-settings.json'
  })
}
