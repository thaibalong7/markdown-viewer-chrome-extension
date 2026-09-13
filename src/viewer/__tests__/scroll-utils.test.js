import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  findHeadingByHash,
  hashTargetToUrlFragment,
  scrollToElementInViewerWithAnchorLock
} from '../scroll-utils.js'

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

describe('viewer anchor lock', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function createScrollFixture() {
    let headingDocumentTop = 500
    let resizeCallback = null
    const scrollRoot = new EventTarget()
    scrollRoot.scrollTop = 0
    scrollRoot.getBoundingClientRect = () => ({ top: 0 })
    scrollRoot.scrollTo = vi.fn(({ top }) => {
      scrollRoot.scrollTop = top
    })
    const layoutRoot = new EventTarget()
    const element = {
      isConnected: true,
      getBoundingClientRect: () => ({ top: headingDocumentTop - scrollRoot.scrollTop })
    }

    class ResizeObserverMock {
      constructor(callback) {
        resizeCallback = callback
      }
      observe() {}
      disconnect() {}
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    vi.stubGlobal('requestAnimationFrame', (callback) => setTimeout(callback, 0))
    vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id))

    return {
      element,
      layoutRoot,
      scrollRoot,
      moveHeadingTo: (top) => { headingDocumentTop = top },
      notifyResize: () => resizeCallback?.()
    }
  }

  it('re-anchors the heading when late-rendered content shifts its document position', () => {
    vi.useFakeTimers()
    const fixture = createScrollFixture()

    scrollToElementInViewerWithAnchorLock({
      ...fixture,
      toolbarHeight: 0,
      behavior: 'smooth',
      smoothSettleDelay: 100,
      lockDuration: 1000
    })
    expect(fixture.scrollRoot.scrollTo).toHaveBeenLastCalledWith({ top: 492, behavior: 'smooth' })

    fixture.moveHeadingTo(700)
    fixture.notifyResize()
    vi.advanceTimersByTime(101)

    expect(fixture.scrollRoot.scrollTo).toHaveBeenLastCalledWith({ top: 692, behavior: 'auto' })
  })

  it('releases the anchor as soon as the user starts scrolling', () => {
    vi.useFakeTimers()
    const fixture = createScrollFixture()

    scrollToElementInViewerWithAnchorLock({
      ...fixture,
      toolbarHeight: 0,
      behavior: 'auto',
      lockDuration: 1000
    })
    vi.advanceTimersByTime(1)
    fixture.scrollRoot.scrollTo.mockClear()

    fixture.scrollRoot.dispatchEvent(new Event('wheel'))
    fixture.moveHeadingTo(700)
    fixture.notifyResize()
    vi.runAllTimers()

    expect(fixture.scrollRoot.scrollTo).not.toHaveBeenCalled()
  })
})
