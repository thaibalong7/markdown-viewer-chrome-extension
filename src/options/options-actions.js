import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'
import { triggerDownload } from '../shared/download.js'

export function confirmResetAllSettings() {
  return window.confirm(
    'Reset all Markdown Plus settings to their defaults? This includes reader, editor, plugin, and explorer preferences.'
  )
}

export function confirmClearRecentFiles() {
  return window.confirm(
    'Clear all recent file paths stored by Markdown Plus on this device? This cannot be undone.'
  )
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
