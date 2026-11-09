import { createSearchTextStore } from './search-text-store.js'

const store = createSearchTextStore()
const released = new Set()
self.onmessage = ({ data }) => {
  const { id, payload } = data
  try {
    if (payload.operation === 'release') {
      store.release(`${payload.namespace}:`)
      released.add(payload.namespace)
      if (released.size > 256) released.delete(released.values().next().value)
      self.postMessage({ id, result: { released: true } }); return
    }
    if (released.has(payload.namespace)) { self.postMessage({ id, result: { missing: true, cancelled: true } }); return }
    self.postMessage({ id, result: store.match(payload) })
  } catch (error) {
    self.postMessage({ id, error: String(error?.message || error) })
  }
}
