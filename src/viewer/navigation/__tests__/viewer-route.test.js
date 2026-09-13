import { describe, expect, it, vi } from 'vitest'
import {
  buildDirectFileSectionUrl,
  buildViewerRouteUrl,
  parseViewerRoute,
  writeViewerRoute
} from '../viewer-route.js'

describe('viewer route', () => {
  it('keeps the entry file stable and stores a readable relative target in f', () => {
    expect(buildViewerRouteUrl({
      entryFileUrl: 'file:///project/README.md',
      currentFileUrl: 'file:///project/docs/Guide%20Notes.md',
      hash: 'getting started'
    })).toBe('file:///project/README.md?f=docs/Guide%20Notes.md#getting%20started')
  })

  it('supports parent traversal, Unicode, and encoded target paths', () => {
    const href = buildViewerRouteUrl({
      entryFileUrl: 'file:///project/docs/README.md',
      currentFileUrl: 'file:///project/Ti%E1%BA%BFng%20Vi%E1%BB%87t.md',
      hash: 'cài đặt'
    })

    expect(href).toBe(
      'file:///project/docs/README.md?f=../Ti%E1%BA%BFng%20Vi%E1%BB%87t.md#c%C3%A0i%20%C4%91%E1%BA%B7t'
    )
    expect(parseViewerRoute(href)).toEqual({
      entryFileUrl: 'file:///project/docs/README.md',
      targetFileUrl: 'file:///project/Ti%E1%BA%BFng%20Vi%E1%BB%87t.md',
      hash: 'cài đặt',
      hasFileTarget: true,
      invalidFileTarget: false
    })
  })

  it('round-trips file names containing URL-reserved characters', () => {
    const href = buildViewerRouteUrl({
      entryFileUrl: 'file:///project/README.md',
      currentFileUrl: 'file:///project/docs/100%25%20%26%20ready%3F.md'
    })

    expect(parseViewerRoute(href)?.targetFileUrl).toBe(
      'file:///project/docs/100%25%20%26%20ready%3F.md'
    )
  })

  it('omits f when the logical document is the entry file', () => {
    expect(buildViewerRouteUrl({
      entryFileUrl: 'file:///project/README.md',
      currentFileUrl: 'file:///project/README.md',
      hash: 'intro'
    })).toBe('file:///project/README.md#intro')
  })

  it('rejects unsupported or non-file targets on reload', () => {
    expect(parseViewerRoute('file:///project/README.md?f=https%3A%2F%2Fexample.com%2Fa.md')).toEqual({
      entryFileUrl: 'file:///project/README.md',
      targetFileUrl: 'file:///project/README.md',
      hash: null,
      hasFileTarget: false,
      invalidFileTarget: true
    })
    expect(parseViewerRoute('file:///project/README.md?f=notes.pdf')).toEqual({
      entryFileUrl: 'file:///project/README.md',
      targetFileUrl: 'file:///project/README.md',
      hash: null,
      hasFileTarget: false,
      invalidFileTarget: true
    })
  })

  it('writes push and replace history entries with the stable entry URL', () => {
    const history = { pushState: vi.fn(), replaceState: vi.fn() }
    writeViewerRoute({
      entryFileUrl: 'file:///project/README.md',
      currentFileUrl: 'file:///project/docs/guide.md',
      history
    })
    writeViewerRoute({
      entryFileUrl: 'file:///project/README.md',
      currentFileUrl: 'file:///project/docs/guide.md',
      hash: 'install',
      replace: true,
      history
    })

    expect(history.pushState).toHaveBeenCalledWith(
      null,
      '',
      'file:///project/README.md?f=docs/guide.md'
    )
    expect(history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      'file:///project/README.md?f=docs/guide.md#install'
    )
  })

  it('builds direct section links for real workspace files only', () => {
    expect(buildDirectFileSectionUrl('file:///project/docs/guide.md', 'install')).toBe(
      'file:///project/docs/guide.md#install'
    )
    expect(buildDirectFileSectionUrl('mdp-ws-file:docs%2Fguide.md', 'install')).toBeNull()
  })
})
