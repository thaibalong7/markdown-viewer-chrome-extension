import { MESSAGE_TYPES, sendMessage } from '../../messaging/index.js'

export async function openExplorerSettings() {
  const response = await sendMessage({ type: MESSAGE_TYPES.OPEN_EXPLORER_SETTINGS })
  if (!response?.ok) {
    throw new Error(response?.error || 'Could not open Settings.')
  }
}
