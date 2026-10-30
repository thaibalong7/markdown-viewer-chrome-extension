import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('offscreen document discovery at the Chrome 116 minimum', () => {
  let listeners
  let api

  beforeEach(() => {
    vi.resetModules()
    listeners = new Set()
    api = {
      runtime: {
        getURL: path => `chrome-extension://test/${path}`,
        getContexts: vi.fn(async () => [{ contextType: 'OFFSCREEN_DOCUMENT' }]),
        onMessage: {
          addListener: listener => listeners.add(listener),
          removeListener: listener => listeners.delete(listener)
        },
        sendMessage: vi.fn(async message => {
          for (const listener of [...listeners]) {
            listener({ type: 'MDP_OFFSCREEN_FETCH_DONE', id: message.id, ok: true, text: 'local text' })
          }
        })
      },
      offscreen: { createDocument: vi.fn(async () => {}) }
    }
    vi.stubGlobal('chrome', api)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('reuses an existing document without the newer hasDocument API or creation errors', async () => {
    const { fetchFileTextViaOffscreen } = await import('../offscreen-fetch.js')
    await expect(fetchFileTextViaOffscreen('file:///docs/readme.md')).resolves.toEqual({ text: 'local text' })
    expect(api.runtime.getContexts).toHaveBeenCalledWith({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: ['chrome-extension://test/offscreen.html']
    })
    expect(api.offscreen.createDocument).not.toHaveBeenCalled()
    expect(listeners.size).toBe(0)
  })

  it('creates one missing document when file reads start concurrently', async () => {
    let exists = false
    api.runtime.getContexts.mockImplementation(async () => exists ? [{}] : [])
    api.offscreen.createDocument.mockImplementation(async () => { exists = true })
    const { fetchFileTextViaOffscreen } = await import('../offscreen-fetch.js')
    await expect(Promise.all([
      fetchFileTextViaOffscreen('file:///docs/one.md'),
      fetchFileTextViaOffscreen('file:///docs/two.md')
    ])).resolves.toEqual([{ text: 'local text' }, { text: 'local text' }])
    expect(api.offscreen.createDocument).toHaveBeenCalledOnce()
    expect(listeners.size).toBe(0)
  })

  it('surfaces discovery errors without creating a duplicate document', async () => {
    api.runtime.getContexts.mockRejectedValue(new Error('Context discovery failed'))
    const { fetchFileTextViaOffscreen } = await import('../offscreen-fetch.js')
    await expect(fetchFileTextViaOffscreen('file:///docs/readme.md')).rejects.toThrow('Context discovery failed')
    expect(api.offscreen.createDocument).not.toHaveBeenCalled()
    expect(api.runtime.sendMessage).not.toHaveBeenCalled()
    expect(listeners.size).toBe(0)
  })
})
