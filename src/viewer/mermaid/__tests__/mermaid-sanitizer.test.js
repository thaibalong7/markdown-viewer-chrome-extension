import { describe, expect, it } from 'vitest'
import { sanitizeMermaidSvg } from '../mermaid-sanitizer.js'

describe('Mermaid SVG sanitizer', () => {
  it('fails closed when a browser DOM purifier is unavailable', () => {
    expect(sanitizeMermaidSvg('<svg onload="alert(1)"><script>alert(1)</script></svg>')).toBe('')
  })
})
