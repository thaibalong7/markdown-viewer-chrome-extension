import { Worker } from 'node:worker_threads'
import { afterEach, expect, it } from 'vitest'

let worker
afterEach(async () => { if (worker) await worker.terminate(); worker = null })

it('matches in a real worker, reuses cached Unicode maps and drops released namespaces', async () => {
  const url = new URL('../search-worker.js', import.meta.url).href
  worker = new Worker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:data=>parentPort.postMessage(data)};import(${JSON.stringify(url)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`, { eval: true })
  let sequence = 0
  const send = payload => new Promise((resolve, reject) => {
    const id = ++sequence
    const done = message => { if (message.id !== id) return; worker.off('message', done); worker.off('error', reject); resolve(message) }
    worker.on('message', done); worker.once('error', reject); worker.postMessage({ id, payload })
  })
  const base = { namespace: 'scope', key: 'scope:1', query: 'hai', limit: 20, options: { diacriticSensitive: false } }
  const first = await send({ ...base, source: 'ha\u0309i Hải' })
  expect(first.result.matches.map(match => match.text)).toEqual(['hải', 'Hải'])
  expect(first.result.retained).toBe(true)
  const cached = await send({ ...base, options: { ...base.options, caseSensitive: true } })
  expect(cached.result.matches.map(match => match.text)).toEqual(['hải'])
  expect((await send({ operation: 'release', namespace: 'scope' })).result.released).toBe(true)
  expect((await send(base)).result.missing).toBe(true)
  expect((await send({ ...base, source: 'late completion' })).result.cancelled).toBe(true)
})
