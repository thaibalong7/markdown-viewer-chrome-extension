// @vitest-environment jsdom
import { act } from 'react'
import { COPY_BUTTON_FEEDBACK_MS } from '../../../../shared/constants/viewer.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { codeHighlightPlugin } from '../../../../plugins/core/code-highlight.plugin.js'
import { attachMermaidCopyButton, attachMermaidActionsMenu } from '../../../../plugins/optional/mermaid-actions.js'
import { createArticle, cleanDom, fire } from './dom-test-helpers.js'

const exports = vi.hoisted(() => ({ svg: vi.fn(), png: vi.fn() }))
vi.mock('../../../../plugins/optional/mermaid-export.js', () => ({ exportMermaidSvg: exports.svg, exportMermaidPng: exports.png }))
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true) })
afterEach(async () => { await act(async () => cleanDom()); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks() })

async function codeHarness(copyAction) {
  const article = createArticle()
  article.innerHTML = '<pre data-mdp-lang="css"><code><span class="line"><span>color: #ABC;</span></span></code></pre>'
  const pre = article.firstElementChild
  const span = pre.querySelector('span.line > span')
  let cleanup
  await act(async () => { cleanup = codeHighlightPlugin.afterRender({ articleEl: article, copyCodeWithToast: copyAction }) })
  return { article, pre, span, cleanup, button: article.querySelector('button') }
}
async function mermaidHarness() {
  const article = createArticle()
  const chart = document.createElement('div'); chart.className = 'mdp-mermaid'
  chart.innerHTML = '<svg width="100" height="50"></svg>'; article.append(chart)
  let cleanup
  await act(async () => { cleanup = attachMermaidActionsMenu(chart, { chartIndex: 2 }) })
  return { article, chart, cleanup, trigger: chart.querySelector('.mdp-mermaid-actions__trigger'), menu: article.parentElement.querySelector('[role="menu"]') }
}

describe('React content toolbar behavior', () => {
  it('preserves code and Shiki node identity and copies exactly the original source', async () => {
    const copy = vi.fn(async () => true)
    const h = await codeHarness(copy)
    expect(h.pre.querySelector('span.line > span')).toBe(h.span)
    expect(h.pre.textContent).toBe('color: #ABC;')
    await act(async () => fire(h.button, 'click'))
    expect(copy).toHaveBeenCalledWith('color: #ABC;', null, { inline: true })
    expect(h.button.classList.contains('is-copied')).toBe(true)
    await act(async () => vi.advanceTimersByTimeAsync(COPY_BUTTON_FEEDBACK_MS))
    expect(h.button.classList.contains('is-copied')).toBe(false)
    await act(async () => h.cleanup())
  })
  it('releases tooltips and feedback timers with its render lifecycle', async () => {
    const h = await codeHarness(vi.fn(async () => true))
    await act(async () => { fire(h.button, 'pointerover'); await vi.advanceTimersByTimeAsync(500) })
    expect(h.article.parentElement.querySelector('[role="tooltip"]')).not.toBeNull()
    await act(async () => h.cleanup())
    expect(h.article.parentElement.querySelector('[role="tooltip"]')).toBeNull()
    expect(h.pre.isConnected).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('does not apply clipboard feedback after the document toolbar is removed', async () => {
    let finish
    const h = await codeHarness(vi.fn(() => new Promise(resolve => { finish = resolve })))
    await act(async () => fire(h.button, 'click'))
    expect(h.button.disabled).toBe(true)
    await act(async () => h.cleanup())
    await act(async () => { finish(true); await vi.advanceTimersByTimeAsync(0) })
    expect(h.button.classList.contains('is-copied')).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
  it.each(['body fallback', 'another control'])('settles copy focus safely when it moved to %s', async target => {
    let finish
    const h = await codeHarness(vi.fn(() => new Promise(resolve => { finish = resolve })))
    await act(async () => fire(h.button, 'click'))
    const outside = document.createElement('button'); document.body.append(outside)
    const focusTarget = target === 'body fallback' ? document.body : outside
    focusTarget.tabIndex = -1; focusTarget.focus()
    await act(async () => { finish(true); await vi.advanceTimersByTimeAsync(0) })
    expect(document.activeElement).toBe(target === 'body fallback' ? h.button : outside)
    await act(async () => h.cleanup())
  })
  it('keeps Mermaid source independent of SVG labels and output actions', async () => {
    const h = await mermaidHarness()
    const copy = vi.fn(async () => true)
    let cleanupCopy
    await act(async () => { cleanupCopy = attachMermaidCopyButton(h.chart, { source: 'flowchart LR\nA-->B', copyCodeWithToast: copy }) })
    await act(async () => fire(h.chart.querySelector('.mdp-mermaid-toolbar__copy'), 'click'))
    expect(copy).toHaveBeenCalledWith('flowchart LR\nA-->B', null, { inline: true })
    expect(h.article.contains(h.menu)).toBe(false)
    await act(async () => { h.cleanup(); cleanupCopy() })
  })
  it('positions the export menu, supports keyboard navigation and exports with the original scale/index', async () => {
    const h = await mermaidHarness()
    await act(async () => { fire(h.trigger, 'click'); await vi.advanceTimersByTimeAsync(40) })
    expect(h.menu.hidden).toBe(false)
    expect(document.activeElement.textContent).toBe('Download SVG')
    await act(async () => fire(document.activeElement, 'keydown', { key: 'End' }))
    expect(document.activeElement.textContent).toBe('PNG 4x')
    await act(async () => fire(document.activeElement, 'click'))
    expect(exports.png).toHaveBeenCalledWith(h.chart, { chartIndex: 2, scale: 4 })
    expect(h.menu.hidden).toBe(true)
    await act(async () => h.cleanup())
  })
  it('cancels pending positioning and cannot revive a destroyed export menu', async () => {
    const h = await mermaidHarness()
    await act(async () => { fire(h.trigger, 'click'); h.cleanup(); await vi.advanceTimersByTimeAsync(40) })
    expect(h.menu.isConnected).toBe(false)
  })
})
