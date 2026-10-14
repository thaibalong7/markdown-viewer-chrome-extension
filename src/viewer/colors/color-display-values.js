import { colorFormats } from '../../plugins/optional/color-values.js'

const concise = value => Number(Number(value).toFixed(1))

/** Compact labels for inspection; clipboard values keep the conversion's full precision. */
export function colorDisplayValues(color) {
  const formats = colorFormats(color)
  const hsl = formats.HSL.slice(formats.HSL.indexOf('(') + 1).split(',').slice(0, 3).map(parseFloat)
  return {
    rows: [
      { format: 'HEX', value: formats.HEX, display: formats.HEX },
      { format: 'RGB', value: formats.RGB, display: [color.r, color.g, color.b].map(concise).join(', ') },
      { format: 'HSL', value: formats.HSL, display: `${concise(hsl[0])}°, ${concise(hsl[1])}%, ${concise(hsl[2])}%` }
    ],
    opacity: color.a < 1 ? `${concise(color.a * 100)}%` : ''
  }
}
