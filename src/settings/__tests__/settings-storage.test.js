import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSettingsService } from '../settings-service.js'
import { DEFAULT_SETTINGS } from '../default-settings.js'
import { STORAGE_ERRORS } from '../settings-storage-errors.js'
import { STORAGE_KEYS, decodeSettings, encodeSettings, isThemeRecordKey } from '../settings-storage-format.js'
import { createStorageArea } from './storage-harness.js'
import { themeLibrary } from './theme-library-fixture.js'
import { parseSettingsJson } from '../../options/settings-import.js'

describe('quota-safe settings persistence', () => {
  let sync, local, service, log
  const createService = () => createSettingsService({ getStorageApi: () => ({ sync, local }), log })
  beforeEach(() => {
    sync = createStorageArea()
    local = createStorageArea()
    log = { warn: vi.fn(), info: vi.fn() }
    service = createService()
  })

  it('imports 32 themes, reloads, updates/deletes the active theme and resets without deleting history', async () => {
    const settings = parseSettingsJson(JSON.stringify(themeLibrary()))
    await service.saveSettings(settings)
    expect(sync.set).toHaveBeenCalledTimes(1)
    service = createService()
    expect(await service.getSettings()).toEqual(settings)
    settings.theme.customThemes[0].name = 'Updated'
    await service.saveSettings({ theme: settings.theme })
    expect((await service.getSettings()).theme.customThemes[0].name).toBe('Updated')
    settings.theme.customThemes.shift()
    settings.theme.activeId = 'light'
    await service.saveSettings({ theme: settings.theme })
    expect((await service.getSettings()).theme.customThemes).toHaveLength(31)
    local.items.history = ['file:///private.md']
    expect(await service.resetSettings()).toEqual(DEFAULT_SETTINGS)
    expect((await createService().getSettings()).theme.customThemes).toEqual([])
    expect(local.items.history).toEqual(['file:///private.md'])
  })

  it('rejects an oversized import before writing and preserves the committed snapshot', async () => {
    await service.saveSettings(themeLibrary(2))
    const before = structuredClone(sync.items)
    const writes = sync.set.mock.calls.length
    await expect(service.saveSettings(parseSettingsJson(JSON.stringify({ extensionData: 'x'.repeat(9000) })))).rejects.toThrow(STORAGE_ERRORS.quota)
    expect(sync.set).toHaveBeenCalledTimes(writes)
    expect(sync.items).toEqual(before)
  })

  it('includes foreign and orphan storage in budgeting instead of assuming the library owns all capacity', async () => {
    Object.assign(sync.items, Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`foreign${i}`, 'x'.repeat(8000)])))
    await expect(service.saveSettings(themeLibrary())).rejects.toThrow(STORAGE_ERRORS.quota)
    expect(sync.set).not.toHaveBeenCalled()
  })

  it.each([
    ['QUOTA_BYTES_PER_ITEM quota exceeded', STORAGE_ERRORS.quota],
    ['Resource::kQuotaBytes quota exceeded', STORAGE_ERRORS.quota],
    ['MAX_WRITE_OPERATIONS_PER_MINUTE quota exceeded', STORAGE_ERRORS.rate],
    ['MAX_WRITE_OPERATIONS_PER_HOUR quota exceeded', STORAGE_ERRORS.rate],
    ['Device storage failure', 'Device storage failure']
  ])('surfaces %s without writing a local fallback, and the queue recovers', async (browserError, expected) => {
    await service.saveSettings({ language: 'vi' })
    const old = structuredClone(sync.items)
    const cached = structuredClone(local.items)
    sync.set.mockRejectedValueOnce(new Error(browserError))
    await expect(service.saveSettings({ language: 'en' })).rejects.toThrow(expected)
    expect(sync.items).toEqual(old)
    expect(local.items).toEqual(cached)
    expect((await service.saveSettings({ layout: { showToc: false } })).language).toBe('vi')
  })

  it('serializes parallel read/merge/write operations and reset', async () => {
    const [a, b] = await Promise.all([
      service.saveSettings({ language: 'vi' }),
      service.saveSettings({ layout: { showToc: false } })
    ])
    expect(a.language).toBe('vi')
    expect(b.language).toBe('vi')
    expect(b.layout.showToc).toBe(false)
    await Promise.all([service.resetSettings(), service.saveSettings({ typography: { fontSize: 20 } })])
    const final = await service.getSettings()
    expect(final.language).toBe('auto')
    expect(final.typography.fontSize).toBe(20)
  })

  it('migrates legacy only after a successful write; read does not need a migration write', async () => {
    sync.items[STORAGE_KEYS.SETTINGS] = { version: 1, theme: { preset: 'dark' } }
    expect((await service.getSettings()).theme.activeId).toBe('dark')
    expect(sync.set).not.toHaveBeenCalled()
    sync.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'))
    await expect(service.saveSettings({ language: 'vi' })).rejects.toThrow(STORAGE_ERRORS.quota)
    expect(sync.items[STORAGE_KEYS.SETTINGS].theme.preset).toBe('dark')
    await service.saveSettings({ language: 'vi' })
    expect(sync.items).not.toHaveProperty(STORAGE_KEYS.SETTINGS)
    expect((await createService().getSettings()).theme.activeId).toBe('dark')
  })

  it('keeps legacy if readback/cleanup fails after a durable commit', async () => {
    sync.items[STORAGE_KEYS.SETTINGS] = { version: 1, theme: { preset: 'dark' } }
    sync.remove.mockRejectedValueOnce(new Error('MAX_WRITE_OPERATIONS_PER_MINUTE'))
    await expect(service.saveSettings({ language: 'vi' })).resolves.toMatchObject({ language: 'vi' })
    expect(sync.items).toHaveProperty(STORAGE_KEYS.SETTINGS)
    expect((await createService().getSettings()).language).toBe('vi')
  })

  it('keeps only current/preceding theme generations through repeated edits, preserving unrelated keys', async () => {
    const settings = themeLibrary(1)
    sync.items.other = 'keep'
    for (let i = 0; i < 6; i++) {
      settings.theme.customThemes[0].name = `Edit ${i}`
      await service.saveSettings(settings)
    }
    expect(Object.keys(sync.items).filter(isThemeRecordKey)).toHaveLength(2)
    expect(sync.items.other).toBe('keep')
  })

  it('does not turn cache/cleanup errors into save failure after the sync commit', async () => {
    local.set.mockRejectedValue(new Error('Disk full'))
    await expect(service.saveSettings(themeLibrary(1))).resolves.toMatchObject({ theme: { customThemes: expect.any(Array) } })
    expect((await service.getSettings()).theme.customThemes).toHaveLength(1)
    expect(log.warn).toHaveBeenCalled()
  })

  it('loads a verified cache after restart while refs are missing; blocks writes and reset until complete', async () => {
    const initial = themeLibrary(2)
    await service.saveSettings(initial)
    const oldCache = structuredClone(local.items)
    const newer = themeLibrary(2)
    newer.theme.customThemes[0].name = 'Remote new version'
    const remote = await encodeSettings(newer)
    sync.items[STORAGE_KEYS.INDEX] = remote[STORAGE_KEYS.INDEX]
    service = createService()
    const state = await service.getSettingsState()
    expect(state.settings).toEqual(initial)
    expect(state.warning).toBe(STORAGE_ERRORS.cached)
    const writeCount = sync.set.mock.calls.length
    await expect(service.saveSettings({ language: 'vi' })).rejects.toThrow(STORAGE_ERRORS.pending)
    await expect(service.resetSettings()).rejects.toThrow(STORAGE_ERRORS.pending)
    expect(sync.set).toHaveBeenCalledTimes(writeCount)
    expect(local.items).toEqual(oldCache)
    Object.assign(sync.items, remote)
    expect(await service.getSettingsState()).toEqual({ settings: newer, warning: null })
  })

  it('does not publish defaults on a fresh device with records first, missing refs, bad hashes or future formats', async () => {
    const remote = await encodeSettings(themeLibrary(1))
    const [record] = remote[STORAGE_KEYS.INDEX].themeRefs
    sync.items[record] = remote[record]
    await expect(service.getSettings()).rejects.toThrow(STORAGE_ERRORS.pending)
    sync.items[STORAGE_KEYS.INDEX] = { ...remote[STORAGE_KEYS.INDEX], storageFormat: 8 }
    await expect(service.getSettings()).rejects.toThrow(STORAGE_ERRORS.pending)
    Object.assign(sync.items, remote)
    sync.items[record].name = 'Corrupted'
    await expect(service.getSettings()).rejects.toThrow(STORAGE_ERRORS.pending)
    expect(sync.set).not.toHaveBeenCalled()
  })

  it('uses a consistent local backend only when the sync API does not exist', async () => {
    sync = null
    local.items[STORAGE_KEYS.SETTINGS] = { version: 2, language: 'vi' }
    const saved = await service.saveSettings(themeLibrary())
    expect((await createService().getSettings()).theme).toEqual(saved.theme)
    expect(local.items).not.toHaveProperty(STORAGE_KEYS.CACHE)
    expect(await decodeSettings(local.items)).toEqual(saved)
    await service.resetSettings()
    expect((await createService().getSettings()).theme.customThemes).toEqual([])
  })

  it('restores an exact cached ref after a delayed deletion, without overwriting the remote index', async () => {
    const snapshot = themeLibrary(1)
    await service.saveSettings(snapshot)
    const index = structuredClone(sync.items[STORAGE_KEYS.INDEX])
    delete sync.items[index.themeRefs[0]]
    service = createService()
    expect(await service.getSettingsState()).toEqual({ settings: snapshot, warning: null })
    expect(sync.items[STORAGE_KEYS.INDEX]).toEqual(index)
    expect(sync.set.mock.lastCall[0]).not.toHaveProperty(STORAGE_KEYS.INDEX)
    expect(await decodeSettings(sync.items)).toEqual(snapshot)
  })

  it('keeps the cache and blocks save if a delayed-deletion repair is throttled', async () => {
    await service.saveSettings(themeLibrary(1))
    delete sync.items[sync.items[STORAGE_KEYS.INDEX].themeRefs[0]]
    sync.set.mockRejectedValue(new Error('MAX_WRITE_OPERATIONS_PER_MINUTE'))
    expect((await service.getSettingsState()).warning).toBe(STORAGE_ERRORS.cached)
    await expect(service.saveSettings({ language: 'vi' })).rejects.toThrow(STORAGE_ERRORS.pending)
  })

  it('two device writers cannot produce a silently mixed snapshot', async () => {
    const remoteLocal = createStorageArea()
    const other = createSettingsService({ getStorageApi: () => ({ sync, local: remoteLocal }), log })
    const a = themeLibrary(2), b = themeLibrary(2)
    a.theme.customThemes[0].name = 'Device A'
    b.theme.customThemes[0].name = 'Device B'
    await Promise.all([service.saveSettings(a), other.saveSettings(b)])
    const final = await decodeSettings(sync.items)
    expect([a, b]).toContainEqual(final)
    expect((await service.getSettingsState()).warning).toBeNull()
    expect((await other.getSettingsState()).warning).toBeNull()
  })
})
