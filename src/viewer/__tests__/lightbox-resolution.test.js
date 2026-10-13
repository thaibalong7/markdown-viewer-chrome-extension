import { afterEach, describe, expect, it, vi } from 'vitest'
import { attachTooltip } from '../dom-tooltip.js'

vi.mock('../dom-tooltip.js', () => ({
  attachTooltip: vi.fn(() => ({ destroy: vi.fn(), hide: vi.fn(), setText: vi.fn() }))
}))
import {
  createResolutionControls,
  getDefaultImageResolution,
  getNextResolution,
  getMaxImageResolution,
  getRasterDimensions
} from '../lightbox-resolution.js'

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('explicit render pixel dimensions', () => {
  it.each([1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 4, 5, 8])('allocates actual bitmap pixels at ×%s, independent of zoom', (resolution) => {
    expect(getRasterDimensions({ width: 600, height: 400, resolution })).toEqual({ width: 600 * resolution, height: 400 * resolution })
  })
  it('uses Mermaid logical dimensions without conflating its 2× baseline and resolution', () => {
    const logical = { width: 1200, height: 800, baseResolution: 2 }
    expect(getRasterDimensions({ ...logical, resolution: 1 })).toEqual({ width: 600, height: 400 })
    expect(getRasterDimensions({ ...logical, resolution: 4 })).toEqual({ width: 2400, height: 1600 })
  })
  it.each([
    { width: Infinity, height: 400, resolution: 1 },
    { width: 0, height: 400, resolution: 1 },
    { width: 600, height: 400, resolution: 0 },
    { width: 16385, height: 100, resolution: 1 },
    { width: 16384, height: 2049, resolution: 1 },
    { width: 6000, height: 6000, resolution: 1 },
    { width: 8193, height: 8193, resolution: 1 }
  ])('rejects allocations outside bounded canvas limits: %o', (options) => {
    expect(() => getRasterDimensions(options)).toThrow(/Bitmap limit/)
  })
  it('follows display pixel density for SVG defaults, bounded at 2×', () => {
    expect(getDefaultImageResolution(1)).toBe(1)
    expect(getDefaultImageResolution(1.25)).toBe(1.25)
    expect(getDefaultImageResolution(1.3)).toBe(1.5)
    expect(getDefaultImageResolution(1.5)).toBe(1.5)
    expect(getDefaultImageResolution(3)).toBe(2)
    expect(getDefaultImageResolution(NaN)).toBe(1)
  })
  it('changes by exactly 0.25 in both directions throughout the range and stops at its limits', () => {
    for (let current = 1; current < 8; current += 0.25) {
      expect(getNextResolution(current, 1)).toBe(current + 0.25)
      expect(getNextResolution(current + 0.25, -1)).toBe(current)
    }
    expect(getNextResolution(1, -1)).toBe(1)
    expect(getNextResolution(8, 1)).toBe(8)
  })
})

function controlsHarness(onChange = vi.fn(async () => true)) {
  function node(tagName) {
    return {
      tagName, children: [], attributes: {}, listeners: {},
      append(...children) { this.children.push(...children) },
      contains(child) { return this === child || this.children.some((node) => node.contains(child)) },
      matches() { return false },
      focus: vi.fn(),
      setAttribute(name, value) { this.attributes[name] = value },
      addEventListener(type, listener) { this.listeners[type] = listener }
    }
  }
  vi.stubGlobal('document', { createElement: node, activeElement: null })
  const controls = createResolutionControls({ buttonClass: 'existing-media-button', onChange })
  const [row, advice] = controls.group.children
  const [actions, trigger] = row.children
  const [down, up] = actions.children[0].children
  const [title, label, status] = trigger.children
  return { controls, onChange, actions, trigger, title, down, up, label, status, advice,
    get hints() { return attachTooltip.mock.results.slice(-3).map((result) => result.value) }
  }
}

describe('image allocation limits', () => {
  it('allows larger bitmaps and accepts the exact side and area limits', () => {
    expect(getRasterDimensions({ width: 16384, height: 2048, resolution: 1 })).toEqual({ width: 16384, height: 2048 })
    expect(getRasterDimensions({ width: 2000, height: 1500, resolution: 3 })).toEqual({ width: 6000, height: 4500 })
  })
  it('calculates the last usable preset by area, by side, and by Mermaid baseline', () => {
    expect(getMaxImageResolution({ width: 2000, height: 1500 })).toBe(3.25)
    expect(getMaxImageResolution({ width: 5000, height: 100 })).toBe(3.25)
    expect(getMaxImageResolution({ width: 4000, height: 3000, baseResolution: 2 })).toBe(3.25)
    expect(getMaxImageResolution({ width: 20000, height: 100 })).toBe(0)
  })
})

describe('separate Resolution controls', () => {
  it('uses Viewer tooltips, suppresses them while busy and releases them on close', () => {
    const h = controlsHarness()
    h.controls.setResolution(2)
    const hints = h.hints
    expect(attachTooltip).toHaveBeenCalledTimes(3)
    expect(h.up.title).toBeUndefined()
    h.controls.setBusy(true)
    for (const hint of hints) expect(hint.setText).toHaveBeenLastCalledWith('')
    h.controls.setBusy(false)
    expect(h.hints[0].setText).toHaveBeenLastCalledWith(expect.stringContaining('Higher resolution uses more memory'))
    h.controls.setResolution(null)
    for (const hint of hints) expect(hint.destroy).toHaveBeenCalledOnce()
  })

  it('hides other tooltips when pointer and keyboard focus target different controls', () => {
    const h = controlsHarness()
    h.controls.setResolution(2)
    const hints = h.hints
    h.up.listeners.focusin()
    expect(hints[0].hide).toHaveBeenCalledOnce()
    expect(hints[1].hide).toHaveBeenCalledOnce()
    expect(hints[2].hide).not.toHaveBeenCalled()
    h.down.listeners.pointerenter()
    expect(hints[2].hide).toHaveBeenCalledOnce()
  })

  it('shows explicit step amounts and replaces the caption at maximum without an extra badge', () => {
    const h = controlsHarness()
    h.controls.setResolution(3.5)
    expect(h.down.textContent).toBe('− 0.25')
    expect(h.up.textContent).toBe('+ 0.25')
    expect(h.status.hidden).toBe(true)
    expect(h.title.textContent).toBe('Resolution')
    expect(h.hints[1].setText).toHaveBeenLastCalledWith('Decrease resolution by 0.25')
    expect(h.hints[2].setText).toHaveBeenLastCalledWith('Increase resolution by 0.25')
    h.controls.setResolution(8)
    expect(h.status.hidden).toBe(false)
    expect(h.status.textContent).toBe('Max')
    expect(h.title.textContent).toBe('Maximum')
    h.controls.setResolution(3.5)
    expect(h.status.hidden).toBe(true)
  })

  it('requires revealing the step buttons, then collapses after pointer exit', async () => {
    const h = controlsHarness()
    h.controls.setResolution(2)
    expect(h.actions.inert).toBe(true)
    expect(h.advice.hidden).toBe(true)
    await h.up.listeners.click()
    expect(h.onChange).not.toHaveBeenCalled()
    h.controls.group.listeners.mouseenter()
    expect(h.actions.inert).toBe(false)
    expect(h.trigger.attributes['aria-expanded']).toBe('true')
    expect(h.up.tabIndex).toBe(0)
    expect(h.actions.attributes['aria-hidden']).toBe('false')
    expect(h.advice.hidden).toBe(true)
    await h.up.listeners.click()
    expect(h.label.textContent).toBe('×2.25')
    expect(h.onChange).toHaveBeenLastCalledWith(2.25)
    document.activeElement = h.up
    h.controls.group.listeners.mouseleave()
    expect(h.actions.inert).toBe(true)
    expect(h.trigger.attributes['aria-expanded']).toBe('false')
    expect(h.up.tabIndex).toBe(-1)
    expect(h.actions.attributes['aria-hidden']).toBe('true')
  })

  it('reveals on keyboard focus or tap and keeps keyboard focus usable outside hover', () => {
    const h = controlsHarness()
    h.controls.setResolution(2)
    h.trigger.listeners.click({ detail: 0 })
    expect(h.actions.inert).toBe(false)
    h.trigger.listeners.click({ detail: 0 })
    expect(h.actions.inert).toBe(true)
    // Touch/pointer focus must not turn the first activation into a close.
    h.controls.group.listeners.focusin()
    h.trigger.listeners.click({ detail: 1 })
    expect(h.actions.inert).toBe(false)
    h.controls.group.listeners.mouseenter()
    h.trigger.listeners.click({ detail: 1 })
    expect(h.actions.inert).toBe(false)
    h.controls.group.listeners.mouseleave()
    h.trigger.listeners.click({ detail: 1 })
    h.controls.group.listeners.focusout({ relatedTarget: null })
    expect(h.actions.inert).toBe(true)
    h.controls.group.listeners.focusin()
    document.activeElement = h.trigger
    h.trigger.matches = () => true
    h.controls.group.listeners.mouseleave()
    expect(h.actions.inert).toBe(false)
    h.controls.group.listeners.focusout({ relatedTarget: h.up })
    expect(h.actions.inert).toBe(false)
    h.controls.group.listeners.focusout({ relatedTarget: null })
    expect(h.actions.inert).toBe(true)
  })

  it('shows the per-image maximum without hover and prevents oversized requests', async () => {
    const h = controlsHarness()
    h.controls.setResolution(2, { width: 5000, height: 100 })
    h.controls.group.listeners.mouseenter()
    for (let step = 0; step < 5; step++) await h.up.listeners.click()
    expect(h.label.textContent).toBe('×3.25')
    expect(h.up.disabled).toBe(true)
    expect(h.status.textContent).toBe('Max')
    expect(h.controls.group.attributes['data-state']).toBe('limit')
    expect(h.hints[0].setText).toHaveBeenLastCalledWith(expect.stringContaining('Maximum ×3.25 for this image'))
    h.controls.group.listeners.mouseleave()
    expect(h.status.textContent).not.toBe('')
    await h.up.listeners.click()
    expect(h.onChange).toHaveBeenCalledTimes(5)
    h.controls.group.listeners.mouseenter()
    await h.down.listeners.click()
    expect(h.label.textContent).toBe('×3')
    expect(h.up.disabled).toBe(false)
    expect(h.status.textContent).toBe('')
  })

  it('clamps the opening default to a usable preset and reports an oversized source', () => {
    const h = controlsHarness()
    expect(h.controls.setResolution(2, { width: 15000, height: 100 })).toBe(1)
    expect(h.label.textContent).toBe('×1')
    expect(h.up.disabled).toBe(true)
    expect(h.down.disabled).toBe(true)
    expect(h.status.textContent).not.toBe('')
    expect(h.controls.setResolution(2, { width: 20000, height: 100 })).toBeNull()
    expect(h.label.textContent).toBe('—')
    expect(h.title.textContent).toBe('Unavailable')
    expect(h.status.textContent).toBe('N/A')
    expect(h.hints[0].setText).toHaveBeenLastCalledWith(expect.stringContaining('Image exceeds bitmap limit'))
    expect(h.status.textContent).not.toBe('')
  })

  it('returns keyboard focus to the trigger after rendering disables a focused step', async () => {
    const h = controlsHarness()
    h.controls.setResolution(2)
    h.controls.group.listeners.focusin()
    document.activeElement = h.up
    h.up.matches = () => true
    await h.up.listeners.click()
    expect(h.trigger.focus).toHaveBeenCalledOnce()
  })

  it('locks repeated changes during rendering and displays failures without tooltip', async () => {
    let resolve
    const h = controlsHarness(vi.fn(() => new Promise((done) => { resolve = done })))
    h.controls.setResolution(2)
    h.controls.group.listeners.mouseenter()
    const pending = h.up.listeners.click()
    expect(h.up.disabled).toBe(true)
    expect(h.down.disabled).toBe(true)
    expect(h.status.textContent).toBe('Rendering')
    expect(h.controls.group.attributes['data-state']).toBe('busy')
    expect(h.trigger.attributes['aria-label']).toContain('rendering')
    expect(h.controls.group.attributes['aria-busy']).toBe('true')
    await h.down.listeners.click()
    expect(h.onChange).toHaveBeenCalledOnce()
    h.controls.setError('Could not encode this resolution.')
    resolve(false)
    await pending
    expect(h.label.textContent).toBe('×2')
    h.controls.group.listeners.mouseleave()
    expect(h.status.textContent).not.toBe('')
    expect(h.status.textContent).toBe('Error')
    expect(h.title.textContent).toBe('Failed')
    expect(h.hints[0].setText).toHaveBeenLastCalledWith(expect.stringContaining('Could not encode this resolution.'))
    expect(h.controls.group.attributes['data-state']).toBe('error')
    expect(h.up.disabled).toBe(false)
    h.controls.clearError()
    expect(h.status.textContent).toBe('')
  })

  it('resets limits, errors and disclosure on reopening and hides for raster images', () => {
    const h = controlsHarness()
    h.controls.setResolution(3, { width: 5000, height: 100 })
    h.controls.setError('Encoding failed')
    h.controls.group.listeners.mouseenter()
    h.controls.setResolution(null)
    expect(h.controls.group.hidden).toBe(true)
    h.controls.setResolution(2, { width: 600, height: 400 })
    expect(h.label.textContent).toBe('×2')
    expect(h.actions.inert).toBe(true)
    expect(h.status.textContent).toBe('')
    expect(h.controls.group.hidden).toBe(false)
    expect(h.up.disabled).toBe(false)
  })

  it('does not apply a stale failure or completion to a reopened image', async () => {
    let reject
    const h = controlsHarness(() => new Promise((resolve, fail) => { reject = fail }))
    h.controls.setResolution(2)
    h.controls.group.listeners.mouseenter()
    const pending = h.up.listeners.click()
    h.controls.setResolution(1)
    reject(new Error('Old image failed'))
    await pending
    expect(h.label.textContent).toBe('×1')
    expect(h.status.textContent).toBe('')
  })
})
