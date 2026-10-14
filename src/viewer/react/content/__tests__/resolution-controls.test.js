// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createResolutionControls } from '../../../media/resolution-controller.js'
import { createArticle, cleanDom, fire } from './dom-test-helpers.js'
import { attachTooltip } from '../../../dom-tooltip.js'
vi.mock('../../../dom-tooltip.js', () => ({ attachTooltip: vi.fn(() => ({ hide: vi.fn(), setText: vi.fn(), destroy: vi.fn() })) }))
afterEach(() => { cleanDom(); vi.clearAllMocks() })
function harness(onChange = vi.fn(async () => true)) {
  const target = createArticle()
  const controls = createResolutionControls({ buttonClass: 'media-button', onChange, target })
  const group = controls.group
  return { controls, onChange, group, trigger: group.querySelector('.mdp-lightbox-resolution__trigger'), down: group.querySelector('[data-direction="decrease"]'), up: group.querySelector('[data-direction="increase"]') }
}
const settle = async () => { await Promise.resolve(); await Promise.resolve() }

describe('React resolution controls', () => {
  it('keeps limits, level, busy and disclosure declarative', async () => {
    const h = harness()
    h.controls.setResolution(2, { width: 2000, height: 1500 })
    expect(h.group.dataset.expanded).toBe('false')
    expect(h.up.tabIndex).toBe(-1)
    fire(h.group, 'mouseover')
    expect(h.group.dataset.expanded).toBe('true')
    fire(h.up, 'click')
    expect(h.group.getAttribute('aria-busy')).toBe('true')
    expect(h.up.disabled).toBe(true)
    await settle()
    expect(h.trigger.textContent).toContain('×2.25')
    expect(h.group.dataset.state).toBe('ready')
    h.controls.destroy()
  })
  it('reveals on keyboard focus and touch activation', () => {
    const h = harness()
    h.controls.setResolution(2)
    h.trigger.focus()
    expect(h.group.dataset.expanded).toBe('true')
    const outside = document.createElement('button'); document.body.append(outside); outside.focus()
    expect(h.group.dataset.expanded).toBe('false')
    fire(h.trigger, 'click', { detail: 1 })
    expect(h.group.dataset.expanded).toBe('true')
    h.controls.destroy()
  })
  it('caps the opening level and prevents oversized requests', () => {
    const h = harness()
    expect(h.controls.setResolution(8, { width: 2000, height: 1500 })).toBe(3.25)
    expect(h.trigger.textContent).toContain('Maximum×3.25')
    expect(h.up.disabled).toBe(true)
    fire(h.up, 'click')
    expect(h.onChange).not.toHaveBeenCalled()
    expect(h.controls.setResolution(2, { width: 20000, height: 1 })).toBeNull()
    expect(h.trigger.textContent).toContain('Unavailable—')
    h.controls.destroy()
  })
  it('requires disclosure and locks concurrent requests', async () => {
    let finish
    const h = harness(vi.fn(() => new Promise(resolve => { finish = resolve })))
    h.controls.setResolution(2)
    h.up.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(h.onChange).not.toHaveBeenCalled()
    fire(h.group, 'mouseover')
    fire(h.up, 'click'); fire(h.down, 'click')
    expect(h.onChange).toHaveBeenCalledOnce()
    finish(true); await settle()
    expect(h.trigger.textContent).toContain('×2.25')
    h.controls.destroy()
  })
  it('preserves the last successful level on failure and resets on reopening', async () => {
    const h = harness(vi.fn(async () => { throw new Error('Decode failed') }))
    h.controls.setResolution(2)
    fire(h.group, 'mouseover'); fire(h.up, 'click'); await settle()
    expect(h.trigger.textContent).toContain('Failed×2')
    expect(h.trigger.getAttribute('aria-label')).toContain('Decode failed')
    h.controls.setResolution(1.5)
    expect(h.group.dataset.state).toBe('ready')
    expect(h.group.dataset.expanded).toBe('false')
    h.controls.setResolution(null)
    expect(h.group.hidden).toBe(true)
    h.controls.destroy()
  })
  it.each(['resolve', 'reject'])('ignores a stale %s after reopening or destroy', async outcome => {
    let resolve, reject
    const h = harness(vi.fn(() => new Promise((a, b) => { resolve = a; reject = b })))
    h.controls.setResolution(2)
    fire(h.group, 'mouseover'); fire(h.up, 'click')
    h.controls.setResolution(1)
    outcome === 'resolve' ? resolve(true) : reject(new Error('stale'))
    await settle()
    expect(h.trigger.textContent).toContain('Resolution×1')
    h.controls.destroy(); h.controls.destroy()
    expect(h.group.isConnected).toBe(false)
  })
  it('suppresses tooltips while rendering and releases every tooltip on close', async () => {
    const h = harness()
    h.controls.setResolution(2)
    const tips = attachTooltip.mock.results.map(result => result.value)
    fire(h.group, 'mouseover'); fire(h.up, 'click')
    expect(tips.every(tip => tip.setText.mock.calls.at(-1)[0] === '')).toBe(true)
    await settle()
    h.controls.setResolution(null)
    expect(tips.every(tip => tip.destroy.mock.calls.length === 1)).toBe(true)
    h.controls.destroy()
  })
})
