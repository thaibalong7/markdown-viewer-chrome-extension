import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeSettingsStorage } from '../settings-sync-observer.js'
import { createSettingsService } from '../../settings/settings-service.js'
import { STORAGE_KEYS, encodeSettings } from '../../settings/settings-storage-format.js'
import { STORAGE_ERRORS } from '../../settings/settings-storage-errors.js'
import { createStorageArea } from '../../settings/__tests__/storage-harness.js'
import { themeLibrary } from '../../settings/__tests__/theme-library-fixture.js'

afterEach(() => vi.useRealTimers())

describe('remote settings reconciliation', () => {
  async function harness(withCache = true) {
    vi.useFakeTimers()
    const sync = createStorageArea(), local = createStorageArea()
    const log = { warn: vi.fn(), info: vi.fn() }
    const settings = createSettingsService({ getStorageApi: () => ({ sync, local }), log })
    if (withCache) await settings.saveSettings(themeLibrary(1))
    let receive
    const storage = { sync, local, onChanged: {
      addListener: vi.fn(fn => { receive = fn }), removeListener: vi.fn()
    } }
    const broadcaster = { broadcastSettingsUpdated: vi.fn() }
    const stop = observeSettingsStorage({ storage, settings, broadcaster, log })
    return { sync, local, settings, broadcaster, log, storage, stop,
      emit: (changes, area = 'sync') => receive(changes, area) }
  }

  it('coalesces events, filters unrelated areas, and waits for all theme refs', async () => {
    const h = await harness()
    h.emit({ [STORAGE_KEYS.CACHE]: {} }, 'local')
    h.emit({ history: {} })
    await vi.runAllTimersAsync()
    expect(h.broadcaster.broadcastSettingsUpdated).not.toHaveBeenCalled()
    const newer = themeLibrary(1)
    newer.theme.customThemes[0].name = 'Remote'
    const remote = await encodeSettings(newer)
    h.sync.items[STORAGE_KEYS.INDEX] = remote[STORAGE_KEYS.INDEX]
    h.emit({ [STORAGE_KEYS.INDEX]: {} })
    h.emit({ [STORAGE_KEYS.INDEX]: {} })
    await vi.runAllTimersAsync()
    await vi.waitFor(() => expect(h.broadcaster.broadcastSettingsUpdated).toHaveBeenCalledTimes(1))
    expect(h.broadcaster.broadcastSettingsUpdated).toHaveBeenLastCalledWith(
      expect.objectContaining({ theme: expect.objectContaining({ customThemes: [expect.objectContaining({ name: '界'.repeat(48) })] }) }),
      { warning: STORAGE_ERRORS.cached }
    )
    Object.assign(h.sync.items, remote)
    h.emit({ [remote[STORAGE_KEYS.INDEX].themeRefs[0]]: {} })
    await vi.runAllTimersAsync()
    await vi.waitFor(() => expect(h.broadcaster.broadcastSettingsUpdated).toHaveBeenLastCalledWith(newer, { warning: null }))
    h.stop()
    expect(h.storage.onChanged.removeListener).toHaveBeenCalled()
  })

  it('never broadcasts defaults for a fresh device receiving an incomplete index', async () => {
    const h = await harness(false)
    const remote = await encodeSettings(themeLibrary(1))
    h.sync.items[STORAGE_KEYS.INDEX] = remote[STORAGE_KEYS.INDEX]
    h.emit({ [STORAGE_KEYS.INDEX]: {} })
    await vi.runAllTimersAsync()
    expect(h.broadcaster.broadcastSettingsUpdated).not.toHaveBeenCalled()
    expect(h.sync.set).not.toHaveBeenCalled()
    expect(h.log.warn).toHaveBeenCalled()
    h.stop()
  })

  it('cancels a pending notification on disposal', async () => {
    const h = await harness()
    h.emit({ [STORAGE_KEYS.INDEX]: {} })
    h.stop()
    await vi.runAllTimersAsync()
    expect(h.broadcaster.broadcastSettingsUpdated).not.toHaveBeenCalled()
  })
})
