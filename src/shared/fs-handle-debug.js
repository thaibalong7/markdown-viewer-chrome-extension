/**
 * Safe snapshot for logging FileSystemHandle / directory picker results (no getters invoked).
 * @param {unknown} h
 * @returns {Record<string, unknown>}
 */
export function describeFileSystemHandleForLog(h) {
  if (h == null || typeof h !== 'object') {
    return { present: false, typeof: typeof h }
  }
  const o = /** @type {Record<string | symbol, unknown>} */ (h)
  const proto = Object.getPrototypeOf(h)
  return {
    present: true,
    ctor: /** @type {{ name?: string }} */ (h.constructor)?.name,
    kind: o.kind,
    name: o.name,
    ownEntries: typeof o.entries === 'function',
    protoEntries: typeof proto?.entries === 'function',
    ownKeys: typeof o.keys === 'function',
    protoKeys: typeof proto?.keys === 'function',
    asyncIterator: typeof o[Symbol.asyncIterator] === 'function'
  }
}
