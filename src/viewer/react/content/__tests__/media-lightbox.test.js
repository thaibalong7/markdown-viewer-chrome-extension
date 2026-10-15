// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMediaLightboxController } from '../../../media/media-lightbox-controller.js'
import { createLightboxRasterSession, readSvgSource } from '../../../media/lightbox-raster.js'
import { getRasterDimensions } from '../../../media/resolution-model.js'
import { openImageLightbox, closeImageLightbox, destroyImageLightbox } from '../../../media/image-lightbox-controller.js'
import { openMermaidLightbox, closeMermaidLightbox, destroyMermaidLightbox } from '../../../media/mermaid-lightbox-controller.js'
import { createArticle, cleanDom, fire } from './dom-test-helpers.js'
const raster = vi.hoisted(() => ({ sessions: [] }))
vi.mock('../../../media/lightbox-raster.js', () => ({
  readSvgSource: vi.fn(async () => '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"/>'),
  createLightboxRasterSession: vi.fn(options => {
    const session = { options, update: vi.fn(async () => true), destroy: vi.fn() }
    raster.sessions.push(session)
    return session
  })
}))
afterEach(() => { destroyImageLightbox(); destroyMermaidLightbox(); cleanDom(); raster.sessions = []; vi.clearAllMocks() })
function harness(kind = 'image') {
  const article = createArticle()
  const root = document.createElement('div'); root.className = 'mdp-root'
  article.parentElement.append(root); root.append(article)
  const source = document.createElement('img'); source.src = 'file:///sample.png'; source.tabIndex = 0; article.append(source)
  const controller = createMediaLightboxController({ rootEl: root, kind })
  const open = options => controller.open({ source, dimensions: { width: 600, height: 400 }, ...options })
  return { article, root, source, controller, open, overlay: root.querySelector('[role="dialog"]'), canvas: root.querySelector(`.mdp-${kind}-lightbox__canvas`) }
}
function svgHarness() {
  const h = harness(); h.controller.destroy()
  h.source.src = 'file:///diagram.svg'
  h.source.dataset.mdpFileType = 'svg-image'
  Object.defineProperties(h.source, { complete: { value: true }, naturalWidth: { value: 300 }, naturalHeight: { value: 162 } })
  return h
}
describe('React media lightbox with imperative media island', () => {
  it('opens, zooms and fits without changing the viewer image, then restores focus', () => {
    const h = harness()
    h.source.focus()
    const original = h.source.outerHTML
    h.open()
    expect(h.overlay.hidden).toBe(false)
    expect(document.activeElement.getAttribute('aria-label')).toBe('Close image zoom view')
    expect(h.canvas.querySelector('img')).not.toBe(h.source)
    const transform = h.canvas.style.transform
    fire(h.root.querySelector('[aria-label="Zoom in image"]'), 'click')
    expect(h.canvas.style.transform).not.toBe(transform)
    fire(window, 'keydown', { key: '0' })
    expect(h.canvas.style.transform).toBe(transform)
    fire(window, 'keydown', { key: 'Escape' })
    expect(h.overlay.hidden).toBe(true)
    expect(h.canvas.childElementCount).toBe(0)
    expect(document.activeElement).toBe(h.source)
    expect(h.source.outerHTML).toBe(original)
    h.controller.destroy()
  })
  it('supports pointer pan and ctrl-wheel zoom through a stable canvas node', () => {
    const h = harness(); h.open()
    const viewport = h.overlay.querySelector('.mdp-image-lightbox__viewport')
    function pointer(type, x, y) {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y })
      Object.defineProperty(event, 'pointerId', { value: 1 }); viewport.dispatchEvent(event)
    }
    pointer('pointerdown', 200, 200); pointer('pointermove', 230, 220)
    expect(h.canvas.style.transform).toContain('translate(30px, 20px)')
    expect(h.overlay.classList.contains('is-dragging')).toBe(true)
    pointer('pointerup', 230, 220)
    expect(h.overlay.classList.contains('is-dragging')).toBe(false)
    viewport.dispatchEvent(new WheelEvent('wheel', { bubbles: true, ctrlKey: true, deltaY: -1, clientX: 300, clientY: 200 }))
    expect(h.canvas.style.transform).toContain('scale(1.2)')
    expect(h.root.querySelector('.mdp-image-lightbox__canvas')).toBe(h.canvas)
    h.controller.destroy()
  })
  it('releases raster sessions on reopening, close and destroy, ignoring late completion', async () => {
    const h = harness()
    h.open({ resolution: 2 })
    expect(h.canvas.classList.contains('mdp-lightbox-rasterized')).toBe(true)
    const first = raster.sessions[0]
    h.open({ resolution: 1.5 })
    expect(first.destroy).toHaveBeenCalledOnce()
    const second = raster.sessions[1]
    expect(second.update).toHaveBeenCalledWith(1.5)
    h.controller.close()
    expect(second.destroy).toHaveBeenCalledOnce()
    await Promise.resolve()
    expect(h.overlay.hidden).toBe(true)
    expect(h.canvas.classList.contains('mdp-lightbox-rasterized')).toBe(false)
    h.controller.destroy(); h.controller.destroy()
    expect(h.root.querySelector('[role="dialog"]')).toBeNull()
  })
  it('keeps Mermaid logical dimensions and its 2× baseline separate from zoom', () => {
    const h = harness('mermaid')
    const source = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    source.setAttribute('viewBox', '0 0 300 200'); h.article.append(source)
    h.open({ source, dimensions: { width: 600, height: 400 }, baseResolution: 2, resolution: 2 })
    expect(raster.sessions[0].options).toMatchObject({ width: 600, height: 400, baseResolution: 2 })
    expect(h.canvas.querySelector('svg').getAttribute('width')).toBe('600')
    fire(window, 'keydown', { key: '+' })
    expect(raster.sessions[0].update).toHaveBeenCalledOnce()
    expect(source.getAttribute('width')).toBeNull()
    h.controller.destroy()
  })
  it('uses capability-based resolution only for SVG images and reuses one image overlay', async () => {
    const h = harness(); h.controller.destroy()
    Object.defineProperties(h.source, { complete: { value: true }, naturalWidth: { value: 600 }, naturalHeight: { value: 400 } })
    expect(openImageLightbox(h.source)).toBe(true)
    expect(raster.sessions).toHaveLength(0)
    closeImageLightbox()
    h.source.dataset.mdpFileType = 'svg-image'
    expect(openImageLightbox(h.source)).toBe(true)
    await vi.waitFor(() => expect(raster.sessions).toHaveLength(1))
    expect(h.root.querySelectorAll('.mdp-image-lightbox')).toHaveLength(1)
  })
  it('uses landscape metadata for both the zoom canvas and resolution without changing the viewer image', async () => {
    const h = svgHarness()
    const text = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 1280 690"><text x="12" y="24">Landscape</text></svg>'
    vi.mocked(readSvgSource).mockResolvedValueOnce(text)
    const original = h.source.outerHTML
    expect(openImageLightbox(h.source)).toBe(true)
    await vi.waitFor(() => expect(raster.sessions).toHaveLength(1))
    const canvas = h.root.querySelector('.mdp-image-lightbox__canvas')
    expect(canvas.style.width).toBe('1280px')
    expect(canvas.style.height).toBe('690px')
    const options = raster.sessions[0].options
    expect(getRasterDimensions({ ...options, resolution: 2 })).toEqual({ width: 2560, height: 1380 })
    expect(await options.readSource()).toBe(text)
    expect(readSvgSource).toHaveBeenCalledOnce()
    expect(h.source.outerHTML).toBe(original)
    const transform = canvas.style.transform
    fire(h.root.querySelector('[aria-label="Zoom in image"]'), 'click')
    expect(canvas.style.transform).not.toBe(transform)
    fire(window, 'keydown', { key: '0' })
    expect(canvas.style.transform).toBe(transform)
  })
  it.each(['close', 'destroy', 'escape', 'detach', 'replace'])('does not open a late SVG after %s', async action => {
    const h = svgHarness()
    let finish
    vi.mocked(readSvgSource).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    openImageLightbox(h.source)
    const signal = vi.mocked(readSvgSource).mock.calls[0][1]
    if (action === 'close') closeImageLightbox()
    if (action === 'destroy') destroyImageLightbox()
    if (action === 'escape') fire(window, 'keydown', { key: 'Escape' })
    if (action === 'detach') h.source.remove()
    if (action === 'replace') h.source.src = 'file:///replacement.svg'
    finish('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 690"/>')
    await Promise.resolve()
    await Promise.resolve()
    expect(raster.sessions).toHaveLength(0)
    expect(h.root.querySelector('.mdp-image-lightbox')?.hidden ?? true).toBe(true)
    if (['close', 'destroy', 'escape'].includes(action)) expect(signal.aborted).toBe(true)
  })
  it('ignores an older SVG read when another image opens', async () => {
    const h = svgHarness()
    let finish
    vi.mocked(readSvgSource).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    openImageLightbox(h.source)
    h.source.src = 'file:///next.svg'
    openImageLightbox(h.source)
    await vi.waitFor(() => expect(raster.sessions).toHaveLength(1))
    finish('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 690"/>')
    await Promise.resolve()
    expect(raster.sessions).toHaveLength(1)
    expect(raster.sessions[0].options).toMatchObject({ width: 600, height: 400 })
  })
  it.each(['invalid', 'fragment'])('keeps browser dimensions for %s SVG metadata', async mode => {
    const h = svgHarness()
    if (mode === 'fragment') h.source.src += '#detail'
    vi.mocked(readSvgSource).mockResolvedValueOnce(mode === 'invalid' ? '<svg' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 690"/>')
    openImageLightbox(h.source)
    await vi.waitFor(() => expect(raster.sessions).toHaveLength(1))
    expect(raster.sessions[0].options).toMatchObject({ width: 300, height: 162 })
  })
  it('reports a failed SVG read through resolution controls without reading the source twice', async () => {
    const h = svgHarness()
    const actual = await vi.importActual('../../../media/lightbox-raster.js')
    vi.mocked(createLightboxRasterSession).mockImplementationOnce(actual.createLightboxRasterSession)
    vi.mocked(readSvgSource).mockRejectedValueOnce(new Error('SVG source unavailable'))
    openImageLightbox(h.source)
    await vi.waitFor(() => expect(h.root.querySelector('.mdp-lightbox-resolution')?.textContent).toContain('Unavailable'))
    expect(h.root.querySelector('.mdp-lightbox-resolution__trigger').getAttribute('aria-label')).toContain('SVG source unavailable')
    expect(readSvgSource).toHaveBeenCalledOnce()
    expect(h.root.querySelector('.mdp-image-lightbox__canvas').style.width).toBe('300px')
    expect(h.root.querySelector('.mdp-image-lightbox__canvas img')).not.toBeNull()
  })
  it('opens the standalone/fenced Mermaid adapter and returns focus to its caller', () => {
    const h = harness('mermaid'); h.controller.destroy()
    const chart = document.createElement('div')
    chart.innerHTML = '<svg width="300" height="200" tabindex="0"></svg>'
    h.article.append(chart)
    const source = chart.querySelector('svg'); source.focus()
    openMermaidLightbox(chart)
    expect(h.root.querySelector('.mdp-mermaid-lightbox').hidden).toBe(false)
    expect(raster.sessions[0].options).toMatchObject({ width: 600, height: 400, baseResolution: 2 })
    closeMermaidLightbox()
    expect(document.activeElement).toBe(source)
  })
})
