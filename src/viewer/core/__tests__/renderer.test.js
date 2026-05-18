import { describe, expect, it } from 'vitest'
import { renderDocument } from '../renderer.js'

const BASE_SETTINGS = {
  theme: { preset: 'light' },
  typography: { fontSize: 16 },
  plugins: {
    codeHighlight: { enabled: false },
    emoji: { enabled: false },
    footnote: { enabled: false },
    math: { enabled: false },
    mermaid: { enabled: false }
  }
}

describe('renderDocument render context metadata', () => {
  it('keeps the same settings hash for style-only settings changes', async () => {
    const first = await renderDocument('# Title', BASE_SETTINGS)
    const second = await renderDocument('# Title', {
      ...BASE_SETTINGS,
      typography: { fontSize: 20 }
    })

    expect(second.metadata.settingsHash).toBe(first.metadata.settingsHash)
  })

  it('changes the settings hash for plugin or Shiki theme-affecting settings', async () => {
    const base = await renderDocument('# Title', BASE_SETTINGS)
    const pluginChanged = await renderDocument('# Title', {
      ...BASE_SETTINGS,
      plugins: {
        ...BASE_SETTINGS.plugins,
        tableEnhance: { enabled: false }
      }
    })
    const themeChanged = await renderDocument('# Title', {
      ...BASE_SETTINGS,
      theme: { preset: 'dark' }
    })

    expect(pluginChanged.metadata.settingsHash).not.toBe(base.metadata.settingsHash)
    expect(themeChanged.metadata.settingsHash).not.toBe(base.metadata.settingsHash)
  })

  it('can reuse render context without caching rendered HTML', async () => {
    const cache = new Map()
    const first = await renderDocument('# One', BASE_SETTINGS, { renderContextCache: cache })
    const second = await renderDocument('# Two', BASE_SETTINGS, { renderContextCache: cache })

    expect(first.pluginManager).toBe(second.pluginManager)
    expect(first.html).toContain('id="one"')
    expect(second.html).toContain('id="two"')
    expect(second.html).not.toContain('id="one"')
  })
})
