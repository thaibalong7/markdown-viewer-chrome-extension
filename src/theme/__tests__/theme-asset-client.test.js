import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MESSAGE_TYPES } from '../../messaging/index.js'
import { deleteThemeAsset, getThemeAsset, saveThemeAsset } from '../theme-asset-client.js'

describe('theme asset client', () => {
  let sendMessage

  beforeEach(() => {
    sendMessage = vi.fn(async () => ({ ok: true, data: { size: 4 } }))
    globalThis.chrome = { runtime: { sendMessage } }
  })

  afterEach(() => {
    delete globalThis.chrome
  })

  it('uses centralized message types and explicit asset ids', async () => {
    await saveThemeAsset('theme-asset:12345678', 'data:image/png;base64,AQIDBA==')
    await getThemeAsset('theme-asset:12345678')
    await deleteThemeAsset('theme-asset:12345678')

    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: MESSAGE_TYPES.SAVE_THEME_ASSET,
      payload: {
        assetId: 'theme-asset:12345678',
        dataUrl: 'data:image/png;base64,AQIDBA=='
      }
    })
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: MESSAGE_TYPES.GET_THEME_ASSET,
      payload: { assetId: 'theme-asset:12345678' }
    })
    expect(sendMessage).toHaveBeenNthCalledWith(3, {
      type: MESSAGE_TYPES.DELETE_THEME_ASSET,
      payload: { assetId: 'theme-asset:12345678' }
    })
  })

  it('surfaces asset service failures', async () => {
    sendMessage.mockResolvedValueOnce({ ok: false, error: 'Asset storage unavailable.' })
    await expect(getThemeAsset('theme-asset:12345678')).rejects.toThrow('Asset storage unavailable.')
  })
})
