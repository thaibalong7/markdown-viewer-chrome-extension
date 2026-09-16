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

  it('does not re-render the active document when explorer scan limits change', () => {
    expect(
      needsFullRender(
        { explorer: { maxScanDepth: 4, maxFiles: 2000, maxFolders: 500 } },
        { explorer: { maxScanDepth: 8, maxFiles: 4000, maxFolders: 900 } }
      )
    ).toBe(false)
  })

  it('does not re-render the active document when file-history policy changes', () => {
    expect(
      needsFullRender(
        { history: { enabled: true, maxEntries: 12 } },
        { history: { enabled: false, maxEntries: 24 } }
      )
    ).toBe(false)
  })

  it('does not re-render the active document when its next-open size limit changes', () => {
    expect(
      needsFullRender(
        { documents: { maxStandaloneTextFileSizeMiB: 5 } },
        { documents: { maxStandaloneTextFileSizeMiB: 12 } }
      )
    ).toBe(false)
  })
})
