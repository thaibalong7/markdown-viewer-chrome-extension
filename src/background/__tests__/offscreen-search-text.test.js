import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../../../public/offscreen.js', import.meta.url), 'utf8')
function harness() {
  let listener, xhr
  const workers = []
  class FakeXhr {
    status = 0
    constructor() { xhr = this }
    open() {} send() {}
    abort = vi.fn(() => this.onabort?.())
  }
  class FakeWorker {
    constructor(url, options) { this.url = url; this.options = options; workers.push(this) }
    postMessage = vi.fn()
    terminate = vi.fn()
  }
  const sendMessage = vi.fn(async () => {})
  runInNewContext(source, { XMLHttpRequest: FakeXhr, Worker: FakeWorker, TextDecoder, URL, ArrayBuffer, Uint8Array,
    chrome: { runtime: { getURL: path => `chrome-extension://test/${path}`, sendMessage, onMessage: { addListener: fn => { listener = fn } } } } })
  return { sendMessage, workers, xhr: () => xhr, send: message => listener(message) }
}

it('aborts an oversized text stream before decoding and does not retry it unbounded', async () => {
  const h = harness()
  h.send({ type: 'MDP_OFFSCREEN_FETCH', id: 'large', url: 'file:///notes/a.md', maxBytes: 5 })
  expect(h.xhr().responseType).toBe('arraybuffer')
  h.xhr().onprogress({ loaded: 6 })
  await vi.waitFor(() => expect(h.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ ok: false, code: 'document-too-large' })))
  expect(h.xhr().abort).toHaveBeenCalledOnce()
  expect(h.sendMessage.mock.calls[0][0].text).toBeUndefined()
})

it('decodes bounded UTF-8 including empty documents and checks the final buffer limit', async () => {
  const h = harness()
  const send = () => h.send({ type: 'MDP_OFFSCREEN_FETCH', id: 'text', url: 'file:///notes/a.md', maxBytes: 5 })
  send(); h.xhr().response = new TextEncoder().encode('hải').buffer; h.xhr().onload()
  await vi.waitFor(() => expect(h.sendMessage).toHaveBeenLastCalledWith(expect.objectContaining({ ok: true, text: 'hải' })))
  send(); h.xhr().response = new ArrayBuffer(0); h.xhr().onload()
  await vi.waitFor(() => expect(h.sendMessage).toHaveBeenLastCalledWith(expect.objectContaining({ ok: true, text: '' })))
  send(); h.xhr().response = new ArrayBuffer(6); h.xhr().onload()
  await vi.waitFor(() => expect(h.sendMessage).toHaveBeenLastCalledWith(expect.objectContaining({ ok: false, code: 'document-too-large' })))
})

it('reuses one packaged worker, correlates replies, and rejects non-extension worker URLs', async () => {
  const h = harness()
  const job = { type: 'MDP_OFFSCREEN_SEARCH', id: 'a', payload: { query: 'needle' }, workerUrl: 'chrome-extension://test/assets/search-worker.js' }
  h.send(job); h.send({ ...job, id: 'b' })
  expect(h.workers).toHaveLength(1)
  expect(h.workers[0].options).toEqual({ type: 'module' })
  h.workers[0].onmessage({ data: { id: 'b', result: { matches: [] } } })
  expect(h.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'b', ok: true, result: { matches: [] } }))
  h.send({ ...job, id: 'bad', workerUrl: 'file:///assets/arbitrary.js' })
  expect(h.sendMessage).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'bad', ok: false }))
  h.workers[0].onerror()
  expect(h.workers[0].terminate).toHaveBeenCalledOnce()
  expect(h.sendMessage).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a', ok: false }))
})
