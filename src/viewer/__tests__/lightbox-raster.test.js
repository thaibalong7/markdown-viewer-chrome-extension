import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLightboxRasterSession } from '../media/lightbox-raster.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function harness(overrides = {}) {
  let urlId = 0
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:resolution-${++urlId}`)
  const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const source = { content: 'original viewer SVG' }
  const host = { classList: { add: vi.fn(), remove: vi.fn() }, replaceChildren: vi.fn() }
  const controls = { setError: vi.fn(), clearError: vi.fn() }
  const readSource = vi.fn(async () => source.content)
  const rasterize = vi.fn(async () => new Blob(['PNG bitmap']))
  const decodeImage = vi.fn(async () => ({ setAttribute: vi.fn() }))
  const session = createLightboxRasterSession({ host, source, width: 1200, height: 800,
    baseResolution: 2, controls, readSource, rasterize, decodeImage, ...overrides })
  return { session, source, host, controls, readSource, rasterize, decodeImage, createObjectURL, revokeObjectURL }
}

afterEach(() => vi.restoreAllMocks())

describe('lightbox bitmap session lifecycle', () => {
  it('does not read or allocate any bitmap after the session closes', async () => {
    const h = harness()
    h.session.destroy()
    expect(await h.session.update(2)).toBe(false)
    expect(h.readSource).not.toHaveBeenCalled()
    expect(h.rasterize).not.toHaveBeenCalled()
    expect(h.createObjectURL).not.toHaveBeenCalled()
    expect(h.controls.setError).not.toHaveBeenCalled()
  })

  it('skips a superseded resolution while the shared source read is pending', async () => {
    const sourceRead = deferred()
    const readSource = vi.fn(() => sourceRead.promise)
    const h = harness({ readSource })
    const oldUpdate = h.session.update(8)
    const currentUpdate = h.session.update(1)
    sourceRead.resolve('<svg/>')
    expect(await oldUpdate).toBe(false)
    expect(await currentUpdate).toBe(true)
    expect(readSource).toHaveBeenCalledOnce()
    expect(h.rasterize).toHaveBeenCalledExactlyOnceWith(
      '<svg/>', { width: 600, height: 400 },
      { width: 600, height: 400, fragment: '' }, expect.any(AbortSignal)
    )
    expect(h.host.replaceChildren).toHaveBeenCalledOnce()
    h.session.destroy()
  })

  it('rejects an oversized request before reading, rasterizing or replacing the applied bitmap', async () => {
    const h = harness({ width: 2000, height: 1500, baseResolution: 1 })
    expect(await h.session.update(3.25)).toBe(true)
    expect(await h.session.update(3.5)).toBe(false)
    expect(h.readSource).toHaveBeenCalledOnce()
    expect(h.rasterize).toHaveBeenCalledOnce()
    expect(h.host.replaceChildren).toHaveBeenCalledOnce()
    expect(h.controls.setError).toHaveBeenCalledWith(expect.stringContaining('Bitmap limit'), { disable: false })
    h.session.destroy()
  })

  it('retains an SVG view fragment when rasterizing an image resource', async () => {
    const h = harness({ source: { src: 'file:///diagram.svg#detail' } })
    expect(await h.session.update(2)).toBe(true)
    expect(h.rasterize.mock.calls[0][2].fragment).toBe('#detail')
    h.session.destroy()
  })

  it('redraws at the selected pixels and really returns to minimum after higher resolutions', async () => {
    const h = harness()
    for (const resolution of [2, 4, 8, 1]) expect(await h.session.update(resolution)).toBe(true)
    const dimensions = h.rasterize.mock.calls.map((call) => call[1])
    expect(dimensions).toEqual([
      { width: 1200, height: 800 }, { width: 2400, height: 1600 },
      { width: 4800, height: 3200 }, { width: 600, height: 400 }
    ])
    expect(h.readSource).toHaveBeenCalledOnce()
    expect(h.source.content).toBe('original viewer SVG')
    expect(h.host.replaceChildren).toHaveBeenCalledTimes(4)
    h.session.destroy()
    expect(h.revokeObjectURL).toHaveBeenCalledTimes(4)
  })

  it('rejects a stale render completing after a newer resolution', async () => {
    const oldRender = deferred()
    const rasterize = vi.fn().mockReturnValueOnce(oldRender.promise).mockResolvedValueOnce(new Blob(['new PNG']))
    const h = harness({ rasterize })
    const oldUpdate = h.session.update(8)
    await vi.waitFor(() => expect(rasterize).toHaveBeenCalledOnce())
    expect(await h.session.update(1)).toBe(true)
    const current = h.host.replaceChildren.mock.calls[0][0]
    oldRender.resolve(new Blob(['stale PNG']))
    expect(await oldUpdate).toBe(false)
    expect(h.host.replaceChildren).toHaveBeenCalledOnce()
    expect(current.setAttribute).toHaveBeenCalledWith('data-mdp-resolution', '1')
    h.session.destroy()
  })

  it('cannot restore a bitmap into a closed lightbox and releases a pending image URL', async () => {
    const decoding = deferred()
    const h = harness({ decodeImage: vi.fn(() => decoding.promise) })
    const update = h.session.update(4)
    await vi.waitFor(() => expect(h.createObjectURL).toHaveBeenCalledOnce())
    h.session.destroy()
    decoding.resolve({ setAttribute: vi.fn() })
    expect(await update).toBe(false)
    expect(h.host.replaceChildren).not.toHaveBeenCalled()
    expect(h.revokeObjectURL).toHaveBeenCalledWith('blob:resolution-1')
    expect(h.host.classList.add).not.toHaveBeenCalled()
    expect(h.host.classList.remove).not.toHaveBeenCalled()
  })

  it('retains the last successful surface on failure and does not claim the requested resolution', async () => {
    const rasterize = vi.fn().mockResolvedValueOnce(new Blob(['PNG'])).mockRejectedValueOnce(new Error('Encoding failed'))
    const h = harness({ rasterize })
    expect(await h.session.update(2)).toBe(true)
    expect(await h.session.update(4)).toBe(false)
    expect(h.host.replaceChildren).toHaveBeenCalledOnce()
    expect(h.controls.setError).toHaveBeenCalledWith('Encoding failed', { disable: false })
    h.session.destroy()
  })

  it('reports an unavailable source while retaining the original zoomable image', async () => {
    const h = harness({ readSource: vi.fn(async () => { throw new Error('SVG source unavailable') }) })
    expect(await h.session.update(2)).toBe(false)
    expect(h.host.replaceChildren).not.toHaveBeenCalled()
    expect(h.controls.setError).toHaveBeenCalledWith('SVG source unavailable', { disable: true })
    h.session.destroy()
  })
})
