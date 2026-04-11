import { describeFileSystemHandleForLog } from '../../shared/fs-handle-debug.js'
import { logger } from '../../shared/logger.js'
import { createGitignoreMatcher, pruneExplorerFoldersWithoutMarkdown } from './gitignore-matcher.js'
import { MDP_WS_DIR, MDP_WS_FILE, pathInputToFileDirectoryUrl } from './sibling-scanner.js'

/** @typedef {import('./folder-scanner.js').ExplorerTreeNode} ExplorerTreeNode */
/** @typedef {import('./folder-scanner.js').ScanFolderStats} ScanFolderStats */

/**
 * @param {string} relativePath - posix path from workspace root (incl. root folder name / first segment)
 * @returns {string}
 */
function workspaceVirtualFileHref(relativePath) {
  return `${MDP_WS_FILE}${encodeURIComponent(relativePath)}`
}

/**
 * @param {string} folderRelPrefix - posix path ending with / (e.g. "MyProj/docs/")
 * @returns {string}
 */
function workspaceVirtualDirHref(folderRelPrefix) {
  return `${MDP_WS_DIR}${encodeURIComponent(folderRelPrefix)}`
}

/**
 * @param {File[]} files
 * @returns {string | null} file: directory URL
 */
export function tryFileDirectoryUrlFromWebkitFiles(files) {
  if (!files?.length) return null
  for (const file of files) {
    const p = file?.path
    if (typeof p !== 'string' || !p.trim()) continue
    const dirUrl = absoluteRootDirUrlFromWebkitFile(file)
    if (dirUrl) return dirUrl
  }
  return null
}

/**
 * @param {File} file
 * @returns {string | null}
 */
function absoluteRootDirUrlFromWebkitFile(file) {
  const rel = String(file.webkitRelativePath || '').replace(/\\/g, '/')
  const abs = String(file.path || '').replace(/\\/g, '/')
  if (!rel || !abs) return null
  const idx = abs.lastIndexOf(rel)
  if (idx < 0) return null
  const first = rel.split('/')[0]
  if (!first) return null
  const rootPath = abs.slice(0, idx + first.length)
  return pathInputToFileDirectoryUrl(rootPath)
}

/**
 * @returns {Promise<File[] | null>}
 */
export function pickFilesWithWebkitDirectory() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.multiple = true
    input.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none'

    const done = (/** @type {File[] | null} */ v) => {
      input.removeEventListener('change', onChange)
      input.removeEventListener('cancel', onCancel)
      input.remove()
      resolve(v)
    }

    const onChange = () => {
      const list = Array.from(input.files || [])
      done(list.length ? list : null)
    }

    const onCancel = () => {
      done(null)
    }

    input.addEventListener('change', onChange, { once: true })
    input.addEventListener('cancel', onCancel, { once: true })
    document.documentElement.appendChild(input)
    input.click()
  })
}

function scanCancelledError() {
  const err = new Error('Scan cancelled')
  err.name = 'AbortError'
  return err
}

/**
 * @param {{ next: () => Promise<{ done: boolean, value?: [string, FileSystemDirectoryHandle | FileSystemFileHandle] }> }} iterator
 * @param {AbortSignal | undefined} signal
 * @returns {Promise<{ done: boolean, value?: [string, FileSystemDirectoryHandle | FileSystemFileHandle] }>}
 */
function directoryIteratorNextOrAbort(iterator, signal) {
  if (!signal) return Promise.resolve(iterator.next())
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      fn()
    }
    const onAbort = () => {
      finish(() => reject(scanCancelledError()))
    }
    if (signal.aborted) {
      finish(() => reject(scanCancelledError()))
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })
    Promise.resolve(iterator.next()).then(
      (step) => finish(() => resolve(step)),
      (err) => finish(() => reject(err))
    )
  })
}

/**
 * Iterator for `dir.entries()` (async-iterable or `.next`-shaped) for directory listing.
 *
 * @param {FileSystemDirectoryHandle} dir
 * @returns {{ next: () => ReturnType<AsyncIterator<unknown>['next']> }}
 */
function getDirectoryEntriesAsyncIterator(dir) {
  const iterable = /** @type {AsyncIterable<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>} */ (
    dir.entries()
  )
  if (iterable && typeof iterable[Symbol.asyncIterator] === 'function') {
    return iterable[Symbol.asyncIterator]()
  }
  if (iterable && typeof iterable.next === 'function') {
    return /** @type {{ next: typeof iterable.next }} */ (iterable)
  }
  throw new TypeError('dir.entries() is not async-iterable')
}

async function* iterateDirectoryEntries(dir, signal) {
  if (!dir || typeof dir !== 'object' || dir.kind === 'file') {
    throw new TypeError('Not a directory handle')
  }
  const iterator = getDirectoryEntriesAsyncIterator(dir)
  while (true) {
    const step = await directoryIteratorNextOrAbort(iterator, signal)
    if (step.done) break
    if (step.value) yield step.value
  }
}

/**
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {object} options
 * @param {number} [options.maxScanDepth]
 * @param {number} [options.maxFiles]
 * @param {number} [options.maxFolders]
 * @param {AbortSignal} [options.signal]
 * @param {string} [options.currentFileUrl]
 * @param {(p: ScanFolderStats & { currentFolder?: string }) => void} [options.onProgress]
 * @param {boolean} [options.respectGitignore]
 * @returns {Promise<{ tree: ExplorerTreeNode, stats: ScanFolderStats, readers: Map<string, FileSystemFileHandle> }>}
 */
export async function scanWorkspaceFromDirectoryHandle(rootHandle, options = {}) {
  const {
    maxScanDepth = 3,
    maxFiles = 2000,
    maxFolders = 500,
    signal,
    currentFileUrl,
    onProgress,
    respectGitignore = true
  } = options

  const gitignore = respectGitignore ? createGitignoreMatcher() : null

  /** @type {ScanFolderStats} */
  const stats = {
    scannedFiles: 0,
    scannedFolders: 0,
    skippedByDepth: 0,
    hitFileLimit: false,
    hitFolderLimit: false
  }

  /** @type {Map<string, FileSystemFileHandle>} */
  const readers = new Map()

  if (!rootHandle || typeof rootHandle !== 'object') {
    throw new TypeError('Missing directory handle')
  }
  // After IDB / structured clone, `kind` can be missing on a valid FileSystemDirectoryHandle.
  if (rootHandle.kind === 'file') {
    throw new TypeError('Expected a directory handle, got a file handle')
  }

  logger.debug(
    '[workspace-picker] scanWorkspaceFromDirectoryHandle root',
    describeFileSystemHandleForLog(rootHandle)
  )

  function emitProgress(currentFolder) {
    try {
      onProgress?.({ ...stats, currentFolder })
    } catch {
      /* ignore */
    }
  }

  function checkAborted() {
    if (signal?.aborted) {
      const err = new Error('Scan cancelled')
      err.name = 'AbortError'
      throw err
    }
  }

  const rootName = rootHandle.name || 'Folder'

  /**
   * @param {string} relFromRoot - path under picked folder using / (no leading slash), e.g. "docs/a.md"
   */
  function fullRel(...parts) {
    return [rootName, ...parts].join('/')
  }

  /**
   * @param {FileSystemDirectoryHandle} dir
   * @param {string[]} relParts - path segments under rootName (empty = at workspace root)
   * @param {number} depthFromRoot
   * @returns {Promise<ExplorerTreeNode>}
   */
  async function walk(dir, relParts, depthFromRoot) {
    checkAborted()

    if (stats.scannedFolders >= maxFolders) {
      stats.hitFolderLimit = true
      const prefix = relParts.length ? `${rootName}/${relParts.join('/')}/` : `${rootName}/`
      emitProgress(workspaceVirtualDirHref(prefix))
      return {
        type: 'folder',
        name: relParts.length ? relParts[relParts.length - 1] : rootName,
        href: workspaceVirtualDirHref(prefix),
        depth: depthFromRoot,
        children: []
      }
    }

    stats.scannedFolders += 1
    const dirPrefix = relParts.length ? `${rootName}/${relParts.join('/')}/` : `${rootName}/`
    emitProgress(workspaceVirtualDirHref(dirPrefix))

    if (gitignore) {
      try {
        const giHandle = await /** @type {FileSystemDirectoryHandle} */ (dir).getFileHandle('.gitignore')
        const giFile = await giHandle.getFile()
        const text = await giFile.text()
        if (text.trim()) {
          const dirRel = relParts.length ? `${rootName}/${relParts.join('/')}` : rootName
          gitignore.addSection(dirRel, text)
        }
      } catch {
        /* no .gitignore */
      }
    }

    /** @type {Array<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>} */
    const entries = []
    for await (const pair of iterateDirectoryEntries(/** @type {FileSystemDirectoryHandle} */ (dir), signal)) {
      entries.push(pair)
    }
    entries.sort((a, b) =>
      a[0].localeCompare(b[0], undefined, {
        sensitivity: 'base'
      })
    )

    /** @type {ExplorerTreeNode[]} */
    const children = []

    for (const [name, handle] of entries) {
      checkAborted()
      if (name.startsWith('.')) continue

      const treatAsDirectory =
        handle.kind === 'directory' ||
        (handle.kind !== 'file' &&
          typeof /** @type {{ getDirectoryHandle?: unknown }} */ (handle).getDirectoryHandle === 'function')

      const entryRel =
        relParts.length > 0 ? `${rootName}/${relParts.join('/')}/${name}` : `${rootName}/${name}`

      if (treatAsDirectory) {
        if (gitignore?.shouldIgnore(entryRel, true)) continue

        const nextDepth = depthFromRoot + 1
        if (nextDepth > maxScanDepth) {
          stats.skippedByDepth++
          continue
        }
        if (stats.hitFolderLimit) break

        const sub = await walk(/** @type {FileSystemDirectoryHandle} */ (handle), [...relParts, name], nextDepth)
        sub.name = name
        if (pruneExplorerFoldersWithoutMarkdown(sub, false)) {
          children.push(sub)
        }
        if (stats.hitFolderLimit) break
        continue
      }

      if (
        handle.kind !== 'file' &&
        typeof /** @type {{ getFile?: unknown }} */ (handle).getFile !== 'function'
      ) {
        continue
      }
      if (!/\.(md|markdown|mdown)$/i.test(name)) continue

      if (gitignore?.shouldIgnore(entryRel, false)) continue

      if (stats.scannedFiles >= maxFiles) {
        stats.hitFileLimit = true
        emitProgress(workspaceVirtualDirHref(dirPrefix))
        break
      }

      const href = workspaceVirtualFileHref(fullRel(...relParts, name))
      readers.set(href, /** @type {FileSystemFileHandle} */ (handle))
      stats.scannedFiles++

      children.push({
        type: 'file',
        name,
        href,
        depth: depthFromRoot + 1,
        isActive: false
      })
      emitProgress(workspaceVirtualDirHref(dirPrefix))
    }

    return {
      type: 'folder',
      name: relParts.length ? relParts[relParts.length - 1] : rootName,
      href: workspaceVirtualDirHref(dirPrefix),
      depth: depthFromRoot,
      children
    }
  }

  const tree = await walk(rootHandle, [], 0)
  tree.name = rootName
  pruneExplorerFoldersWithoutMarkdown(tree, true)
  emitProgress(workspaceVirtualDirHref(`${rootName}/`))
  return { tree, stats, readers }
}

/**
 * @param {File[]} files
 * @param {object} options
 * @param {number} [options.maxScanDepth]
 * @param {number} [options.maxFiles]
 * @param {number} [options.maxFolders]
 * @param {AbortSignal} [options.signal]
 * @param {(p: ScanFolderStats & { currentFolder?: string }) => void} [options.onProgress]
 * @param {boolean} [options.respectGitignore]
 * @returns {Promise<{ tree: ExplorerTreeNode, stats: ScanFolderStats, readers: Map<string, File> }>}
 */
export async function scanWorkspaceFromWebkitFileList(files, options = {}) {
  const {
    maxScanDepth = 3,
    maxFiles = 2000,
    maxFolders = 500,
    signal,
    onProgress,
    respectGitignore = true
  } = options

  const gitignore = respectGitignore ? createGitignoreMatcher() : null

  /** @type {ScanFolderStats} */
  const stats = {
    scannedFiles: 0,
    scannedFolders: 0,
    skippedByDepth: 0,
    hitFileLimit: false,
    hitFolderLimit: false
  }

  /** @type {Map<string, File>} */
  const readers = new Map()

  function emitProgress(currentFolder) {
    try {
      onProgress?.({ ...stats, currentFolder })
    } catch {
      /* ignore */
    }
  }

  function checkAborted() {
    if (signal?.aborted) {
      const err = new Error('Scan cancelled')
      err.name = 'AbortError'
      throw err
    }
  }

  if (gitignore) {
    for (const f of files) {
      if (!f || f.name !== '.gitignore') continue
      const rel = String(f.webkitRelativePath || '').replace(/\\/g, '/')
      const parts = rel.split('/').filter(Boolean)
      if (parts.length < 2) continue
      try {
        const dirRel = parts.slice(0, -1).join('/')
        const text = await f.text()
        if (text.trim()) gitignore.addSection(dirRel, text)
      } catch {
        /* ignore */
      }
    }
  }

  const mdFiles = files.filter((f) => /\.(md|markdown|mdown)$/i.test(f.name))
  mdFiles.sort((a, b) =>
    String(a.webkitRelativePath || '').localeCompare(String(b.webkitRelativePath || ''), undefined, {
      sensitivity: 'base'
    })
  )

  if (!mdFiles.length) {
    const rootName = 'Folder'
    return {
      tree: {
        type: 'folder',
        name: rootName,
        href: workspaceVirtualDirHref(`${rootName}/`),
        depth: 0,
        children: []
      },
      stats,
      readers
    }
  }

  const rootName = String(mdFiles[0].webkitRelativePath || '').split('/')[0] || 'Folder'

  /** @type {Map<string, ExplorerTreeNode>} */
  const folders = new Map()

  /**
   * @param {string[]} segs - e.g. ['MyProj'] or ['MyProj','docs']
   * @returns {ExplorerTreeNode | null}
   */
  function ensureFolder(segs) {
    const key = `${segs.join('/')}/`
    const existing = folders.get(key)
    if (existing) return existing

    if (segs.length > 1 && folders.size - 1 >= maxFolders) {
      stats.hitFolderLimit = true
      return null
    }

    const name = segs[segs.length - 1]
    const depth = segs.length - 1
    const node = {
      type: /** @type {'folder'} */ ('folder'),
      name,
      href: workspaceVirtualDirHref(key),
      depth,
      children: /** @type {ExplorerTreeNode[]} */ ([])
    }
    folders.set(key, node)

    if (segs.length === 1) {
      return node
    }

    const parent = ensureFolder(segs.slice(0, -1))
    if (!parent) return null
    if (!parent.children.some((c) => c.type === 'folder' && c.href === node.href)) {
      parent.children.push(node)
    }
    return node
  }

  const root = /** @type {ExplorerTreeNode} */ (ensureFolder([rootName]))
  root.depth = 0

  for (const file of mdFiles) {
    checkAborted()

    const rel = String(file.webkitRelativePath || '').replace(/\\/g, '/')
    const parts = rel.split('/').filter(Boolean)
    if (parts.length < 2 || parts[0] !== rootName) continue

    if (gitignore?.shouldIgnore(rel, false)) continue

    const folderDepthBelowRoot = parts.length - 2
    if (folderDepthBelowRoot > maxScanDepth) {
      stats.skippedByDepth++
      continue
    }

    if (stats.scannedFiles >= maxFiles) {
      stats.hitFileLimit = true
      break
    }

    if (stats.hitFolderLimit) break

    const dirSegs = parts.slice(0, -1)
    const parent = ensureFolder(dirSegs)
    if (!parent) break

    const href = workspaceVirtualFileHref(rel)
    readers.set(href, file)
    stats.scannedFiles++

    const fname = parts[parts.length - 1] || ''
    parent.children.push({
      type: 'file',
      name: fname,
      href,
      depth: parts.length - 1,
      isActive: false
    })
    emitProgress(workspaceVirtualDirHref(`${dirSegs.join('/')}/`))
  }

  function sortTree(node) {
    if (!node.children?.length) return
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
    for (const c of node.children) {
      if (c.type === 'folder') sortTree(c)
    }
  }

  sortTree(root)
  stats.scannedFolders = Math.max(0, folders.size - 1)
  pruneExplorerFoldersWithoutMarkdown(root, true)
  emitProgress(workspaceVirtualDirHref(`${rootName}/`))
  return { tree: root, stats, readers }
}
