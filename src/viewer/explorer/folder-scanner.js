import { logger } from '../../shared/logger.js'
import {
  collectEntriesFromChromeAddRow,
  fetchDirectoryListingHtml,
  fetchFileAsText,
  isMarkdownFileHref,
  normalizeDirectoryUrl,
  normalizeFileUrlForCompare,
  posixPathRelativeToFileRoot
} from './sibling-scanner.js'
import { createGitignoreMatcher, pruneExplorerFoldersWithoutMarkdown } from './gitignore-matcher.js'

/**
 * @typedef {object} ExplorerTreeNode
 * @property {string} name
 * @property {string} href
 * @property {'folder' | 'file'} type
 * @property {number} depth
 * @property {boolean} [isActive]
 * @property {ExplorerTreeNode[]} [children]
 */

/**
 * @typedef {object} ScanFolderStats
 * @property {number} scannedFiles
 * @property {number} scannedFolders
 * @property {number} skippedByDepth
 * @property {boolean} hitFileLimit
 * @property {boolean} hitFolderLimit
 */

/**
 * @param {string} dirUrl
 * @returns {string}
 */
function folderDisplayNameFromUrl(dirUrl) {
  try {
    const u = new URL(dirUrl)
    let p = u.pathname.replace(/\/+$/, '')
    const seg = p.split('/').filter(Boolean).pop() || ''
    try {
      return decodeURIComponent(seg) || '/'
    } catch {
      return seg || '/'
    }
  } catch {
    return 'Folder'
  }
}

/**
 * @param {string} fileHref
 * @returns {string}
 */
function fileDisplayNameFromHref(fileHref) {
  try {
    const p = new URL(fileHref).pathname
    const base = p.split('/').filter(Boolean).pop() || ''
    try {
      return decodeURIComponent(base)
    } catch {
      return base
    }
  } catch {
    return 'File'
  }
}

/**
 * @param {string} [listingName]
 * @param {string} fallbackDirUrl
 * @returns {string}
 */
function folderNameFromEntry(listingName, fallbackDirUrl) {
  if (listingName) {
    try {
      return decodeURIComponent(listingName)
    } catch {
      return listingName
    }
  }
  return folderDisplayNameFromUrl(fallbackDirUrl)
}

/**
 * @param {Array<{ name: string, href: string, isDir: boolean }>} entries
 * @returns {Array<{ name: string, href: string, isDir: boolean }>}
 */
function sortListingEntries(entries) {
  const dirs = entries.filter((e) => e.isDir)
  const files = entries.filter((e) => !e.isDir)
  const cmp = (a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  dirs.sort(cmp)
  files.sort(cmp)
  return [...dirs, ...files]
}

/**
 * Recursively scan a file:// directory tree via Chrome listing HTML; only markdown files are leaf nodes.
 * @param {string} rootDirUrl - file: directory URL (with or without trailing slash)
 * @param {object} options
 * @param {number} [options.maxScanDepth]
 * @param {number} [options.maxFiles]
 * @param {number} [options.maxFolders]
 * @param {(p: ScanFolderStats & { currentFolder?: string }) => void} [options.onProgress]
 * @param {AbortSignal} [options.signal]
 * @param {string} [options.currentFileUrl] - marks active file in tree
 * @param {boolean} [options.siblingsFirstAtRoot] - at depth 0, list markdown files before recursing into subfolders
 * @param {boolean} [options.respectGitignore] - load nested `.gitignore` and skip ignored paths (default true)
 * @returns {Promise<{ tree: ExplorerTreeNode, stats: ScanFolderStats, currentFileInTree: boolean }>}
 */
export async function scanFolderRecursive(rootDirUrl, options = {}) {
  const {
    maxScanDepth = 3,
    maxFiles = 2000,
    maxFolders = 500,
    onProgress,
    signal,
    currentFileUrl,
    siblingsFirstAtRoot = false,
    respectGitignore = true
  } = options

  const normalizedRoot = normalizeDirectoryUrl(rootDirUrl)
  const gitignore = respectGitignore ? createGitignoreMatcher() : null

  /**
   * @param {string} dirUrl
   */
  async function loadGitignoreForDirectory(dirUrl) {
    if (!gitignore) return
    try {
      const giHref = new URL('.gitignore', dirUrl).href
      const text = await fetchFileAsText(giHref)
      if (!text.trim()) return
      const dirRel = posixPathRelativeToFileRoot(normalizedRoot, dirUrl)
      gitignore.addSection(dirRel, text)
    } catch (e) {
      logger.debug('loadGitignoreForDirectory skipped', e)
    }
  }

  /** @type {ScanFolderStats} */
  const stats = {
    scannedFiles: 0,
    scannedFolders: 0,
    skippedByDepth: 0,
    hitFileLimit: false,
    hitFolderLimit: false
  }

  const normalizedActive = currentFileUrl
    ? normalizeFileUrlForCompare(currentFileUrl)
    : ''

  function emitProgress(currentFolder) {
    try {
      onProgress?.({ ...stats, currentFolder })
    } catch (e) {
      logger.debug('scanFolderRecursive onProgress error', e)
    }
  }

  function checkAborted() {
    if (signal?.aborted) {
      const err = new Error('Scan cancelled')
      err.name = 'AbortError'
      throw err
    }
  }

  /**
   * @param {string} dirUrl
   * @param {number} depthFromRoot
   * @returns {Promise<ExplorerTreeNode>}
   */
  async function buildTree(dirUrl, depthFromRoot) {
    checkAborted()

    if (stats.scannedFolders >= maxFolders) {
      stats.hitFolderLimit = true
      emitProgress(dirUrl)
      return {
        type: 'folder',
        name: folderDisplayNameFromUrl(dirUrl),
        href: dirUrl,
        depth: depthFromRoot,
        children: []
      }
    }

    stats.scannedFolders++
    emitProgress(dirUrl)

    await loadGitignoreForDirectory(dirUrl)

    const html = await fetchDirectoryListingHtml(dirUrl)
    const rawEntries = collectEntriesFromChromeAddRow(html, dirUrl)
    const sorted = sortListingEntries(rawEntries)
    const dirs = sorted.filter((e) => e.isDir)
    const mdFiles = sorted.filter((e) => !e.isDir && isMarkdownFileHref(e.href))
    const otherFiles = sorted.filter((e) => !e.isDir && !isMarkdownFileHref(e.href))

    /** @type {typeof sorted} */
    let ordered = sorted
    if (siblingsFirstAtRoot && depthFromRoot === 0) {
      ordered = [...mdFiles, ...dirs, ...otherFiles]
    }

    /** @type {ExplorerTreeNode[]} */
    const children = []

    /**
     * @param {typeof sorted[0]} entry
     */
    async function handleDirEntry(entry) {
      const nextDepth = depthFromRoot + 1
      if (nextDepth > maxScanDepth) {
        stats.skippedByDepth++
        return
      }
      if (stats.hitFolderLimit) return

      const rel = posixPathRelativeToFileRoot(normalizedRoot, entry.href)
      if (gitignore?.shouldIgnore(rel, true)) return

      const subTree = await buildTree(entry.href, nextDepth)
      subTree.name = folderNameFromEntry(entry.name, entry.href)
      if (pruneExplorerFoldersWithoutMarkdown(subTree)) {
        children.push(subTree)
      }
    }

    /**
     * @param {typeof sorted[0]} entry
     */
    function pushMarkdownFile(entry) {
      const rel = posixPathRelativeToFileRoot(normalizedRoot, entry.href)
      if (gitignore?.shouldIgnore(rel, false)) return true

      if (stats.scannedFiles >= maxFiles) {
        stats.hitFileLimit = true
        emitProgress(dirUrl)
        return false
      }

      stats.scannedFiles++
      const href = entry.href
      const isActive =
        Boolean(normalizedActive) &&
        normalizeFileUrlForCompare(href) === normalizedActive

      children.push({
        type: 'file',
        name: fileDisplayNameFromHref(href),
        href,
        depth: depthFromRoot + 1,
        isActive
      })
      emitProgress(dirUrl)
      return true
    }

    for (const entry of ordered) {
      checkAborted()

      if (entry.isDir) {
        if (stats.hitFileLimit) break
        await handleDirEntry(entry)
        if (stats.hitFolderLimit) break
        continue
      }

      if (!isMarkdownFileHref(entry.href)) continue

      if (!pushMarkdownFile(entry)) break
    }

    return {
      type: 'folder',
      name: folderDisplayNameFromUrl(dirUrl),
      href: dirUrl,
      depth: depthFromRoot,
      children
    }
  }

  const tree = await buildTree(normalizedRoot, 0)
  tree.name = folderDisplayNameFromUrl(normalizedRoot)
  pruneExplorerFoldersWithoutMarkdown(tree, true)
  emitProgress(normalizedRoot)

  const currentFileInTree = Boolean(
    normalizedActive && treeContainsNormalizedFile(tree, normalizedActive)
  )

  return { tree, stats, currentFileInTree }
}

/**
 * @param {ExplorerTreeNode} node
 * @param {string} normalizedHref
 * @returns {boolean}
 */
function treeContainsNormalizedFile(node, normalizedHref) {
  if (node.type === 'file') {
    return normalizeFileUrlForCompare(node.href) === normalizedHref
  }
  for (const c of node.children || []) {
    if (treeContainsNormalizedFile(c, normalizedHref)) return true
  }
  return false
}
