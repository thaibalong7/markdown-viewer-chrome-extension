import workerUrl from '../viewer/search/search-worker.js?worker&url'
import { ensureOffscreenDocument } from './offscreen-fetch.js'
import { MESSAGE_TYPES } from '../messaging/index.js'

/** Only bounded literal-search jobs cross the background/offscreen boundary. */
export async function matchSearchText(payload = {}, sender = {}) {
  const { namespace, key, query, source, limit, operation, options } = payload
  if (typeof namespace !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(namespace)) throw new Error('Invalid search namespace')
  if (operation !== undefined && operation !== 'release') throw new Error('Invalid search operation')
  if (operation !== 'release') {
    if (typeof key !== 'string' || !key.startsWith(`${namespace}:`) || key.length > 180 || typeof query !== 'string' || query.length > 512 || !Number.isInteger(limit) || limit < 0 || limit > 2000) throw new Error('Invalid search request')
    if (source !== undefined && (typeof source !== 'string' || source.length > 2 * 1024 * 1024 || new TextEncoder().encode(source).byteLength > 2 * 1024 * 1024)) throw new Error('Search source exceeds the read limit')
  }
  const owner = sender.documentId || String(sender.tab?.id ?? 'extension')
  const scopedNamespace = `${owner}/${namespace}`
  const job = operation === 'release' ? { operation, namespace: scopedNamespace } : {
    namespace: scopedNamespace, key: `${owner}/${key}`, query, source, limit,
    options: { caseSensitive: options?.caseSensitive === true, wholeWord: options?.wholeWord === true, diacriticSensitive: options?.diacriticSensitive !== false }
  }
  await ensureOffscreenDocument()
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const cleanup = () => { clearTimeout(timer); chrome.runtime.onMessage.removeListener(onDone) }
    const onDone = message => {
      if (message?.type !== MESSAGE_TYPES.OFFSCREEN_SEARCH_DONE || message.id !== id) return
      cleanup()
      if (message.ok) resolve(message.result)
      else reject(new Error(message.error || 'Search worker failed'))
    }
    const timer = setTimeout(() => { cleanup(); reject(new Error('Search worker timed out')) }, 10000)
    chrome.runtime.onMessage.addListener(onDone)
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OFFSCREEN_SEARCH, id, payload: job, workerUrl: new URL(workerUrl, import.meta.url).href })
      .catch(error => { cleanup(); reject(error) })
  })
}
