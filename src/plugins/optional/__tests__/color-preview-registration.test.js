import { t } from '../../../i18n/index.js'
import { describe, expect, it } from 'vitest'
import { createRenderContext } from '../../../viewer/core/create-render-context.js'
import { needsFullRender } from '../../../shared/settings-diff.js'
import { DEFAULT_SETTINGS } from '../../../settings/default-settings.js'
import { normalizeSettings } from '../../../settings/settings-schema.js'
import { PLUGIN_LABELS, PLUGIN_HINTS } from '../../../popup/settings-constants.js'

describe('color preview lifecycle and settings', () => {
  it('loads the default optional plugin and invalidates its render context when disabled', async () => {
    const cache = new Map()
    const enabled = await createRenderContext({}, { renderContextCache: cache })
    expect(enabled.pluginManager.getActivePlugins().map(plugin => plugin.id)).toContain('colorPreview')
    const disabledSettings = { plugins: { colorPreview: { enabled: false } } }
    const disabled = await createRenderContext(disabledSettings, { renderContextCache: cache })
    expect(disabled.pluginManager.getActivePlugins().map(plugin => plugin.id)).not.toContain('colorPreview')
    expect(disabled.settingsHash).not.toBe(enabled.settingsHash)
    expect(needsFullRender({}, disabledSettings)).toBe(true)
    const restored = await createRenderContext({}, { renderContextCache: cache })
    expect(restored.settingsHash).toBe(enabled.settingsHash)
    expect(restored.pluginManager.getActivePlugins().map(plugin => plugin.id)).toContain('colorPreview')
  })

  it('persists the toggle and describes it in the existing Popup plugin controls', () => {
    const settings = normalizeSettings({ ...DEFAULT_SETTINGS, plugins: { ...DEFAULT_SETTINGS.plugins, colorPreview: { enabled: false } } })
    expect(settings.plugins.colorPreview.enabled).toBe(false)
    expect(t(PLUGIN_LABELS.colorPreview, {}, 'en')).toBe('Color preview')
    expect(t(PLUGIN_HINTS.colorPreview, {}, 'en')).toContain('HEX, RGB or HSL')
  })
})
