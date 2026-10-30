import { createSettingsService } from '../../src/settings/settings-service.js'
import { DEFAULT_SETTINGS } from '../../src/settings/default-settings.js'
import { createCustomThemeDraft } from '../../src/theme/index.js'
import { normalizeSettings } from '../../src/settings/settings-schema.js'
import { parseSettingsJson } from '../../src/options/settings-import.js'
import { STORAGE_KEYS, canonicalJson, estimateStorageItemBytes, isThemeRecordKey } from '../../src/settings/settings-storage-format.js'

const results = []
function check(condition, label) {
  if (!condition) throw new Error(label)
  results.push(label)
}
async function reject(operation, label) {
  let failed = false
  try { await operation() } catch { failed = true }
  check(failed, label)
}
const service = () => createSettingsService()
const same = (a, b) => canonicalJson(a) === canonicalJson(b)

async function run() {
  if (!chrome?.storage?.sync) throw new Error('Run in the isolated test extension, not a normal web tab.')
  if (location.search.includes('reload')) {
    const { expected } = await chrome.storage.local.get('expected')
    const settings = await service().getSettings()
    check(same(settings, expected), 'Settings survive a complete Chrome restart')
    return
  }
  await chrome.storage.sync.clear() // The runner creates a dedicated extension/profile.
  await chrome.storage.local.clear()
  for (const size of [8191, 8192, 8193]) {
    const key = 'quota-check', value = 'x'.repeat(size - key.length - 2)
    if (size > 8192) await reject(() => chrome.storage.sync.set({ [key]: value }), 'Chrome rejects an 8193-byte item')
    else {
      await chrome.storage.sync.set({ [key]: value })
      check(await chrome.storage.sync.getBytesInUse(key) === size, `Chrome accepts exactly ${size} bytes including the key`)
    }
  }
  await chrome.storage.sync.remove('quota-check')
  const strings = ['Tiếng Việt 界 😀', '<\u2028\u2029"\\\n', '\ud800']
  for (const value of strings) {
    await chrome.storage.sync.set({ unicode: value })
    check(estimateStorageItemBytes('unicode', value) >= await chrome.storage.sync.getBytesInUse('unicode'), 'Byte estimator covers Unicode and Chromium string escaping')
  }
  await chrome.storage.sync.remove('unicode')
  const customThemes = Array.from({ length: 32 }, (_, i) => ({
    ...createCustomThemeDraft('high-contrast-light', '界'.repeat(48)),
    id: `custom:${String(i).padStart(128, 'a')}`,
    background: { type: 'image', assetId: `theme-asset:${'a'.repeat(128)}`,
      assetRevision: Number.MAX_SAFE_INTEGER, fit: 'cover', position: 'center', repeat: false,
      overlayOpacity: 0.12345678901234567, motion: 'system' }
  }))
  const settings = normalizeSettings({ ...structuredClone(DEFAULT_SETTINGS), theme: {
    activeId: customThemes[0].id, customThemes
  } })
  await reject(() => chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings }), 'Legacy single-item storage rejects 32 valid themes')
  const saved = await service().saveSettings(parseSettingsJson(JSON.stringify(settings)))
  check(same(saved, settings), 'Import saves all 32 themes through the real service')
  check(same(await service().getSettings(), settings), 'New service instance reads all theme records')
  const items = await chrome.storage.sync.get(null)
  for (const [key, value] of Object.entries(items)) {
    check(estimateStorageItemBytes(key, value) >= await chrome.storage.sync.getBytesInUse(key), 'Budget covers the actual Chrome item usage')
  }
  const sizes = { total: await chrome.storage.sync.getBytesInUse(null), index: await chrome.storage.sync.getBytesInUse(STORAGE_KEYS.INDEX) }
  const before = await service().getSettings()
  await reject(() => service().saveSettings({ extra: 'x'.repeat(9000) }), 'Oversized import fails before changing stored settings')
  check(same(await service().getSettings(), before), 'Quota failure preserves the saved library')
  const edited = structuredClone(settings)
  edited.theme.customThemes[0].name = 'Edited'
  await service().saveSettings({ theme: edited.theme })
  check((await service().getSettings()).theme.customThemes[0].name === 'Edited', 'Theme update persists')
  edited.theme.customThemes.shift()
  edited.theme.activeId = 'light'
  await service().saveSettings({ theme: edited.theme })
  check((await service().getSettings()).theme.customThemes.length === 31, 'Active theme deletion persists with the chosen fallback')
  await chrome.storage.local.set({ historySentinel: 'keep' })
  await service().resetSettings()
  check((await service().getSettings()).theme.customThemes.length === 0, 'Reset does not resurrect cached themes')
  check((await chrome.storage.local.get('historySentinel')).historySentinel === 'keep', 'Reset preserves unrelated local storage')
  await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: { version: 1, theme: { preset: 'dark' } } })
  // Remove only the test service's new-format keys to exercise legacy migration.
  await chrome.storage.sync.remove(Object.keys(await chrome.storage.sync.get(null)).filter(key => key === STORAGE_KEYS.INDEX || isThemeRecordKey(key)))
  const migrated = await service().saveSettings({ language: 'vi' })
  check(migrated.theme.activeId === 'dark' && migrated.version === 2, 'Version-1 settings migrate without changing the public version-2 schema')
  check(!(STORAGE_KEYS.SETTINGS in await chrome.storage.sync.get(null)), 'Legacy key retires after the verified commit')
  await chrome.storage.local.set({ expected: migrated })
  return sizes
}

try {
  const sizes = await run()
  globalThis.storageTestResult = { ok: true, assertions: results.length, results, sizes, userAgent: navigator.userAgent }
} catch (error) {
  globalThis.storageTestResult = { ok: false, assertions: results.length, results, error: error.stack || String(error) }
}
document.getElementById('result').textContent = JSON.stringify(globalThis.storageTestResult, null, 2)
