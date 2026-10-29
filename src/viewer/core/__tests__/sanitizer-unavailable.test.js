import { describe, expect, it } from 'vitest'
import { sanitizeHtml, renderDocument } from '../renderer.js'

describe('HTML sanitizer without a browser DOM', () => {
  it('fails closed instead of returning attacker HTML', () => {
    expect(sanitizeHtml('<img src=x onerror=alert(1)><style>body{display:none}</style>')).toBe('')
    expect(sanitizeHtml('<p>Even benign markup needs the sanitizer.</p>')).toBe('')
  })

  it('does not bypass the missing purifier through renderDocument', async () => {
    const result = await renderDocument('<script>alert(1)</script>', { plugins: { codeHighlight: { enabled: false } } })
    expect(result.html).toBe('')
  })
})
