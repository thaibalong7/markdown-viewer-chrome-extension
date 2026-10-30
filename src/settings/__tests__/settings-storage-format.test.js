import { describe, expect, it } from 'vitest'
import { themeLibrary } from './theme-library-fixture.js'
import {
  STORAGE_KEYS, SYNC_LIMITS, assertSyncBudget, canonicalJson, decodeSettings,
  encodeSettings, estimateStorageItemBytes, themeRecordKey
} from '../settings-storage-format.js'

describe('settings storage codec and budget', () => {
  it('round-trips 32 long Unicode/image themes with small items and the existing public schema', async () => {
    const settings = themeLibrary()
    const items = await encodeSettings(settings)
    expect(estimateStorageItemBytes(STORAGE_KEYS.SETTINGS, settings)).toBeGreaterThan(8192)
    expect(Object.keys(items)).toHaveLength(33)
    assertSyncBudget({}, items)
    expect(await decodeSettings(items)).toEqual(settings)
    expect(settings.version).toBe(2)
    expect(items[STORAGE_KEYS.INDEX].settings.theme).not.toHaveProperty('customThemes')
    // A full edit can safely retain the previous 32 refs without an oversized index.
    const next = themeLibrary()
    next.theme.customThemes.forEach(theme => { theme.name = '另'.repeat(48) })
    const updates = await encodeSettings(next, items[STORAGE_KEYS.INDEX].themeRefs)
    assertSyncBudget(items, updates)
  })

  it.each([8191, 8192, 8193])('accounts for key and JSON quotes at %i bytes', bytes => {
    const value = 'x'.repeat(bytes - 3)
    expect(estimateStorageItemBytes('k', value)).toBe(bytes)
    if (bytes <= SYNC_LIMITS.perItem) expect(() => assertSyncBudget({}, { k: value })).not.toThrow()
    else expect(() => assertSyncBudget({}, { k: value })).toThrow('storage is full')
  })

  it('counts UTF-8, escaped strings and Chromium-specific escapes, with conservative numbers', () => {
    expect(estimateStorageItemBytes('界', '😀')).toBe(9)
    expect(estimateStorageItemBytes('k', '<\u2028\u2029')).toBe(21)
    expect(estimateStorageItemBytes('k', '"\\\n')).toBe(9)
    expect(estimateStorageItemBytes('k', { n: Number.MAX_SAFE_INTEGER }))
      .toBeGreaterThan(Buffer.byteLength('k') + Buffer.byteLength(JSON.stringify({ n: Number.MAX_SAFE_INTEGER })))
  })

  it.each([102399, 102400, 102401])('budgets total usage at %i bytes without subtracting undeleted data', total => {
    const items = Object.fromEntries(Array.from({ length: 13 }, (_, i) => {
      const key = String(i).padStart(2, '0')
      const bytes = i === 12 ? total - 12 * 8000 : 8000
      return [key, 'x'.repeat(bytes - key.length - 2)]
    }))
    if (total <= SYNC_LIMITS.total) expect(() => assertSyncBudget({}, items)).not.toThrow()
    else expect(() => assertSyncBudget({}, items)).toThrow('storage is full')
  })

  it('uses real total/replaced usage and enforces 512 items', () => {
    expect(() => assertSyncBudget({ k: 'old' }, { k: 'new' }, { totalBytes: 102400, replacedBytes: 6 })).not.toThrow()
    expect(() => assertSyncBudget({ k: 'old' }, { k: 'new' }, { totalBytes: 102400, replacedBytes: 5 })).toThrow()
    const existing = Object.fromEntries(Array.from({ length: 512 }, (_, i) => [String(i), null]))
    expect(() => assertSyncBudget(existing, { extra: null })).toThrow()
  })

  it('hashes content independent of property order and only changes the edited record', async () => {
    const settings = themeLibrary(2)
    const theme = settings.theme.customThemes[0]
    const reversed = Object.fromEntries(Object.entries(theme).reverse())
    expect(await themeRecordKey(theme)).toBe(await themeRecordKey(reversed))
    const before = await encodeSettings(settings)
    settings.theme.customThemes[0].name = 'Edited'
    const after = await encodeSettings(settings)
    expect(before[STORAGE_KEYS.INDEX].themeRefs[0]).not.toBe(after[STORAGE_KEYS.INDEX].themeRefs[0])
    expect(before[STORAGE_KEYS.INDEX].themeRefs[1]).toBe(after[STORAGE_KEYS.INDEX].themeRefs[1])
    expect(canonicalJson(theme)).toBe(canonicalJson(Object.fromEntries(Object.entries(theme).reverse())))
  })

  it('rejects missing, mixed, corrupted records and unsupported indexes before normalization', async () => {
    const items = await encodeSettings(themeLibrary(2))
    const [key] = items[STORAGE_KEYS.INDEX].themeRefs
    await expect(decodeSettings({ ...items, [key]: undefined })).rejects.toThrow('still syncing')
    await expect(decodeSettings({ ...items, [key]: { ...items[key], name: 'Other revision' } })).rejects.toThrow('still syncing')
    await expect(decodeSettings({ ...items, [STORAGE_KEYS.INDEX]: { ...items[STORAGE_KEYS.INDEX], storageFormat: 2 } })).rejects.toThrow('still syncing')
  })
})
