// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createViewerRoot, teardownViewerRoot } from '../page-overrider.js'

const ICON_URL = 'chrome-extension://test-extension/icons/icon-32.png'

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = '<pre># Local Markdown</pre>'
  vi.stubGlobal('chrome', { runtime: { getURL: (path) => `chrome-extension://test-extension/${path}` } })
})

afterEach(() => {
  teardownViewerRoot()
  vi.unstubAllGlobals()
})

describe('Viewer tab favicon lifecycle', () => {
  it('installs the packaged icon when mounted and removes it on teardown', () => {
    createViewerRoot()

    const icon = document.head.querySelector('link[rel="icon"]')
    expect(icon?.href).toBe(ICON_URL)
    expect(icon?.type).toBe('image/png')
    expect(icon?.getAttribute('sizes')).toBe('32x32')

    teardownViewerRoot()
    teardownViewerRoot()
    expect(document.head.querySelector('link[rel="icon"]')).toBeNull()
    expect(document.querySelector('pre').style.display).toBe('')
  })

  it('keeps one icon across repeated mounts and supports enabling again', () => {
    const first = createViewerRoot()
    expect(createViewerRoot().root).toBe(first.root)
    expect(document.head.querySelectorAll('link[rel="icon"]')).toHaveLength(1)

    teardownViewerRoot()
    createViewerRoot()
    expect(document.head.querySelectorAll('link[rel="icon"]')).toHaveLength(1)
  })

  it('restores original favicon nodes and leaves unrelated head links intact', () => {
    document.head.innerHTML = '<link rel="shortcut ICON" href="original.ico"><link rel="icon" sizes="16x16" href="small.png"><link rel="stylesheet" href="original.css">'
    const originalHtml = document.head.innerHTML
    const originalNodes = Array.from(document.head.children)

    createViewerRoot()
    createViewerRoot()
    expect(document.head.querySelectorAll('link[rel~="icon" i]')).toHaveLength(1)

    teardownViewerRoot()
    expect(document.head.innerHTML).toBe(originalHtml)
    expect(Array.from(document.head.children)).toEqual(originalNodes)
  })

  it('restores the favicon even when the Viewer root was already removed', () => {
    createViewerRoot().root.remove()
    teardownViewerRoot()
    expect(document.getElementById('mdp-viewer-favicon')).toBeNull()
  })
})
