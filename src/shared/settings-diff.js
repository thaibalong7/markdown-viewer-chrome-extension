function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * @param {unknown} previous
 * @param {unknown} next
 * @param {string} [basePath]
 * @param {Set<string>} [out]
 * @returns {Set<string>}
 */
export function collectChangedPaths(previous, next, basePath = '', out = new Set()) {
  if (previous === next) return out

  const prevObj = isObject(previous)
  const nextObj = isObject(next)

  if (!prevObj || !nextObj) {
    if (basePath) out.add(basePath)
    return out
  }

  const keys = new Set([...Object.keys(previous), ...Object.keys(next)])
  for (const key of keys) {
    const nextPath = basePath ? `${basePath}.${key}` : key
    collectChangedPaths(previous[key], next[key], nextPath, out)
  }
  return out
}

/**
 * @param {object} previousSettings
 * @param {object} nextSettings
 * @returns {boolean} true when a full markdown re-render is required
 */
export function needsFullRender(previousSettings, nextSettings) {
  const changedPaths = collectChangedPaths(previousSettings, nextSettings)
  if (!changedPaths.size) return false

  const styleOnlyPrefixes = [
    'typography.',
    'layout.contentMaxWidth',
    'layout.showToc',
    'layout.tocWidth'
  ]

  for (const path of changedPaths) {
    const isStyleOnly = styleOnlyPrefixes.some(
      (prefix) => path === prefix || path.startsWith(prefix)
    )
    if (!isStyleOnly) return true
  }

  return false
}
