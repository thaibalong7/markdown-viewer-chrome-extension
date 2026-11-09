import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const styles = readFileSync(new URL('../../styles/_search.scss', import.meta.url), 'utf8')
const color = (name) => styles.match(new RegExp(`--mdp-search-${name}: (#[0-9a-f]{6})`))[1]
const luminance = (hex) => hex.slice(1).match(/../g).map((part) => {
  const c = parseInt(part, 16) / 255
  return c <= 0.04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4
}).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
it('keeps normal/current match text readable over opaque search colors on every reader theme', () => {
  for (const kind of ['match', 'current']) {
    const a = luminance(color(`${kind}-bg`)), b = luminance(color(`${kind}-fg`))
    expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toBeGreaterThanOrEqual(4.5)
  }
  expect(color('match-bg')).not.toBe(color('current-bg'))
})
