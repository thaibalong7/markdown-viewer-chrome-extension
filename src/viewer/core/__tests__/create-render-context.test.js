import { describe, expect, it } from 'vitest'
import { createRenderContext, createRenderSettingsHash } from '../create-render-context.js'

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

  it('hashes effective default plugin settings', () => {
    const implicitDefaults = createRenderSettingsHash()
    const explicitDefaults = createRenderSettingsHash({
      plugins: {
        codeHighlight: { enabled: true },
        taskList: { enabled: true },
        anchorHeading: { enabled: true },
        tableEnhance: { enabled: true },
        emoji: { enabled: true },
        footnote: { enabled: true },
        math: { enabled: false },
        mermaid: { enabled: false }
      }
    })

    expect(explicitDefaults).toBe(implicitDefaults)
  })

  it('reuses plugin manager and markdown engine for the same render-affecting settings hash', async () => {
    const cache = new Map()
    const settings = {
      theme: { preset: 'light' },
      plugins: {
        codeHighlight: { enabled: false },
        emoji: { enabled: false },
        footnote: { enabled: false }
      }
    }

    const first = await createRenderContext(settings, { renderContextCache: cache })
    const second = await createRenderContext(
      {
        plugins: {
          footnote: { enabled: false },
          emoji: { enabled: false },
          codeHighlight: { enabled: false }
        },
        theme: { preset: 'light' }
      },
      { renderContextCache: cache }
    )

    expect(second.pluginManager).toBe(first.pluginManager)
    expect(second.markdownEngine).toBe(first.markdownEngine)
    expect(cache.size).toBe(1)
  })

  it('invalidates the cached context when plugin settings change', async () => {
    const cache = new Map()
    const baseSettings = {
      plugins: {
        codeHighlight: { enabled: false },
        emoji: { enabled: false },
        footnote: { enabled: false },
        tableEnhance: { enabled: true }
      }
    }

    const first = await createRenderContext(baseSettings, { renderContextCache: cache })
    const second = await createRenderContext(
      {
        plugins: {
          ...baseSettings.plugins,
          tableEnhance: { enabled: false }
        }
      },
      { renderContextCache: cache }
    )

    expect(second.settingsHash).not.toBe(first.settingsHash)
    expect(second.pluginManager).not.toBe(first.pluginManager)
    expect(second.markdownEngine).not.toBe(first.markdownEngine)
    expect(cache.size).toBe(1)
  })

  it('invalidates the cached context when the reader preset changes for Shiki theme safety', async () => {
    const cache = new Map()
    const settings = {
      theme: { preset: 'light' },
      plugins: {
        codeHighlight: { enabled: false },
        emoji: { enabled: false },
        footnote: { enabled: false }
      }
    }

    const first = await createRenderContext(settings, { renderContextCache: cache })
    const second = await createRenderContext(
      {
        ...settings,
        theme: { preset: 'dark' }
      },
      { renderContextCache: cache }
    )

    expect(second.settingsHash).not.toBe(first.settingsHash)
    expect(second.pluginManager).not.toBe(first.pluginManager)
    expect(second.markdownEngine).not.toBe(first.markdownEngine)
    expect(cache.size).toBe(1)
  })

  it('does not expose internal cache handles to plugin runtime context', async () => {
    const cache = new Map()
    const context = await createRenderContext(
      {
        plugins: {
          codeHighlight: { enabled: false },
          emoji: { enabled: false },
          footnote: { enabled: false }
        }
      },
      {
        injectViewerStyles: () => {},
        renderContextCache: cache
      }
    )

    expect(context.runtimeContext.injectViewerStyles).toEqual(expect.any(Function))
    expect(context.runtimeContext.renderContextCache).toBeUndefined()
  })
})
