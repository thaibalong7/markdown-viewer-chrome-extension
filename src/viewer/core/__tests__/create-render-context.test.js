import { describe, expect, it } from 'vitest'
import { createRenderSettingsHash } from '../create-render-context.js'

describe('createRenderSettingsHash', () => {
  it('is stable across plugin key insertion order', () => {
    const first = createRenderSettingsHash({
      theme: { preset: 'dark' },
      plugins: {
        math: { enabled: true },
        mermaid: { enabled: false }
      }
    })
    const second = createRenderSettingsHash({
      plugins: {
        mermaid: { enabled: false },
        math: { enabled: true }
      },
      theme: { preset: 'dark' }
    })

    expect(second).toBe(first)
  })

  it('changes for plugin or Shiki theme-affecting settings', () => {
    const base = createRenderSettingsHash({
      theme: { preset: 'light' },
      plugins: { math: { enabled: false } }
    })
    const pluginChanged = createRenderSettingsHash({
      theme: { preset: 'light' },
      plugins: { math: { enabled: true } }
    })
    const themeChanged = createRenderSettingsHash({
      theme: { preset: 'dark' },
      plugins: { math: { enabled: false } }
    })

    expect(pluginChanged).not.toBe(base)
    expect(themeChanged).not.toBe(base)
  })
})
