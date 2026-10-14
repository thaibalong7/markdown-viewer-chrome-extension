import { describe, expect, it } from 'vitest'
import { colorDisplayValues } from '../color-display-values.js'
import { colorFormats, parseColor } from '../../../plugins/optional/color-values.js'

describe('compact color inspection values', () => {
  it('shows three concise values without changing copied formats', () => {
    const color = parseColor('#b45309')
    const { rows, opacity } = colorDisplayValues(color)
    expect(rows.map(row => row.display)).toEqual(['#B45309', '180, 83, 9', '26°, 90.5%, 37.1%'])
    expect(Object.fromEntries(rows.map(row => [row.format, row.value]))).toEqual(colorFormats(color))
    expect(opacity).toBe('')
  })

  it('exposes opacity once while every copied format retains alpha', () => {
    const color = parseColor('#3B82F680')
    const { rows, opacity } = colorDisplayValues(color)
    expect(opacity).toBe('50.2%')
    expect(rows.map(row => row.display)).toEqual(['#3B82F680', '59, 130, 246', '217.2°, 91.2%, 59.8%'])
    expect(rows[1].value).toBe('rgba(59, 130, 246, 0.5019607843137255)')
    expect(rows[2].value).toContain('0.5019607843137255')
  })

  it('keeps full clipboard precision for fractional channels and fully transparent colors', () => {
    expect(colorDisplayValues(parseColor('rgba(12.123456, 0, 0, 0)')).rows[1]).toEqual({
      format: 'RGB', display: '12.1, 0, 0', value: 'rgba(12.123456, 0, 0, 0)'
    })
    expect(colorDisplayValues(parseColor('#0000')).opacity).toBe('0%')
  })
})
