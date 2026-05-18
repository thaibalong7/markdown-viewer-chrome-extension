import { describe, expect, it, vi } from 'vitest'
import {
  isBrowserOpenableFileHref,
  isPlainPrimaryClick,
  openFileHrefInNewTab
} from '../file-row-actions.js'
import { MDP_WS_FILE } from '../../../shared/constants/explorer.js'

describe('file row actions', () => {
  it('detects unmodified primary clicks', () => {
    expect(
      isPlainPrimaryClick({
        button: 0,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false
      })
    ).toBe(true)
    expect(isPlainPrimaryClick({ button: 1 })).toBe(false)
    expect(isPlainPrimaryClick({ button: 0, metaKey: true })).toBe(false)
    expect(isPlainPrimaryClick({ button: 0, ctrlKey: true })).toBe(false)
  })

  it('treats workspace virtual file hrefs as not browser-openable', () => {
    expect(isBrowserOpenableFileHref('file:///Users/me/docs/a.md')).toBe(true)
    expect(isBrowserOpenableFileHref(`${MDP_WS_FILE}docs%2Fa.md`)).toBe(false)
    expect(isBrowserOpenableFileHref('')).toBe(false)
  })

  it('opens browser-openable hrefs in a noopener tab', () => {
    const openWindow = vi.fn()

    expect(openFileHrefInNewTab('file:///Users/me/docs/a.md', openWindow)).toBe(true)
    expect(openWindow).toHaveBeenCalledWith('file:///Users/me/docs/a.md', '_blank', 'noopener')
  })

  it('does not open workspace virtual hrefs in a browser tab', () => {
    const openWindow = vi.fn()

    expect(openFileHrefInNewTab(`${MDP_WS_FILE}docs%2Fa.md`, openWindow)).toBe(false)
    expect(openWindow).not.toHaveBeenCalled()
  })
})
