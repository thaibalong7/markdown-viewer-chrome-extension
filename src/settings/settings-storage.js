import { logger } from '../shared/logger.js'
import {
  STORAGE_KEYS, assertSyncBudget, canonicalJson, decodeSettings, encodeSettings,
  isThemeRecordKey, validateIndex
} from './settings-storage-format.js'
import { normalizeStorageError, storageError, STORAGE_ERRORS } from './settings-storage-errors.js'

export function createSettingsStorage(area, { local, backend = 'sync', log = logger } = {}) {
  let lastComplete = null

  async function cacheItems() {
    if (lastComplete) return lastComplete
    if (!local || backend !== 'sync') return null
    try {
      const entry = (await local.get(STORAGE_KEYS.CACHE))[STORAGE_KEYS.CACHE]
      if (entry?.backend !== backend) return null
      await decodeSettings(entry.items)
      lastComplete = entry.items
    } catch (error) {
      log.warn('Could not read the complete settings cache.', error)
    }
    return lastComplete
  }

  async function remember(items) {
    const index = items[STORAGE_KEYS.INDEX]
    const snapshot = Object.fromEntries([STORAGE_KEYS.INDEX, ...index.themeRefs].map(key => [key, items[key]]))
    lastComplete = structuredClone(snapshot)
    if (!local || backend !== 'sync') return
    try {
      await local.set({ [STORAGE_KEYS.CACHE]: { backend, items: snapshot } })
    } catch (error) {
      // A successful sync commit must not become a failed save/asset rollback.
      log.warn('Could not cache the complete settings snapshot.', error)
    }
  }

  async function read({ allowCached = true } = {}) {
    if (!area) throw storageError('unavailable')
    // Reading all items also makes item-count and orphan/legacy budgeting explicit.
    const items = await area.get(null)
    try {
      if (Object.hasOwn(items, STORAGE_KEYS.INDEX)) {
        const raw = await decodeSettings(items)
        await remember(items)
        return { raw, items, warning: null }
      }
      // On a new device records may arrive before the index. Never save defaults
      // over an incoming library merely because its index hasn't arrived yet.
      if (Object.keys(items).some(isThemeRecordKey)) throw storageError('pending')
      return { raw: items[STORAGE_KEYS.SETTINGS] || null, items, warning: null }
    } catch (error) {
      if (error?.code !== 'settings-storage-pending') throw error
      const cached = await cacheItems()
      if (!cached) throw error
      // A delayed remote deletion can retire a record referenced by the index
      // again. Restore only exact content-addressed refs we can verify locally;
      // never replace the remote index or invent a theme from defaults.
      if (Object.hasOwn(items, STORAGE_KEYS.INDEX)) {
        try {
          const index = validateIndex(items[STORAGE_KEYS.INDEX])
          const repairs = Object.fromEntries(index.themeRefs
            .filter(key => cached[key] && canonicalJson(items[key]) !== canonicalJson(cached[key]))
            .map(key => [key, cached[key]]))
          if (Object.keys(repairs).length) {
            const repaired = { ...items, ...repairs }
            const raw = await decodeSettings(repaired)
            if (backend === 'sync') assertSyncBudget(items, repairs)
            await area.set(repairs)
            await remember(repaired)
            return { raw, items: repaired, warning: null }
          }
        } catch (repairError) {
          log.warn('Could not restore referenced settings records.', repairError)
        }
      }
      if (!allowCached) throw error
      return { raw: await decodeSettings(cached), items, warning: STORAGE_ERRORS.cached }
    }
  }

  async function cleanup(before, committed) {
    if (typeof area.remove !== 'function') return
    try {
      const current = await area.get(null)
      if (canonicalJson(current[STORAGE_KEYS.INDEX]) !== canonicalJson(committed)) return
      // Only retire records already observed before this commit, and preserve
      // both the current and preceding generation. Never sweep concurrent keys.
      const keep = new Set([...committed.themeRefs, ...committed.previousRefs])
      const obsolete = Object.keys(before).filter(key => isThemeRecordKey(key) && !keep.has(key))
      if (Object.hasOwn(before, STORAGE_KEYS.SETTINGS)) obsolete.push(STORAGE_KEYS.SETTINGS)
      // Verify the published snapshot before retiring the legacy recovery copy.
      await decodeSettings(current)
      if (obsolete.length) await area.remove(obsolete)
    } catch (error) {
      log.warn('Could not retire old settings records.', error)
    }
  }

  async function write(settings, before) {
    const previousRefs = before[STORAGE_KEYS.INDEX]
      ? validateIndex(before[STORAGE_KEYS.INDEX]).themeRefs : []
    const updates = await encodeSettings(settings, previousRefs)
    try {
      if (backend === 'sync') {
        const usage = typeof area.getBytesInUse === 'function' ? {
          totalBytes: await area.getBytesInUse(null),
          replacedBytes: await area.getBytesInUse(Object.keys(updates))
        } : {}
        assertSyncBudget(before, updates, usage)
      }
      // Republish all referenced records with the index. This also repairs a
      // record retired by another device; there is no cross-device transaction.
      await area.set(updates)
    } catch (error) {
      throw normalizeStorageError(error)
    }
    await remember(updates)
    await cleanup(before, updates[STORAGE_KEYS.INDEX])
  }

  return { read, write, remember }
}
