import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FILE_HISTORY_STORAGE_KEY,
  createFileHistoryService
} from '../file-history-service.js'

function createHarness({ history = { enabled: true, maxEntries: 12 }, entries = [] } = {}) {
  let storedEntries = entries
  const storageArea = {
    get: vi.fn(async () => ({ [FILE_HISTORY_STORAGE_KEY]: storedEntries })),
    set: vi.fn(async (value) => {
      storedEntries = value[FILE_HISTORY_STORAGE_KEY]
    })
  }
  const settingsService = {
    getSettings: vi.fn(async () => ({ history }))
  }
  const logger = { debug: vi.fn(), info: vi.fn() }
  const service = createFileHistoryService({ settingsService, storageArea, logger })

  return { service, storageArea, getStoredEntries: () => storedEntries }
}

describe('file history service privacy policy', () => {
  afterEach(() => {
    delete globalThis.chrome
  })

  it('does not record a local path while history is disabled', async () => {
    const existing = [{ url: 'file:///Users/me/existing.md', openedAt: 1 }]
    const { service, storageArea } = createHarness({
      history: { enabled: false, maxEntries: 12 },
      entries: existing
    })

    await expect(
      service.recordFileOpened({ url: 'file:///Users/me/private.md' })
    ).resolves.toEqual(existing)
    expect(storageArea.set).not.toHaveBeenCalled()
  })

  it('uses the configured limit for records and prunes excess local entries on read', async () => {
    const entries = [
      { url: 'file:///Users/me/a.md', openedAt: 3 },
      { url: 'file:///Users/me/b.md', openedAt: 2 },
      { url: 'file:///Users/me/c.md', openedAt: 1 }
    ]
    const { service, getStoredEntries } = createHarness({
      history: { enabled: true, maxEntries: 2 },
      entries
    })

    await expect(service.getFileHistory()).resolves.toEqual(entries.slice(0, 2))
    expect(getStoredEntries()).toEqual(entries.slice(0, 2))

    const next = await service.recordFileOpened({ url: 'file:///Users/me/new.md' })
    expect(next).toHaveLength(2)
    expect(next[0].url).toBe('file:///Users/me/new.md')
    expect(getStoredEntries()).toEqual(next)
  })

  it('clears entries from the injected local storage area', async () => {
    const { service, storageArea, getStoredEntries } = createHarness({
      entries: [{ url: 'file:///Users/me/a.md', openedAt: 1 }]
    })

    await expect(service.clearFileHistory()).resolves.toEqual([])
    expect(storageArea.set).toHaveBeenCalledWith({ [FILE_HISTORY_STORAGE_KEY]: [] })
    expect(getStoredEntries()).toEqual([])
  })

  it('never falls back to sync storage for local file paths', async () => {
    const local = {
      get: vi.fn(async () => ({ [FILE_HISTORY_STORAGE_KEY]: [] })),
      set: vi.fn(async () => undefined)
    }
    const sync = {
      get: vi.fn(async () => ({ [FILE_HISTORY_STORAGE_KEY]: [] })),
      set: vi.fn(async () => undefined)
    }
    globalThis.chrome = { storage: { local, sync } }
    const service = createFileHistoryService({
      settingsService: {
        getSettings: vi.fn(async () => ({ history: { enabled: true, maxEntries: 12 } }))
      }
    })

    await service.recordFileOpened({ url: 'file:///Users/me/private.md' })

    expect(local.set).toHaveBeenCalled()
    expect(sync.get).not.toHaveBeenCalled()
    expect(sync.set).not.toHaveBeenCalled()
  })
})
