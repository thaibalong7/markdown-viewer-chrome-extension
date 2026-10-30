import { vi } from 'vitest'

// Realistic key-based storage semantics; independent areas and cloned values.
export function createStorageArea(initial = {}) {
  const items = structuredClone(initial)
  const area = {
    items,
    get: vi.fn(async keys => keys == null ? structuredClone(items) : Object.fromEntries(
      (Array.isArray(keys) ? keys : [keys]).filter(key => Object.hasOwn(items, key)).map(key => [key, structuredClone(items[key])])
    )),
    set: vi.fn(async values => { Object.assign(items, structuredClone(values)) }),
    remove: vi.fn(async keys => { for (const key of Array.isArray(keys) ? keys : [keys]) delete items[key] }),
    getBytesInUse: vi.fn(async keys => {
      const selected = keys == null ? Object.keys(items) : Array.isArray(keys) ? keys : [keys]
      return selected.reduce((sum, key) => sum + (Object.hasOwn(items, key)
        ? Buffer.byteLength(key) + Buffer.byteLength(JSON.stringify(items[key])) : 0), 0)
    })
  }
  return area
}
