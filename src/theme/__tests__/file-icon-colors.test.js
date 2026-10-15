import { describe, expect, it } from 'vitest'
import { BUILT_IN_THEMES, createStyleVars } from '../index.js'
import { FILE_TYPE_COLORS } from '../../shared/icons/file-type-colors.js'

function luminance(hex) {
  return hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
}

function contrast(first, second) {
  const a = luminance(first)
  const b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

describe('file identity theme colors', () => {
  it.each(Object.entries(BUILT_IN_THEMES))('%s keeps file outlines readable on idle, hover and selected surfaces', (id, theme) => {
    const vars = createStyleVars({ theme: { activeId: id } })
    for (const name of Object.keys(FILE_TYPE_COLORS)) {
      const color = vars[`--mdp-file-icon-${name}`]
      for (const background of [theme.background, theme.panelBg, theme.panelStrong, theme.linkSoft]) {
        expect(contrast(color, background), `${id}/${name} on ${background}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it.each(['light', 'dark'])('lets custom themes inherit the %s shades through the normal theme resolver', baseId => {
    const settings = { theme: {
      activeId: 'custom:file-icons',
      customThemes: [{ id: 'custom:file-icons', name: 'File icon test', baseId, colors: {}, background: { type: 'none' } }]
    } }
    const vars = createStyleVars(settings)
    for (const [name, shades] of Object.entries(FILE_TYPE_COLORS)) {
      expect(vars[`--mdp-file-icon-${name}`]).toBe(shades[baseId])
    }
  })
})
