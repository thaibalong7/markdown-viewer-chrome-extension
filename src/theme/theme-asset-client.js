import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'

async function requestThemeAsset(message, fallbackMessage) {
  const response = await sendMessage(message)
  if (!response?.ok) throw new Error(response?.error || fallbackMessage)
  return response.data
}

export function saveThemeAsset(assetId, dataUrl) {
  return requestThemeAsset(
    { type: MESSAGE_TYPES.SAVE_THEME_ASSET, payload: { assetId, dataUrl } },
    'Failed to save the theme asset.'
  )
}

export function getThemeAsset(assetId) {
  return requestThemeAsset(
    { type: MESSAGE_TYPES.GET_THEME_ASSET, payload: { assetId } },
    'Failed to load the theme asset.'
  )
}

export function deleteThemeAsset(assetId) {
  return requestThemeAsset(
    { type: MESSAGE_TYPES.DELETE_THEME_ASSET, payload: { assetId } },
    'Failed to remove the theme asset.'
  )
}
