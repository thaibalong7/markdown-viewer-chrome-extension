import { describe, expect, it } from 'vitest'
import { needsFullRender } from '../settings-diff.js'

describe('needsFullRender', () => {
  it('keeps typography changes on the style-only path by default', () => {
    expect(
      needsFullRender(
        {
          typography: { fontFamily: 'system-ui', fontSize: 16 },
          plugins: { mermaid: { enabled: true, renderer: 'official' } }
        },
        {
          typography: { fontFamily: 'Georgia, serif', fontSize: 16 },
          plugins: { mermaid: { enabled: true, renderer: 'official' } }
        }
      )
    ).toBe(false)
  })

  it('re-renders typography changes when Beautiful Mermaid is active', () => {
    expect(
      needsFullRender(
        {
          typography: { fontFamily: 'system-ui', fontSize: 16 },
          plugins: { mermaid: { enabled: true, renderer: 'beautiful' } }
        },
        {
          typography: { fontFamily: 'Georgia, serif', fontSize: 16 },
          plugins: { mermaid: { enabled: true, renderer: 'beautiful' } }
        }
      )
    ).toBe(true)
  })
})
