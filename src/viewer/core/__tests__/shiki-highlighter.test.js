import { describe, expect, it } from 'vitest'
import {
  applyShikiToFencedCode,
  getShikiHighlighter,
  highlightCode
} from '../shiki-highlighter.js'

describe('Shiki highlighter theme loading', () => {
  it('loads only the active syntax theme on top of the startup fallback', async () => {
    const highlighter = await getShikiHighlighter()
    expect(highlighter.getLoadedThemes()).toEqual(['github-light'])

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

    const html = await highlightCode('const theme = true', 'javascript', settings)

    expect(html).toContain('class="shiki dracula"')
    expect(highlighter.getLoadedThemes()).toEqual(['github-light', 'dracula'])
  })
})
