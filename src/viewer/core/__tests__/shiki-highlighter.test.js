import { describe, expect, it, vi } from 'vitest'
import {
  applyShikiToFencedCode,
  getShikiHighlighter,
  highlightCode
} from '../shiki-highlighter.js'

describe('Shiki highlighter theme loading', () => {
  it('loads only the active syntax theme on top of the startup fallback', async () => {
    const highlighter = await getShikiHighlighter()
    expect(highlighter.getLoadedThemes()).toEqual(['github-light'])
    expect(highlighter.getLoadedLanguages()).toEqual([])

    const settings = {
      theme: {
        activeId: 'custom:midnight-1234',
        customThemes: [{
          id: 'custom:midnight-1234',
          name: 'Midnight',
          baseId: 'dark',
          syntaxThemeId: 'dracula',
          colors: {},
          background: { type: 'none' }
        }]
      }
    }

    await expect(applyShikiToFencedCode('<p>No fenced code</p>', settings))
      .resolves.toBe('<p>No fenced code</p>')
    expect(highlighter.getLoadedThemes()).toEqual(['github-light'])
    expect(highlighter.getLoadedLanguages()).toEqual([])

    const html = await highlightCode('const theme = true', 'javascript', settings)

    expect(html).toContain('class="shiki dracula"')
    expect(highlighter.getLoadedThemes()).toEqual(['github-light', 'dracula'])
    expect(highlighter.getLoadedLanguages()).toEqual(['javascript', 'js', 'cjs', 'mjs'])
  })

  it('does not initialize Shiki when rendered HTML has no eligible code fence', async () => {
    vi.resetModules()
    const createHighlighterCore = vi.fn()
    vi.doMock('shiki/core', () => ({ createHighlighterCore }))

    try {
      const isolatedModule = await import('../shiki-highlighter.js')

      await expect(isolatedModule.applyShikiToFencedCode('<p>Plain Markdown</p>'))
        .resolves.toBe('<p>Plain Markdown</p>')
      expect(createHighlighterCore).not.toHaveBeenCalled()
    } finally {
      vi.doUnmock('shiki/core')
      vi.resetModules()
    }
  })
})
