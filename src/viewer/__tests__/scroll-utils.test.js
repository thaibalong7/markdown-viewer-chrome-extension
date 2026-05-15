import { describe, expect, it } from 'vitest'
import { findHeadingByHash, hashTargetToUrlFragment } from '../scroll-utils.js'

function fakeHeading(id) {
  return {
    id,
    matches: (selector) => selector.includes('h1[id]')
  }
}

function fakeRoot(elements) {
  return {
    querySelectorAll: (selector) => (selector === '[id]' ? elements : [])
  }
}

describe('scroll-utils hash helpers', () => {
  it('does not double-encode markdown-it-anchor IDs that already contain encoded emoji', () => {
    expect(hashTargetToUrlFragment('%F0%9F%9A%80-release-notes')).toBe('#%F0%9F%9A%80-release-notes')
  })

  it('encodes decoded special characters for URL hash output', () => {
    expect(hashTargetToUrlFragment('🚀 release notes')).toBe('#%F0%9F%9A%80%20release%20notes')
  })

  it('finds a percent-encoded heading ID from a decoded hash', () => {
    const root = fakeRoot([fakeHeading('%F0%9F%9A%80-release-notes')])
    expect(findHeadingByHash(root, '🚀-release-notes')?.id).toBe('%F0%9F%9A%80-release-notes')
  })

  it('finds a percent-encoded heading ID from an encoded URL hash', () => {
    const root = fakeRoot([fakeHeading('%F0%9F%9A%80-release-notes')])
    expect(findHeadingByHash(root, '#%F0%9F%9A%80-release-notes')?.id).toBe('%F0%9F%9A%80-release-notes')
  })
})
