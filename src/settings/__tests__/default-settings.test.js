import { afterEach, describe, expect, it } from 'vitest'

describe('DEFAULT_SETTINGS', () => {
  afterEach(() => {
    delete globalThis.chrome
  })

  it('can be imported without chrome.storage', async () => {
    delete globalThis.chrome
    const { DEFAULT_SETTINGS } = await import('../default-settings.js')

    expect(DEFAULT_SETTINGS.enabled).toBe(true)
    expect(DEFAULT_SETTINGS.plugins.mermaid.enabled).toBe(false)
    expect(DEFAULT_SETTINGS.editor.wordWrap).toBe(true)
  })
})
