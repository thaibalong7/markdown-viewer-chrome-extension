import { describe, expect, it } from 'vitest'
import { hardenExternalWebsiteLink, renderDocument } from '../renderer.js'

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
  it('opens external website links in a safe new tab', async () => {
    const result = await renderDocument('[Website](//example.com/docs)', BASE_SETTINGS)

    expect(result.html).toContain(
      '<a href="//example.com/docs" target="_blank" rel="noopener noreferrer">Website</a>'
    )
  })

  it('hardens external website links emitted from raw HTML', () => {
    const attributes = new Map([
      ['href', 'https://example.org/help'],
      ['rel', 'nofollow']
    ])
    const link = {
      nodeName: 'a',
      getAttribute: (name) => attributes.get(name) || null,
      setAttribute: (name, value) => attributes.set(name, value)
    }

    expect(hardenExternalWebsiteLink(link)).toBe(true)
    expect(attributes.get('target')).toBe('_blank')
    expect(attributes.get('rel')).toBe('nofollow noopener noreferrer')
  })

  it('keeps local links in the current tab', async () => {
    const result = await renderDocument('[Guide](docs/guide.md)', BASE_SETTINGS)

    expect(result.html).toContain('<a href="docs/guide.md">Guide</a>')
    expect(result.html).not.toContain('target="_blank"')
  })

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
