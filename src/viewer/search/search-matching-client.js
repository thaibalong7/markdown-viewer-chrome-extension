import { MESSAGE_TYPES, sendMessage } from '../../messaging/index.js'
import { waitForSearch } from './search-source-cache.js'
import { createSearchTextStore } from './search-text-store.js'
import { logger } from '../../shared/logger.js'

export function createSearchMatchingClient(namespace) {
  // Non-extension test/preview hosts use the same bounded store. The packaged
  // extension always executes in the offscreen worker, never in the reader UI.
  const local = globalThis.chrome?.runtime?.id ? null : createSearchTextStore()
  let disposed = false
  let used = false
  const request = async payload => {
    if (local) return payload.operation === 'release' ? (local.clear(), { released: true }) : local.match(payload)
    const response = await sendMessage({ type: MESSAGE_TYPES.SEARCH_TEXT, payload })
    if (!response?.ok) throw Object.assign(new Error(response?.error || 'Search worker failed'), { code: 'search-worker-unavailable' })
    return response.data
  }
  return {
    offThread: !local,
    async match(entry, query, options, limit, signal) {
      if (disposed) throw new DOMException('Search cancelled.', 'AbortError')
      used = true
      const payload = { namespace, key: entry.key, query, options, limit }
      let result = await waitForSearch(request({ ...payload, ...(entry.workerKnown ? {} : { source: entry.text }) }), signal)
      if (result.missing) result = await waitForSearch(request({ ...payload, source: entry.text }), signal)
      entry.workerKnown = result.retained === true
      return result
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (!used) return
      void request({ namespace, operation: 'release' }).catch(error => logger.warn('Could not release search worker cache.', { message: String(error?.message || error) }))
    }
  }
}
