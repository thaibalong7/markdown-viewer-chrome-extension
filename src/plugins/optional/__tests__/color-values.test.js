import { describe, expect, it } from 'vitest'
import { colorFormats, findColors, parseColor } from '../color-values.js'

describe('literal color parsing and conversion', () => {
  it.each([
    ['#3B82F6', [59, 130, 246, 1]],
    ['#abc', [170, 187, 204, 1]],
    ['#abcd', [170, 187, 204, 221 / 255]],
    ['#00000000', [0, 0, 0, 0]],
    ['#FFFFFF80', [255, 255, 255, 128 / 255]],
    ['rgb(59, 130, 246)', [59, 130, 246, 1]],
    ['rgba(59, 130, 246, .5)', [59, 130, 246, 0.5]],
    ['rgb(100% 0% 0% / 25%)', [255, 0, 0, 0.25]],
    ['RGB(255 0 0)', [255, 0, 0, 1]],
    ['rgb(12.5 50% 0 / 0)', [12.5, 127.5, 0, 0]],
    ['hsl(0, 100%, 50%)', [255, 0, 0, 1]],
    ['hsla(120, 100%, 50%, .2)', [0, 255, 0, 0.2]],
    ['hsl(-120deg 100% 50% / 50%)', [0, 0, 255, 0.5]],
    ['hsl(.5turn 100% 50%)', [0, 255, 255, 1]],
    ['hsl(100grad 100% 50%)', [127.5, 255, 0, 1]],
    ['hsl(3.141592653589793rad 100% 50%)', [0, 255, 255, 1]],
    ['hsl(720 0% 25%)', [63.75, 63.75, 63.75, 1]]
  ])('parses %s', (source, expected) => {
    const result = parseColor(source)
    Object.values(result).forEach((value, index) => expect(value).toBeCloseTo(expected[index], 8))
  })

  it.each([
    '#12', '#12345', '#1234567', '#abcdefghi', 'red', 'transparent', 'var(--brand)',
    'rgb(300, 0, 0)', 'rgb(-1, 0, 0)', 'rgb(50%, 0, 0)', 'rgb(1, 2)',
    'rgb(1 2 3 4)', 'rgb(1, 2 3)', 'rgb(1, 2, 3 / .5)', 'rgb(1 2 3 /)',
    'rgba(1, 2, 3, 2)', 'rgb(1 2 3 / 101%)', 'rgb(1 2 3 / .2 / .3)',
    'hsl(0, 50, 50)', 'hsl(0 101% 50%)', 'hsl(0 50% -1%)',
    'rgb(calc(1 + 2), 2, 3)', 'rgb(NaN, 2, 3)', 'rgb(1e300, 0, 0)',
    'rgb(0 0 0); background: url(https://example.com)', 'url(#fff)'
  ])('rejects invalid, unresolved or non-literal colors: %s', source => {
    expect(parseColor(source)).toBeNull()
  })

  it('converts a color to three equivalent formats', () => {
    expect(colorFormats(parseColor('#3B82F6'))).toEqual({
      HEX: '#3B82F6', RGB: 'rgb(59, 130, 246)', HSL: 'hsl(217.219251, 91.219512%, 59.803922%)'
    })
  })

  it.each(['#000', '#fff', '#abc', '#abcd', '#12345678', 'rgb(100% 0% 0% / 0)', 'rgba(1, 2, 3, .5)', 'hsl(265 65% 45% / .33)'])('preserves opacity and color when converting %s', source => {
    const original = parseColor(source)
    const formats = colorFormats(original)
    for (const key of ['RGB', 'HSL']) {
      const converted = parseColor(formats[key])
      expect(converted.a).toBe(original.a)
      for (const channel of ['r', 'g', 'b']) expect(converted[channel]).toBeCloseTo(original[channel], 4)
    }
    expect(parseColor(formats.HEX).a).toBeCloseTo(original.a, 2)
  })

  it('normalizes short hex and includes alpha even when the rounded byte is FF', () => {
    expect(colorFormats(parseColor('#abcd')).HEX).toBe('#AABBCCDD')
    expect(colorFormats(parseColor('rgba(0, 0, 0, .9999)')).HEX).toBe('#000000FF')
    expect(colorFormats(parseColor('rgba(0, 0, 0, .9999)')).RGB).toBe('rgba(0, 0, 0, 0.9999)')
  })
})

describe('context-aware color detection', () => {
  it('only detects explicit RGB/HSL functions in ordinary prose', () => {
    expect(findColors('Issue #123 and red; rgb(59, 130, 246), hsl(0 100% 50%).').map(m => m.source))
      .toEqual(['rgb(59, 130, 246)', 'hsl(0 100% 50%)'])
  })

  it('detects literals with exact offsets in code and table contexts', () => {
    const text = 'color: #abc; border: rgba(1, 2, 3, .5); background: #12345678;'
    const matches = findColors(text, { allowHex: true })
    expect(matches.map(m => m.source)).toEqual(['#abc', 'rgba(1, 2, 3, .5)', '#12345678'])
    for (const match of matches) expect(text.slice(match.index, match.index + match.source.length)).toBe(match.source)
  })

  it('does not detect URL fragments, identifiers, longer invalid hex or invalid functions', () => {
    expect(findColors('https://example.com/#fff file.md#abc foo#abc #abcde #abcdefg #abcdef-id arbg(0) myrgb(1, 2, 3) rgb(300, 0, 0) url(#fff) url("#abc") url(\'#123456\')', { allowHex: true }))
      .toEqual([])
  })

  it('bounds decoration work without changing the earliest matches', () => {
    expect(findColors('#fff #000 #abc', { allowHex: true, limit: 2 }).map(m => m.source)).toEqual(['#fff', '#000'])
    expect(findColors('#fff', { allowHex: true, limit: 0 })).toEqual([])
    expect(parseColor(`rgb(${ '9'.repeat(10000) }x, 0, 0)`)).toBeNull()
  })
})
