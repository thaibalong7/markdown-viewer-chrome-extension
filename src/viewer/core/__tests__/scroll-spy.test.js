import { describe, expect, it } from 'vitest'
import { getActiveHeadingId } from '../scroll-spy.js'

const measurements = [
  { id: 'intro', top: 0 },
  { id: 'features', top: 400 },
  { id: 'setup', top: 800 }
]

describe('getActiveHeadingId', () => {
  it('keeps the first heading active at the top of the document', () => {
    expect(getActiveHeadingId({
      measurements,
      scrollTop: 0,
      viewportHeight: 640,
      scrollHeight: 1400
    })).toBe('intro')
  })

  it('activates an approaching heading in the upper reading area', () => {
    expect(getActiveHeadingId({
      measurements,
      scrollTop: 270,
      viewportHeight: 640,
      scrollHeight: 1400
    })).toBe('features')
  })

  it('does not activate the approaching heading too early', () => {
    expect(getActiveHeadingId({
      measurements,
      scrollTop: 180,
      viewportHeight: 640,
      scrollHeight: 1400
    })).toBe('intro')
  })

  it('selects the last heading at the bottom of a scrollable document', () => {
    expect(getActiveHeadingId({
      measurements,
      scrollTop: 760,
      viewportHeight: 640,
      scrollHeight: 1400
    })).toBe('setup')
  })

  it('does not treat a short non-scrollable document as being at its end', () => {
    expect(getActiveHeadingId({
      measurements,
      scrollTop: 0,
      viewportHeight: 1600,
      scrollHeight: 1400
    })).toBe('intro')
  })

  it('returns null when there are no headings', () => {
    expect(getActiveHeadingId({ measurements: [] })).toBeNull()
  })
})
