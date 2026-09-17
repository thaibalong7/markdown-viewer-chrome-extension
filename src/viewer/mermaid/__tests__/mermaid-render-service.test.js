import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  officialRender: vi.fn(),
  beautifulRender: vi.fn(),
  sanitize: vi.fn((svg) => `<svg data-sanitized="true">${svg.length}</svg>`),
  attachCopy: vi.fn(() => vi.fn()),
  attachActions: vi.fn(() => vi.fn()),
  attachExpand: vi.fn(() => vi.fn()),
  attachLightbox: vi.fn(() => vi.fn()),
  warn: vi.fn()
}))

vi.mock('mermaid/dist/mermaid.esm.min.mjs', () => ({
  default: { initialize: mocks.initialize, render: mocks.officialRender }
}))
vi.mock('beautiful-mermaid', () => ({ renderMermaidSVG: mocks.beautifulRender }))
vi.mock('../mermaid-sanitizer.js', () => ({ sanitizeMermaidSvg: mocks.sanitize }))
vi.mock('../../../plugins/optional/mermaid-actions.js', () => ({
  attachMermaidCopyButton: mocks.attachCopy,
  attachMermaidActionsMenu: mocks.attachActions,
  attachMermaidLightboxButton: mocks.attachExpand
}))
vi.mock('../../../plugins/optional/mermaid-lightbox.js', () => ({
  attachMermaidLightbox: mocks.attachLightbox
}))
vi.mock('../../../shared/logger.js', () => ({ logger: { warn: mocks.warn } }))

import {
  getMermaidThemeByPreset,
  getMermaidThemeVariablesByPreset,
  renderMermaidIntoNode
} from '../mermaid-render-service.js'

function createElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    className: '',
    textContent: '',
    children: [],
    attributes: {},
    append(...children) {
      this.children.push(...children)
    },
    setAttribute(name, value) {
      this.attributes[name] = value
    }
  }
}

function createNode(source = 'flowchart LR\nA-->B') {
  const classes = new Set()
  return {
    textContent: source,
    ownerDocument: { createElement },
    children: [],
    attributes: {},
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name)
    },
    closest: () => null,
    replaceChildren(...children) {
      this.children = children
    },
    append(...children) {
      this.children.push(...children)
    },
    setAttribute(name, value) {
      this.attributes[name] = value
    },
    set innerHTML(value) {
      this.mountedHtml = value
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.officialRender.mockResolvedValue({ svg: '<svg onclick="bad()"></svg>' })
  mocks.beautifulRender.mockReturnValue('<svg onload="bad()"></svg>')
})

describe('shared Mermaid render service', () => {
  it('uses a readable app-aligned fallback palette for unstyled nodes in dark mode', () => {
    expect(getMermaidThemeByPreset('dark')).toBe('base')
    expect(getMermaidThemeVariablesByPreset('dark')).toMatchObject({
      darkMode: true,
      background: '#0d121b',
      mainBkg: '#1d2735',
      nodeBkg: '#1d2735',
      nodeBorder: '#465469',
      primaryTextColor: '#edf2f7',
      lineColor: '#9ba9bb'
    })
    expect(getMermaidThemeByPreset('solarized-dark')).toBe('base')
    expect(getMermaidThemeVariablesByPreset('solarized-dark')).toMatchObject({
      darkMode: true,
      background: '#002b36',
      mainBkg: '#0b3e4d',
      primaryTextColor: '#d2dede'
    })
  })

  it('preserves Mermaid defaults in light mode', () => {
    expect(getMermaidThemeByPreset('light')).toBe('default')
    expect(getMermaidThemeVariablesByPreset('light')).toBeUndefined()
  })

  it.each([
    ['official', mocks.officialRender],
    ['beautiful', mocks.beautifulRender]
  ])('sanitizes %s renderer output and attaches the shared interactions', async (renderer) => {
    const node = createNode()
    const result = await renderMermaidIntoNode({
      node,
      source: node.textContent,
      settings: { theme: { preset: 'dark' }, plugins: { mermaid: { renderer } } },
      copyCodeWithToast: vi.fn(),
      signal: new AbortController().signal
    })

    expect(mocks.sanitize).toHaveBeenCalledOnce()
    expect(node.mountedHtml).toMatch('data-sanitized="true"')
    expect(mocks.attachCopy).toHaveBeenCalledOnce()
    expect(mocks.attachActions).toHaveBeenCalledOnce()
    expect(mocks.attachExpand).toHaveBeenCalledOnce()
    expect(mocks.attachLightbox).toHaveBeenCalledOnce()
    if (renderer === 'official') {
      expect(mocks.initialize).toHaveBeenCalledWith(expect.objectContaining({
        securityLevel: 'strict',
        htmlLabels: false,
        theme: 'base',
        themeVariables: expect.objectContaining({
          nodeBkg: '#1d2735',
          primaryTextColor: '#edf2f7'
        })
      }))
    }
    result.cleanup()
  })

  it('renders a recoverable safe error with the original source', async () => {
    const source = '<script>alert(1)</script>\ninvalid'
    const node = createNode(source)
    mocks.officialRender.mockRejectedValueOnce(new Error('Parse failed'))

    await renderMermaidIntoNode({
      node,
      source,
      settings: { plugins: { mermaid: { renderer: 'official' } } }
    })

    expect(node.classList.contains('mdp-mermaid--error')).toBe(true)
    expect(node.children[0].children[1]).toMatchObject({
      textContent: 'Parse failed',
      attributes: { role: 'alert' }
    })
    expect(node.children[2].textContent).toBe(source)
    expect(mocks.attachCopy).toHaveBeenCalledWith(node, expect.objectContaining({ source }))
  })

  it('does not mount a result after cancellation', async () => {
    const controller = new AbortController()
    const node = createNode()
    mocks.officialRender.mockImplementationOnce(async () => {
      controller.abort()
      return { svg: '<svg></svg>' }
    })

    await expect(renderMermaidIntoNode({
      node,
      source: node.textContent,
      settings: { plugins: { mermaid: { renderer: 'official' } } },
      signal: controller.signal
    })).rejects.toMatchObject({ name: 'AbortError' })
    expect(node.mountedHtml).toBeUndefined()
  })
})
