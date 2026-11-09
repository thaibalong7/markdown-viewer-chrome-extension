import { afterEach, expect, it, vi } from 'vitest'
import { createSearchMatchingClient } from '../search-matching-client.js'
import { createSearchTextStore } from '../search-text-store.js'

afterEach(() => vi.unstubAllGlobals())
it('does not resend file content on warm queries and recovers if the worker evicts it', async () => {
  const store = createSearchTextStore()
  const sendMessage = vi.fn(async message => ({ ok: true, data: message.payload.operation === 'release' ? (store.release('scope:'), { released: true }) : store.match(message.payload) }))
  vi.stubGlobal('chrome', { runtime: { id: 'test', sendMessage } })
  const client = createSearchMatchingClient('scope')
  const entry = { key: 'scope:1', text: 'hải hai', workerKnown: false }
  expect((await client.match(entry, 'hải', {}, 20)).matches).toHaveLength(1)
  expect((await client.match(entry, 'hai', { diacriticSensitive: false }, 20)).matches).toHaveLength(2)
  expect(sendMessage.mock.calls[1][0].payload.source).toBeUndefined()
  store.clear()
  expect((await client.match(entry, 'hai', {}, 20)).matches).toHaveLength(1)
  expect(sendMessage).toHaveBeenCalledTimes(4)
  expect(sendMessage.mock.calls[3][0].payload.source).toBe('hải hai')
  client.dispose()
  expect(store.size).toBe(0)
})

it('surfaces worker transport failures without falling back to heavy UI-thread matching', async () => {
  vi.stubGlobal('chrome', { runtime: { id: 'test', sendMessage: async () => ({ ok: false, error: 'worker unavailable' }) } })
  const client = createSearchMatchingClient('scope')
  await expect(client.match({ key: 'scope:1', text: 'needle' }, 'needle', {}, 20)).rejects.toMatchObject({ code: 'search-worker-unavailable' })
  // The disposal path also reports its structured failure through the logger.
})
