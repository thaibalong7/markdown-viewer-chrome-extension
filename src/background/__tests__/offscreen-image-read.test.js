import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../../../public/offscreen.js', import.meta.url), 'utf8')

function harness() {
  let listener
  let xhr
  const sendMessage = vi.fn(async () => {})
  class FakeXhr {
    status = 0
    open = vi.fn()
    send = vi.fn()
    abort = vi.fn(() => this.onabort?.())
    constructor() { xhr = this }
  }
  runInNewContext(source, {
    XMLHttpRequest: FakeXhr, URL, ArrayBuffer, Uint8Array, btoa,
    chrome: { runtime: { sendMessage, onMessage: { addListener: (callback) => { listener = callback } } } }
  })
  return {
    sendMessage, xhr: () => xhr,
    start: (url = 'file:///docs/image.png', maxBytes = 5) => listener({ type: 'MDP_OFFSCREEN_FETCH', id: 'read', url, format: 'bytes', maxBytes })
  }
}

describe('offscreen binary transport', () => {
  it('serializes exact non-UTF-8 bytes for status-zero local reads', async () => {
    const h = harness()
    h.start()
    h.xhr().response = new Uint8Array([0, 255, 128, 1]).buffer
    h.xhr().onload()
    await vi.waitFor(() => expect(h.sendMessage).toHaveBeenCalledWith({
      type: 'MDP_OFFSCREEN_FETCH_DONE', id: 'read', ok: true, base64: 'AP+AAQ==', size: 4
    }))
    expect(h.xhr().responseType).toBe('arraybuffer')
  })

  it.each(['progress', 'completed'])('rejects oversized images during %s before serialization', async (stage) => {
    const h = harness()
    h.start()
    if (stage === 'progress') h.xhr().onprogress({ loaded: 6 })
    else {
      h.xhr().response = new Uint8Array(6).buffer
      h.xhr().onload()
    }
    await vi.waitFor(() => expect(h.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ ok: false, code: 'document-too-large' })))
    if (stage === 'progress') expect(h.xhr().abort).toHaveBeenCalledOnce()
    expect(h.sendMessage.mock.calls[0][0].base64).toBeUndefined()
  })

  it('rejects remote URLs and surfaces binary transport failures', async () => {
    const h = harness()
    h.start('https://example.com/image.png')
    await vi.waitFor(() => expect(h.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: 'Only file: URLs are allowed' })))
    expect(h.xhr()).toBeUndefined()
    h.start()
    h.xhr().onerror()
    await vi.waitFor(() => expect(h.sendMessage).toHaveBeenLastCalledWith(expect.objectContaining({ ok: false, error: 'XHR failed (network or blocked)' })))
  })
})
