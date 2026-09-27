import { describe, expect, it, vi } from 'vitest'
import { MESSAGE_TYPES } from '../../messaging/index.js'
import { createMessageRouter } from '../message-router.js'

function createRouterHarness() {
  const settingsService = {
    getSettings: vi.fn(async () => ({ enabled: true })),
    saveSettings: vi.fn(async (patch) => ({ enabled: true, ...patch })),
    resetSettings: vi.fn(async () => ({ enabled: true, reset: true }))
  }
  const settingsBroadcastService = {
    broadcastSettingsUpdated: vi.fn(async () => undefined)
  }
  const themeAssetService = {
    saveThemeAsset: vi.fn(async () => ({ size: 42 })),
    getThemeAsset: vi.fn(async () => ({ dataUrl: 'data:image/png;base64,AA==' })),
    deleteThemeAsset: vi.fn(async () => ({ deleted: true })),
    clearThemeAssets: vi.fn(async () => ({ cleared: true }))
  }
  const logger = {
    warn: vi.fn()
  }

  return {
    settingsService,
    settingsBroadcastService,
    themeAssetService,
    logger,
    routeMessage: createMessageRouter({
      settingsService,
      settingsBroadcastService,
      themeAssetService,
      fileHistoryService: {},
      logger
    })
  }
}

describe('message router settings routes', () => {
  it('routes GET_SETTINGS to settings service', async () => {
    const { routeMessage, settingsService } = createRouterHarness()

    await expect(routeMessage({ type: MESSAGE_TYPES.GET_SETTINGS })).resolves.toEqual({
      enabled: true
    })
    expect(settingsService.getSettings).toHaveBeenCalledTimes(1)
  })

  it('routes SAVE_SETTINGS through settings service then broadcasts', async () => {
    const { routeMessage, settingsService, settingsBroadcastService } = createRouterHarness()
    const patch = { theme: { activeId: 'dark' } }

    const result = await routeMessage({ type: MESSAGE_TYPES.SAVE_SETTINGS, payload: patch })

    expect(settingsService.saveSettings).toHaveBeenCalledWith(patch)
    expect(settingsBroadcastService.broadcastSettingsUpdated).toHaveBeenCalledWith(result)
    expect(result).toEqual({ enabled: true, theme: { activeId: 'dark' } })
  })

  it('routes RESET_SETTINGS through settings service then broadcasts', async () => {
    const {
      routeMessage,
      settingsService,
      settingsBroadcastService,
      themeAssetService
    } = createRouterHarness()

    const result = await routeMessage({ type: MESSAGE_TYPES.RESET_SETTINGS })

    expect(settingsService.resetSettings).toHaveBeenCalledTimes(1)
    expect(themeAssetService.clearThemeAssets).toHaveBeenCalledTimes(1)
    expect(settingsBroadcastService.broadcastSettingsUpdated).toHaveBeenCalledWith(result)
    expect(result).toEqual({ enabled: true, reset: true })
  })

  it('routes theme assets through the local asset service', async () => {
    const { routeMessage, themeAssetService } = createRouterHarness()

    await routeMessage({
      type: MESSAGE_TYPES.SAVE_THEME_ASSET,
      payload: { assetId: 'theme-asset:12345678', dataUrl: 'data:image/png;base64,AA==' }
    })
    await routeMessage({
      type: MESSAGE_TYPES.GET_THEME_ASSET,
      payload: { assetId: 'theme-asset:12345678' }
    })
    await routeMessage({
      type: MESSAGE_TYPES.DELETE_THEME_ASSET,
      payload: { assetId: 'theme-asset:12345678' }
    })

    expect(themeAssetService.saveThemeAsset).toHaveBeenCalledWith({
      assetId: 'theme-asset:12345678',
      dataUrl: 'data:image/png;base64,AA=='
    })
    expect(themeAssetService.getThemeAsset).toHaveBeenCalledWith({
      assetId: 'theme-asset:12345678'
    })
    expect(themeAssetService.deleteThemeAsset).toHaveBeenCalledWith({
      assetId: 'theme-asset:12345678'
    })
  })

  it('still resets settings when local background cleanup is unavailable', async () => {
    const {
      routeMessage,
      themeAssetService,
      settingsBroadcastService,
      logger
    } = createRouterHarness()
    themeAssetService.clearThemeAssets.mockRejectedValueOnce(new Error('IDB unavailable'))

    await expect(routeMessage({ type: MESSAGE_TYPES.RESET_SETTINGS })).resolves.toEqual({
      enabled: true,
      reset: true
    })
    expect(settingsBroadcastService.broadcastSettingsUpdated).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      'Could not clear theme assets during settings reset.',
      expect.any(Error)
    )
  })

  it('rejects unsupported message types with the existing error path', async () => {
    const { routeMessage, logger } = createRouterHarness()

    await expect(routeMessage({ type: 'UNKNOWN' })).rejects.toThrow(
      'Unsupported message type: UNKNOWN'
    )
    expect(logger.warn).toHaveBeenCalledWith('Unknown message type received.', 'UNKNOWN')
  })
})
