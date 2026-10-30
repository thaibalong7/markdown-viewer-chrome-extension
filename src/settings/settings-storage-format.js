import { isPlainObject } from '../shared/deep-merge.js'
import { MAX_CUSTOM_THEMES } from '../theme/index.js'
import { storageError } from './settings-storage-errors.js'

export const STORAGE_KEYS = Object.freeze({
  SETTINGS: 'mdViewer.settings', // Legacy inline settings, read until first successful commit.
  INDEX: 'mdViewer.settings.index.v1',
  CACHE: 'mdViewer.settings.lastComplete.v1'
})
export const THEME_RECORD_PREFIX = 'mdViewer.theme.'
const RECORD_PATTERN = /^mdViewer\.theme\.[a-f0-9]{64}$/
export const SYNC_LIMITS = Object.freeze({ perItem: 8192, total: 102400, items: 512 })
const encoder = new TextEncoder()

// Stable across Chrome's dictionary key ordering and JSON transport.
export function canonicalJson(value) {
  return JSON.stringify(value, (_key, entry) => isPlainObject(entry)
    ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]]))
    : entry)
}

export async function themeRecordKey(theme) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalJson(theme)))
  return THEME_RECORD_PREFIX + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function isThemeRecordKey(key) { return RECORD_PATTERN.test(key) }

/** Conservative UTF-8 quota estimate, including Chromium's extra string escapes.
 * Number formatting differs between V8 JSON and base::JSONWriter; budget up to
 * 24 bytes per number rather than claiming identical serializers at the limit.
 */
export function estimateStorageItemBytes(key, value) {
  let numericReserve = 0
  const json = JSON.stringify(value, (_key, entry) => {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      numericReserve += Math.max(0, 24 - JSON.stringify(entry).length)
    }
    return entry
  }).replace(/[<\u2028\u2029]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
  return encoder.encode(key).length + encoder.encode(json).length + numericReserve
}

export function assertSyncBudget(existing, updates, usage = {}) {
  const merged = { ...existing, ...updates }
  for (const [key, value] of Object.entries(updates)) {
    if (estimateStorageItemBytes(key, value) > SYNC_LIMITS.perItem) throw storageError('quota')
  }
  const estimate = entries => Object.entries(entries).reduce((sum, [key, value]) => sum + estimateStorageItemBytes(key, value), 0)
  const total = usage.totalBytes === undefined
    ? estimate(merged)
    : usage.totalBytes - usage.replacedBytes + estimate(updates)
  if (total > SYNC_LIMITS.total || Object.keys(merged).length > SYNC_LIMITS.items) throw storageError('quota')
}

export async function encodeSettings(settings, previousRefs = []) {
  const { customThemes, ...theme } = settings.theme
  const keys = await Promise.all(customThemes.map(themeRecordKey))
  const records = Object.fromEntries(keys.map((key, i) => [key, customThemes[i]]))
  const index = {
    storageFormat: 1,
    settings: { ...settings, theme },
    themeRefs: keys,
    // Retain one complete generation; cleanup never removes either list.
    previousRefs: [...new Set(previousRefs)].filter(isThemeRecordKey)
  }
  return { [STORAGE_KEYS.INDEX]: index, ...records }
}

export function validateIndex(index) {
  if (!isPlainObject(index) || index.storageFormat !== 1 ||
      !isPlainObject(index.settings) || !isPlainObject(index.settings.theme) ||
      Object.hasOwn(index.settings.theme, 'customThemes') ||
      !Array.isArray(index.themeRefs) || index.themeRefs.length > MAX_CUSTOM_THEMES ||
      new Set(index.themeRefs).size !== index.themeRefs.length ||
      !index.themeRefs.every(isThemeRecordKey) ||
      !Array.isArray(index.previousRefs) || index.previousRefs.length > MAX_CUSTOM_THEMES ||
      !index.previousRefs.every(isThemeRecordKey)) throw storageError('pending')
  return index
}

export async function decodeSettings(items) {
  const index = validateIndex(items[STORAGE_KEYS.INDEX])
  const themes = await Promise.all(index.themeRefs.map(async key => {
    const theme = items[key]
    if (!isPlainObject(theme) || await themeRecordKey(theme) !== key) throw storageError('pending')
    return theme
  }))
  return { ...index.settings, theme: { ...index.settings.theme, customThemes: themes } }
}
