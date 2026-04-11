import { attachTooltip } from '../tooltip.js'

/**
 * @param {string} url
 * @returns {string}
 */
export function shortenPath(url) {
  try {
    const u = new URL(url)
    let p = u.pathname
    try {
      p = decodeURIComponent(p)
    } catch {
      /* keep */
    }
    if (p.length > 72) return `…${p.slice(-68)}`
    return p
  } catch {
    return url.length > 72 ? `${url.slice(0, 8)}…` : url
  }
}

/**
 * @param {HTMLElement} pathEl
 * @param {HTMLElement} metaEl
 */
export function createSetSummary(pathEl, metaEl) {
  /**
   * @param {object} options
   * @param {string} [options.directoryLabel]
   * @param {number} options.fileCount
   */
  return function setSummary({ directoryLabel, fileCount }) {
    if (directoryLabel) pathEl.textContent = directoryLabel
    metaEl.textContent = `${fileCount} ${fileCount === 1 ? 'file' : 'files'}`
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
  let n = 0
  for (const c of node.children || []) {
    n += countMarkdownFilesInTree(c)
  }
  return n
}

/**
 * @param {import('./folder-scanner.js').ScanFolderStats} stats
 * @param {number} [maxScanDepth]
 */
export function buildDepthNotice(stats, maxScanDepth) {
  const parts = []
  if (stats.skippedByDepth > 0) {
    parts.push(
      maxScanDepth != null
        ? `Some folders were not scanned (depth limit: ${maxScanDepth}).`
        : 'Some folders were not scanned (depth limit).'
    )
  }
  if (stats.hitFileLimit) parts.push('Scan stopped: file limit reached.')
  if (stats.hitFolderLimit) parts.push('Scan stopped: folder limit reached.')
  return parts.join(' ')
}

/**
 * @param {Array<import('./folder-scanner.js').ExplorerTreeNode>} nodes
 * @returns {Map<string, boolean>}
 */
export function buildInitialExpandedMap(nodes) {
  const m = new Map()
  function walk(list) {
    for (const n of list) {
      if (n.type === 'folder') {
        m.set(n.href, n.depth === 1)
        if (n.children?.length) walk(n.children)
      }
    }
  }
  walk(nodes)
  return m
}

/**
 * @typedef {object} TreeRenderContext
 * @property {(href: string) => void} onPickFile
 * @property {Map<string, boolean>} expandedMap
 * @property {() => void} syncExpanded
 * @property {(destroy: () => void) => void} registerRowTooltip
 */

/**
 * @param {object} opts
 * @param {{ displayName: string, href: string, isActive: boolean }} opts.file
 * @param {number} opts.depth
 * @param {(href: string) => void} opts.onPick
 */
export function createFileRow({ file, depth, onPick }) {
  const li = document.createElement('li')
  li.className = 'mdp-explorer__node mdp-explorer__tree-file'
  li.setAttribute('role', 'treeitem')
  li.setAttribute('aria-level', String(Math.max(1, depth)))

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'mdp-explorer__node-btn'
  if (file.isActive) btn.classList.add('is-active')
  btn.setAttribute('data-file-href', file.href)
  btn.setAttribute('aria-current', file.isActive ? 'true' : 'false')
  btn.setAttribute('title', file.href)
  btn.style.paddingLeft = `${6 + Math.max(0, depth - 1) * 12}px`

  const depthEl = document.createElement('span')
  depthEl.className = 'mdp-explorer__node-depth'
  depthEl.setAttribute('aria-hidden', 'true')

  const iconEl = document.createElement('span')
  iconEl.className = 'mdp-explorer__node-icon'
  iconEl.setAttribute('aria-hidden', 'true')
  iconEl.textContent = '📄'

  const labelEl = document.createElement('span')
  labelEl.className = 'mdp-explorer__node-label'
  labelEl.textContent = file.displayName

  btn.appendChild(depthEl)
  btn.appendChild(iconEl)
  btn.appendChild(labelEl)
  btn.addEventListener('click', () => {
    onPick(file.href)
  })

  li.appendChild(btn)
  return li
}

/**
 * @param {ParentNode} parent
 * @param {import('./folder-scanner.js').ExplorerTreeNode} node
 * @param {TreeRenderContext} treeCtx
 */
export function appendTreeNode(parent, node, treeCtx) {
  if (node.type === 'file') {
    parent.appendChild(
      createFileRow({
        file: { displayName: node.name, href: node.href, isActive: Boolean(node.isActive) },
        depth: node.depth,
        onPick: treeCtx.onPickFile
      })
    )
    return
  }

  const li = document.createElement('li')
  li.className = 'mdp-explorer__tree-folder'
  li.setAttribute('role', 'treeitem')
  li.setAttribute('aria-level', String(Math.max(1, node.depth)))
  li.setAttribute('data-folder-href', node.href)

  const row = document.createElement('button')
  row.type = 'button'
  row.className = 'mdp-explorer__tree-folder-row'
  row.setAttribute('aria-expanded', 'true')

  const chev = document.createElement('span')
  chev.className = 'mdp-explorer__tree-chevron'
  chev.setAttribute('aria-hidden', 'true')

  const icon = document.createElement('span')
  icon.className = 'mdp-explorer__tree-folder-icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.textContent = '📁'

  const label = document.createElement('span')
  label.className = 'mdp-explorer__tree-folder-label'
  label.textContent = node.name

  row.style.paddingLeft = `${6 + Math.max(0, node.depth - 1) * 12}px`
  row.addEventListener('click', () => {
    const href = node.href
    const cur = treeCtx.expandedMap.get(href) === true
    treeCtx.expandedMap.set(href, !cur)
    treeCtx.syncExpanded()
  })

  row.appendChild(chev)
  row.appendChild(icon)
  row.appendChild(label)

  treeCtx.registerRowTooltip(
    attachTooltip(row, {
      text: `Expand or collapse “${node.name}”.`
    }).destroy
  )

  const childUl = document.createElement('ul')
  childUl.className = 'mdp-explorer__tree-children'
  childUl.setAttribute('role', 'group')

  for (const child of node.children || []) {
    appendTreeNode(childUl, child, treeCtx)
  }

  li.appendChild(row)
  li.appendChild(childUl)
  parent.appendChild(li)
}
