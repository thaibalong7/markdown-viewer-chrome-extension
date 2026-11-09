import { afterEach, expect, it, vi } from 'vitest'
import { createSearchSourceCache } from '../search-source-cache.js'
import { createSearchTextStore } from '../search-text-store.js'
import { searchWorkspace } from '../workspace-search.js'
import { createSearchMatchingClient } from '../search-matching-client.js'

afterEach(() => vi.unstubAllGlobals())
const file = { href: 'file:///notes/a.md', path: 'a.md' }

it('reuses source/normalization across queries and mode changes, but force/TTL refresh reads disk', async () => {
  let now = 0, text = 'hải hai'
  const readDocument = vi.fn(async () => ({ text }))
  const cache = createSearchSourceCache({ readDocument, now: () => now })
  const matcher = createSearchMatchingClient(cache.namespace)
  const run = (query, options, forceRefresh = false) => searchWorkspace({ files: [file], cache, matcher, query, options, forceRefresh })
  expect((await run('hải')).count).toBe(1)
  expect((await run('hai', { diacriticSensitive: false })).count).toBe(2)
  expect(readDocument).toHaveBeenCalledTimes(1)
  text = 'new needle'
  expect((await run('needle', {}, true)).count).toBe(1)
  expect(readDocument).toHaveBeenCalledTimes(2)
  now = 6000
  await run('needle')
  expect(readDocument).toHaveBeenCalledTimes(3)
  cache.dispose(); matcher.dispose()
})

it('validates handle metadata, refreshes changed files and always searches the live draft', async () => {
  let version = 1
  const reader = { getFile: vi.fn(async () => ({ size: 10, lastModified: version, text: async () => `version ${version}` })) }
  const readDocument = vi.fn(async ({ workspaceReader }) => ({ text: await workspaceReader.text() }))
  const cache = createSearchSourceCache({ readDocument })
  const read = extra => cache.read(file, { reader, ...extra })
  const first = await read()
  expect((await read()).key).toBe(first.key)
  expect(readDocument).toHaveBeenCalledTimes(1)
  version = 2
  expect((await read()).text).toBe('version 2')
  expect(readDocument).toHaveBeenCalledTimes(2)
  expect((await read({ current: { href: file.href, dirty: true, text: 'draft' } })).text).toBe('draft')
  expect((await read({ current: { href: file.href, dirty: false, text: 'saved' } })).text).toBe('version 2')
  expect(readDocument).toHaveBeenCalledTimes(3)
  cache.dispose()
})

it('coalesces in-flight reads across cancelled queries and drops late scope completions', async () => {
  let finish
  const readDocument = vi.fn(() => new Promise(resolve => { finish = resolve }))
  const cache = createSearchSourceCache({ readDocument })
  const controller = new AbortController()
  const first = cache.read(file, { signal: controller.signal })
  const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' })
  controller.abort(); await rejected
  const second = cache.read(file)
  finish({ text: 'needle' })
  expect((await second).text).toBe('needle')
  expect(readDocument).toHaveBeenCalledTimes(1)
  const late = cache.read({ href: 'file:///notes/b.md' })
  cache.dispose(); finish({ text: 'late' })
  await expect(late).rejects.toMatchObject({ name: 'AbortError' })
  expect(cache.bytes).toBe(0)
})

it('keeps source and prepared caches within their budgets and restores evicted worker keys', async () => {
  const cache = createSearchSourceCache({ maxBytes: 200, readDocument: async () => ({ text: 'x'.repeat(100) }) })
  await cache.read(file)
  expect(cache.bytes).toBeLessThanOrEqual(200)
  const store = createSearchTextStore({ maxBytes: 700, maxEntries: 1 })
  const job = { key: 'scope:a', source: 'ha\u0309i hải', query: 'hai', options: { diacriticSensitive: false }, limit: 10 }
  expect(store.match(job).matches.map(match => match.text)).toEqual(['hải', 'hải'])
  store.match({ ...job, key: 'scope:b', source: 'another' })
  expect(store.match({ ...job, source: undefined }).missing).toBe(true)
  expect(store.bytes).toBeLessThanOrEqual(700)
  expect(store.match(job).matches).toHaveLength(2)
  cache.dispose()
})

it('bounds UTF-8 draft bytes, and never reads an oversize handle before the loader checks it', async () => {
  const cache = createSearchSourceCache()
  await expect(cache.read(file, { current: { href: file.href, dirty: true, text: '界'.repeat(750000) } })).rejects.toMatchObject({ code: 'document-too-large' })
  const text = vi.fn()
  await expect(cache.read(file, { reader: { getFile: async () => ({ size: 3 * 1024 * 1024, text }) } })).rejects.toMatchObject({ code: 'document-too-large' })
  expect(text).not.toHaveBeenCalled()
  cache.dispose()
})

it('briefly caches failed file reads and retries them on explicit refresh', async () => {
  const readDocument = vi.fn(async () => { throw Object.assign(new Error('too large'), { code: 'document-too-large' }) })
  const cache = createSearchSourceCache({ readDocument })
  await expect(cache.read(file)).rejects.toThrow('too large')
  await expect(cache.read(file)).rejects.toThrow('too large')
  expect(readDocument).toHaveBeenCalledTimes(1)
  await expect(cache.read(file, { force: true })).rejects.toThrow('too large')
  expect(readDocument).toHaveBeenCalledTimes(2)
  cache.dispose()
})


it('does not join a read started before the active document revision changed', async () => {
  const completions = []
  const readDocument = vi.fn(() => new Promise(resolve => completions.push(resolve)))
  const cache = createSearchSourceCache({ readDocument })
  const first = cache.read(file, { current: { href: file.href, text: 'old' } })
  const second = cache.read(file, { current: { href: file.href, text: 'saved' } })
  expect(readDocument).toHaveBeenCalledTimes(2)
  completions[1]({ text: 'saved' })
  const fresh = await second
  completions[0]({ text: 'old' })
  await first
  expect((await cache.read(file, { current: { href: file.href, text: 'saved' } })).key).toBe(fresh.key)
  expect(readDocument).toHaveBeenCalledTimes(2)
  cache.dispose()
})
