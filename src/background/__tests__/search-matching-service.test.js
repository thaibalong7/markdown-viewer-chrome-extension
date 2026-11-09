import { afterEach, expect, it, vi } from 'vitest'
vi.mock('../../viewer/search/search-worker.js?worker&url', () => ({ default: 'chrome-extension://test/assets/search-worker.js' }))
import { matchSearchText } from '../search-matching-service.js'

afterEach(() => vi.unstubAllGlobals())
function api() {
  const listeners = new Set()
  const sendMessage = vi.fn(async message => { for (const listener of listeners) listener({ type: 'MDP_OFFSCREEN_SEARCH_DONE', id: message.id, ok: true, result: { matches: [] } }) })
  vi.stubGlobal('chrome', { runtime: { getContexts: async () => [{}], getURL: path => `chrome-extension://test/${path}`, sendMessage,
    onMessage: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) } }, offscreen: { createDocument: vi.fn() } })
  return { sendMessage, listeners }
}
const payload = { namespace: 'session', key: 'session:1', source: 'hải', query: 'hai', limit: 2000, options: { diacriticSensitive: false } }
it('bounds worker requests and isolates cached keys by the sender document', async () => {
  const h = api()
  await expect(matchSearchText(payload, { documentId: 'doc-a' })).resolves.toEqual({ matches: [] })
  expect(h.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ key: 'doc-a/session:1' }), workerUrl: 'chrome-extension://test/assets/search-worker.js' }))
  expect(h.listeners.size).toBe(0)
  await matchSearchText({ namespace: 'session', operation: 'release' }, { documentId: 'doc-b' })
  expect(h.sendMessage).toHaveBeenLastCalledWith(expect.objectContaining({ payload: { operation: 'release', namespace: 'doc-b/session' } }))
  await expect(matchSearchText({ ...payload, source: '界'.repeat(750000) })).rejects.toThrow('read limit')
  await expect(matchSearchText({ ...payload, limit: 2001 })).rejects.toThrow('Invalid search request')
})
