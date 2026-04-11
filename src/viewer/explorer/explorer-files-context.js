import {
  MDP_WS_FILE,
  fileUrlIsUnderDirectoryUrl,
  isMarkdownFileHref,
  normalizeFileUrlForCompare
} from './url-utils.js'

/**
 * @typedef {'folder' | 'workspace'} ExplorerModeBadgeId
 */

/**
 * @typedef {object} ExplorerFilesContext
 * @property {ExplorerModeBadgeId} modeBadge
 * @property {string} currentLine - e.g. "Reading: README.md" or "No file selected"
 * @property {string} statusLine - workspace / folder status (short)
 * @property {string} [warningLine] - e.g. current file not listed in workspace tree
 */

/**
 * @param {import('./folder-scanner.js').ExplorerTreeNode | null | undefined} tree
 * @param {string} href
 * @returns {boolean}
 */
export function explorerTreeContainsFileHref(tree, href) {
  if (!tree || !href) return false
  const target = normalizeFileUrlForCompare(href)
  /**
   * @param {import('./folder-scanner.js').ExplorerTreeNode} node
   * @returns {boolean}
   */
  function walk(node) {
    if (node.type === 'file') {
      return normalizeFileUrlForCompare(node.href) === target
    }
    for (const c of node.children || []) {
      if (walk(c)) return true
    }
    return false
  }
  return walk(tree)
}

/**
 * @param {import('./folder-scanner.js').ExplorerTreeNode} node
 */
function clearActiveFlagsInExplorerTree(node) {
  if (!node) return
  if (node.type === 'file') {
    node.isActive = false
    return
  }
  for (const c of node.children || []) {
    clearActiveFlagsInExplorerTree(c)
  }
}

/**
 * When scan limits prevented listing the open file, prepend it at the tree root.
 * @param {import('./folder-scanner.js').ExplorerTreeNode} tree
 * @param {string} currentFileUrl
 * @param {import('./folder-scanner.js').ScanFolderStats | null | undefined} stats
 * @param {string} [scanRootDirUrl] - file: workspace / sibling scan root; required for file: URLs so unrelated files are never injected
 * @returns {{ injected: boolean }}
 */
export function injectCurrentMarkdownAtRootIfMissing(tree, currentFileUrl, stats, scanRootDirUrl) {
  if (!tree || tree.type !== 'folder' || !currentFileUrl) return { injected: false }
  if (!isMarkdownFileHref(currentFileUrl)) return { injected: false }
  if (explorerTreeContainsFileHref(tree, currentFileUrl)) return { injected: false }
  if (typeof currentFileUrl === 'string' && currentFileUrl.startsWith('file:')) {
    if (typeof scanRootDirUrl !== 'string' || !scanRootDirUrl.startsWith('file:')) {
      return { injected: false }
    }
    if (!fileUrlIsUnderDirectoryUrl(currentFileUrl, scanRootDirUrl)) {
      return { injected: false }
    }
  }
  const limitsHit = Boolean(
    stats &&
    (stats.hitFileLimit || stats.hitFolderLimit || stats.skippedByDepth > 0)
  )
  if (!limitsHit) return { injected: false }

  clearActiveFlagsInExplorerTree(tree)
  let displayName = 'document'
  try {
    const p = new URL(currentFileUrl).pathname
    const base = p.split('/').filter(Boolean).pop() || ''
    try {
      displayName = decodeURIComponent(base) || displayName
    } catch {
      displayName = base || displayName
    }
  } catch {
    /* keep */
  }

  const rootDepth = typeof tree.depth === 'number' ? tree.depth : 0
  const fileDepth = rootDepth + 1
  const prior = tree.children || []
  tree.children = [
    {
      type: 'file',
      name: displayName,
      href: currentFileUrl,
      depth: fileDepth,
      isActive: true
    },
    ...prior
  ]
  return { injected: true }
}

/**
 * Short label for the open document (for Files context strip).
 * @param {string} [fileUrl]
 * @returns {string}
 */
function currentFileLineLabel(fileUrl) {
  if (!fileUrl) return 'No file selected'
  if (typeof fileUrl === 'string' && fileUrl.startsWith(MDP_WS_FILE)) {
    try {
      const rel = decodeURIComponent(fileUrl.slice(MDP_WS_FILE.length))
      const base = rel.split('/').pop() || ''
      return base ? `Reading: ${base}` : 'Reading: document'
    } catch {
      return 'Reading: document'
    }
  }
  try {
    const p = new URL(fileUrl).pathname
    const base = p.split('/').filter(Boolean).pop() || ''
    const decoded = (() => {
      try {
        return decodeURIComponent(base)
      } catch {
        return base
      }
    })()
    return decoded ? `Reading: ${decoded}` : 'Reading: document'
  } catch {
    return 'Reading: document'
  }
}

/**
 * @param {object} p
 * @param {'sibling' | 'workspace'} p.explorerMode
 * @param {string} p.currentFileUrl
 * @param {import('./folder-scanner.js').ExplorerTreeNode | null} p.workspaceTree
 * @param {import('./folder-scanner.js').ExplorerTreeNode | null} [p.siblingTree]
 * @param {string | null} [p.workspaceRootUrl]
 * @param {string} [p.workspaceDisplayLabel] - folder name or decoded path
 * @param {string} [p.siblingFolderLabel] - decoded parent path for deep sibling mode
 * @param {'idle' | 'scanning'} [p.scanPhase]
 * @returns {ExplorerFilesContext}
 */
export function buildExplorerFilesContext({
  explorerMode,
  currentFileUrl,
  workspaceTree,
  siblingTree,
  workspaceRootUrl,
  workspaceDisplayLabel,
  siblingFolderLabel,
  scanPhase = 'idle'
} = {}) {
  /** @type {ExplorerModeBadgeId} */
  const modeBadge = explorerMode === 'workspace' ? 'workspace' : 'folder'

  const currentLine = currentFileLineLabel(currentFileUrl)

  let statusLine = 'Not in workspace'
  if (explorerMode === 'workspace') {
    const rootHint = workspaceDisplayLabel || workspaceRootUrl || 'Workspace'
    if (scanPhase === 'scanning') {
      statusLine = `Scanning… · ${rootHint}`
    } else {
      statusLine = `Inside workspace · ${rootHint}`
    }
  } else if (scanPhase === 'scanning') {
    const hint = siblingFolderLabel?.trim() || ''
    statusLine = hint ? `Scanning folder tree… · ${hint}` : 'Scanning folder tree…'
  } else {
    const hint = siblingFolderLabel?.trim() || ''
    statusLine = hint
      ? `Folder tree (this file’s directory) · ${hint}`
      : 'Folder tree (this file’s directory)'
  }

  /** @type {string | undefined} */
  let warningLine
  const treeForOpenFile =
    explorerMode === 'workspace' ? workspaceTree : siblingTree ?? null
  if (
    treeForOpenFile &&
    currentFileUrl &&
    !explorerTreeContainsFileHref(treeForOpenFile, currentFileUrl)
  ) {
    warningLine =
      explorerMode === 'workspace'
        ? 'The open file is not under this workspace tree. Pick a file from the list or exit workspace.'
        : 'The open file is not listed in the scanned tree (limits or listing). It was added at the top so you can still navigate.'
  }

  return {
    modeBadge,
    currentLine,
    statusLine,
    ...(warningLine ? { warningLine } : {})
  }
}

/**
 * Badge visible text for {@link ExplorerModeBadgeId}.
 * @param {ExplorerModeBadgeId} id
 * @returns {string}
 */
export function explorerModeBadgeLabel(id) {
  if (id === 'workspace') return 'Workspace'
  return 'Folder'
}
