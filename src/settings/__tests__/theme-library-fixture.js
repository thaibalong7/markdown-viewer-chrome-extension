import { DEFAULT_SETTINGS } from '../default-settings.js'
import { normalizeSettings } from '../settings-schema.js'
import { createCustomThemeDraft } from '../../theme/index.js'

export function themeLibrary(count = 32) {
  const customThemes = Array.from({ length: count }, (_, i) => ({
    ...createCustomThemeDraft('high-contrast-light', '界'.repeat(48)),
    id: `custom:${String(i).padStart(128, 'a')}`,
    background: {
      type: 'image', assetId: `theme-asset:${'a'.repeat(128)}`,
      assetRevision: Number.MAX_SAFE_INTEGER, fit: 'contain', position: 'bottom',
      repeat: true, overlayOpacity: 0.12345678901234567, motion: 'system'
    }
  }))
  return normalizeSettings({ ...structuredClone(DEFAULT_SETTINGS), theme: {
    activeId: customThemes[0]?.id || 'light', customThemes
  } })
}
