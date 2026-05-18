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
  const logger = {
    warn: vi.fn()
  }

  return {
    settingsService,
    settingsBroadcastService,
    logger,
    routeMessage: createMessageRouter({
      settingsService,
      settingsBroadcastService,
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
    const patch = { theme: { preset: 'dark' } }

    const result = await routeMessage({ type: MESSAGE_TYPES.SAVE_SETTINGS, payload: patch })

    expect(settingsService.saveSettings).toHaveBeenCalledWith(patch)
    expect(settingsBroadcastService.broadcastSettingsUpdated).toHaveBeenCalledWith(result)
    expect(result).toEqual({ enabled: true, theme: { preset: 'dark' } })
  })

  it('routes RESET_SETTINGS through settings service then broadcasts', async () => {
    const { routeMessage, settingsService, settingsBroadcastService } = createRouterHarness()

    const result = await routeMessage({ type: MESSAGE_TYPES.RESET_SETTINGS })

    expect(settingsService.resetSettings).toHaveBeenCalledTimes(1)
    expect(settingsBroadcastService.broadcastSettingsUpdated).toHaveBeenCalledWith(result)
    expect(result).toEqual({ enabled: true, reset: true })
  })

  it('rejects unsupported message types with the existing error path', async () => {
    const { routeMessage, logger } = createRouterHarness()

    await expect(routeMessage({ type: 'UNKNOWN' })).rejects.toThrow(
      'Unsupported message type: UNKNOWN'
    )
    expect(logger.warn).toHaveBeenCalledWith('Unknown message type received.', 'UNKNOWN')
  })
})
