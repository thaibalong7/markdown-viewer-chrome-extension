import { describe, expect, it } from 'vitest'
import { BUNDLED_SYNTAX_THEME_IDS } from '../../../theme/index.js'
import { highlightSyntaxThemePreview } from '../shiki-theme-preview.js'

describe('Shiki Theme Studio preview', () => {
  it('renders distinct token colors for every bundled syntax theme without WASM', async () => {
    const results = await Promise.all(
      BUNDLED_SYNTAX_THEME_IDS.map(async (themeId) => [
        themeId,
        await highlightSyntaxThemePreview("const theme = 'Markdown Plus'", themeId)
      ])
    )

    for (const [themeId, result] of results) {
      expect(result.tokens.length, themeId).toBeGreaterThan(0)
      expect(result.tokens[0].some(({ color }) => Boolean(color)), themeId).toBe(true)
    }

    const byTheme = Object.fromEntries(results)
    expect(byTheme.dracula.bg).not.toBe(byTheme['github-light'].bg)
    expect(byTheme.dracula.tokens[0].map(({ color }) => color))
      .not.toEqual(byTheme['github-dark'].tokens[0].map(({ color }) => color))
  })
})
