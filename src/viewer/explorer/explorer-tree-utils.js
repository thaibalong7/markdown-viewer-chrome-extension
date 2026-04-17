/**
 * @param {string} url
 * @returns {string}
 */
export function shortenPath(url) {
  try {
    const parsed = new URL(url)
    let pathname = parsed.pathname
    try {
      pathname = decodeURIComponent(pathname)
    } catch {
      /* keep encoded value */
    }
    if (pathname.length > 72) return `…${pathname.slice(-68)}`
    return pathname
  } catch {
    return typeof url === 'string' && url.length > 72 ? `${url.slice(0, 8)}…` : String(url || '')
  }
}

/**
 * @param {string | undefined} fileUrl
 * @returns {string}
 */
export function getDirectoryLabelFromUrl(fileUrl) {
  if (!fileUrl) return 'Current folder'
  try {
    const parsed = new URL(fileUrl)
    if (parsed.protocol !== 'file:') return 'Current folder'
    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments.length <= 1) return '/'
    const folderPath = segments.slice(0, -1).join('/')
    return `/${decodeURIComponent(folderPath)}`
  } catch {
    return 'Current folder'
  }
}

/**
 * @param {import('./folder-scanner.js').ExplorerTreeNode} node
 * @returns {number}
 */
export function countMarkdownFilesInTree(node) {
  if (node.type === 'file') return 1
  let count = 0
  for (const child of node.children || []) {
    count += countMarkdownFilesInTree(child)
  }
  return count
}

/**
 * @param {import('./folder-scanner.js').ScanFolderStats} stats
 * @param {number} [maxScanDepth]
 * @returns {string}
 */
export function buildDepthNotice(stats, maxScanDepth) {
  const parts = []
  if (stats?.skippedByDepth > 0) {
    parts.push(
      maxScanDepth != null
        ? `Some folders were not scanned (depth limit: ${maxScanDepth}).`
        : 'Some folders were not scanned (depth limit).'
    )
  }
  if (stats?.hitFileLimit) parts.push('Scan stopped: file limit reached.')
  if (stats?.hitFolderLimit) parts.push('Scan stopped: folder limit reached.')
  return parts.join(' ')
}

/**
 * @param {Array<import('./folder-scanner.js').ExplorerTreeNode>} nodes
 * @returns {Map<string, boolean>}
 */
export function buildInitialExpandedMap(nodes) {
  const expandedMap = new Map()
  const walk = (list) => {
    for (const node of list) {
      if (node.type !== 'folder') continue
      expandedMap.set(node.href, node.depth === 1)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(Array.isArray(nodes) ? nodes : [])
  return expandedMap
}
