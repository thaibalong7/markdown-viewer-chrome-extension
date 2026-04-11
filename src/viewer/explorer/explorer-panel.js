import { normalizeFileUrlForCompare } from './sibling-scanner.js'
import { explorerModeBadgeLabel } from './explorer-files-context.js'
import { attachTooltip } from '../tooltip.js'

/**
 * @typedef {import('./explorer-files-context.js').ExplorerFilesContext} ExplorerFilesContext
 */

/**
 * Imperative Files tab UI: loading, progress, empty state, flat file list, folder/workspace trees.
 * @param {object} options
 * @param {HTMLElement} options.container
 * @param {(href: string) => void} [options.onNavigate]
 * @param {() => void} [options.onOpenAnotherFolder]
 * @param {() => void} [options.onExitWorkspace]
 */
export function createExplorerPanel({
  container,
  onNavigate,
  onOpenAnotherFolder,
  onExitWorkspace
} = {}) {
  const root = document.createElement('div')
  root.className = 'mdp-explorer'
  root.setAttribute('role', 'region')
  root.setAttribute('aria-label', 'Markdown files in folder')

  const headerEl = document.createElement('div')
  headerEl.className = 'mdp-explorer__header'

  const headingRowEl = document.createElement('div')
  headingRowEl.className = 'mdp-explorer__heading-row'

  const headingLabelEl = document.createElement('strong')
  headingLabelEl.className = 'mdp-explorer__heading'
  headingLabelEl.textContent = 'Files'

  const metaEl = document.createElement('span')
  metaEl.className = 'mdp-explorer__meta'
  metaEl.textContent = '0 files'

  headingRowEl.appendChild(headingLabelEl)
  headingRowEl.appendChild(metaEl)

  const contextStripEl = document.createElement('div')
  contextStripEl.className = 'mdp-explorer__context'
  contextStripEl.setAttribute('aria-label', 'Files location and status')

  const contextRowEl = document.createElement('div')
  contextRowEl.className = 'mdp-explorer__context-row'

  const badgeEl = document.createElement('span')
  badgeEl.className = 'mdp-explorer__badge'
  badgeEl.setAttribute('aria-hidden', 'true')

  const currentEl = document.createElement('div')
  currentEl.className = 'mdp-explorer__context-current'

  contextRowEl.appendChild(badgeEl)
  contextRowEl.appendChild(currentEl)

  const statusEl = document.createElement('div')
  statusEl.className = 'mdp-explorer__context-status'

  const warningEl = document.createElement('div')
  warningEl.className = 'mdp-explorer__context-warning'
  warningEl.hidden = true
  warningEl.setAttribute('role', 'note')

  contextStripEl.appendChild(contextRowEl)
  contextStripEl.appendChild(statusEl)
  contextStripEl.appendChild(warningEl)

  const actionsEl = document.createElement('div')
  actionsEl.className = 'mdp-explorer__actions'
  actionsEl.hidden = true

  const openOtherBtn = document.createElement('button')
  openOtherBtn.type = 'button'
  openOtherBtn.className = 'mdp-explorer__action-btn mdp-button'
  openOtherBtn.textContent = 'Open another folder…'

  const exitWorkspaceBtn = document.createElement('button')
  exitWorkspaceBtn.type = 'button'
  exitWorkspaceBtn.className = 'mdp-explorer__action-btn mdp-button'
  exitWorkspaceBtn.textContent = 'Exit workspace'
  exitWorkspaceBtn.hidden = true

  actionsEl.appendChild(openOtherBtn)
  actionsEl.appendChild(exitWorkspaceBtn)

  const pathEl = document.createElement('div')
  pathEl.className = 'mdp-explorer__path'
  pathEl.textContent = 'Current folder'

  const depthNoticeEl = document.createElement('div')
  depthNoticeEl.className = 'mdp-explorer__depth-notice'
  depthNoticeEl.hidden = true

  const backBtn = document.createElement('button')
  backBtn.type = 'button'
  backBtn.className = 'mdp-explorer__back-btn mdp-button'
  backBtn.hidden = true

  const loadingEl = document.createElement('div')
  loadingEl.className = 'mdp-explorer__loading'
  loadingEl.textContent = 'Loading…'
  loadingEl.hidden = true

  const progressEl = document.createElement('div')
  progressEl.className = 'mdp-explorer__progress'
  progressEl.hidden = true

  const progressHeadlineEl = document.createElement('div')
  progressHeadlineEl.className = 'mdp-explorer__progress-headline'

  const progressTextEl = document.createElement('div')
  progressTextEl.className = 'mdp-explorer__progress-text'

  const progressCancelBtn = document.createElement('button')
  progressCancelBtn.type = 'button'
  progressCancelBtn.className = 'mdp-explorer__progress-cancel mdp-button'
  progressCancelBtn.textContent = 'Cancel'

  progressEl.appendChild(progressHeadlineEl)
  progressEl.appendChild(progressTextEl)
  progressEl.appendChild(progressCancelBtn)

  const emptyEl = document.createElement('div')
  emptyEl.className = 'mdp-explorer__empty'
  emptyEl.textContent = 'No markdown files found in this directory.'
  emptyEl.hidden = true

  const listEl = document.createElement('ul')
  listEl.className = 'mdp-explorer__list'
  listEl.setAttribute('role', 'tree')
  listEl.setAttribute('aria-label', 'Files in workspace')
  listEl.hidden = true

  const setSummary = setSummaryFactory(pathEl, metaEl)

  headerEl.appendChild(headingRowEl)
  headerEl.appendChild(contextStripEl)
  headerEl.appendChild(actionsEl)
  headerEl.appendChild(pathEl)
  headerEl.appendChild(depthNoticeEl)
  headerEl.appendChild(backBtn)

  root.appendChild(headerEl)
  root.appendChild(loadingEl)
  root.appendChild(progressEl)
  root.appendChild(emptyEl)
  root.appendChild(listEl)

  /** Folder expand/collapse by href */
  /** @type {Map<string, boolean>} */
  let folderExpandedState = new Map()

  /** @type {(() => void) | null} */
  let backHandler = null
  /** @type {(() => void) | null} */
  let progressCancelHandler = null

  /** @type {Array<() => void>} */
  const explorerTooltipDestroys = []
  /** @type {Array<() => void>} */
  let treeRowTooltipDestroys = []

  container.appendChild(root)

  explorerTooltipDestroys.push(
    attachTooltip(exitWorkspaceBtn, {
      text: 'Leave workspace mode and return to the file list for the current folder. The original file is restored when needed.'
    }).destroy
  )

  openOtherBtn.addEventListener('click', () => onOpenAnotherFolder?.())
  exitWorkspaceBtn.addEventListener('click', () => onExitWorkspace?.())

  /**
   * @param {ExplorerFilesContext | null | undefined} ctx
   */
  function applyFilesContext(ctx) {
    if (!ctx) {
      badgeEl.textContent = ''
      badgeEl.className = 'mdp-explorer__badge'
      currentEl.textContent = ''
      statusEl.textContent = ''
      warningEl.hidden = true
      warningEl.textContent = ''
      return
    }
    badgeEl.textContent = explorerModeBadgeLabel(ctx.modeBadge)
    badgeEl.className = `mdp-explorer__badge mdp-explorer__badge--${ctx.modeBadge}`
    currentEl.textContent = ctx.currentLine
    statusEl.textContent = ctx.statusLine
    if (ctx.warningLine) {
      warningEl.hidden = false
      warningEl.textContent = ctx.warningLine
    } else {
      warningEl.hidden = true
      warningEl.textContent = ''
    }
  }

  /**
   * @param {ExplorerFilesContext | null | undefined} ctx
   */
  function setFilesContext(ctx) {
    applyFilesContext(ctx)
  }

  function wireProgressCancel(handler) {
    if (progressCancelHandler) {
      progressCancelBtn.removeEventListener('click', progressCancelHandler)
      progressCancelHandler = null
    }
    if (handler) {
      progressCancelHandler = () => handler()
      progressCancelBtn.addEventListener('click', progressCancelHandler)
    }
  }

  /** Clears the tree list DOM (removes rows; drops old listeners with nodes). */
  function clearTreeListDom() {
    for (const d of treeRowTooltipDestroys) d()
    treeRowTooltipDestroys = []
    listEl.replaceChildren()
  }

  /**
   * @param {string} href
   */
  function markActiveFile(href) {
    const fileButtons = listEl.querySelectorAll('button[data-file-href]')
    if (!href) {
      for (const btn of fileButtons) {
        btn.classList.remove('is-active')
        btn.setAttribute('aria-current', 'false')
      }
      return
    }
    const target = normalizeFileUrlForCompare(href)
    /** @type {HTMLButtonElement | null} */
    let activeBtn = null
    for (const btn of fileButtons) {
      const dataHref = btn.getAttribute('data-file-href') || ''
      const isActive = normalizeFileUrlForCompare(dataHref) === target
      btn.classList.toggle('is-active', isActive)
      btn.setAttribute('aria-current', isActive ? 'true' : 'false')
      if (isActive && btn instanceof HTMLButtonElement) activeBtn = btn
    }
    if (activeBtn) {
      try {
        activeBtn.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      } catch {
        /* ignore */
      }
    }
  }

  function setBackVisible(visible, label, handler) {
    backBtn.hidden = !visible
    if (backHandler) {
      backBtn.removeEventListener('click', backHandler)
      backHandler = null
    }
    if (visible && handler) {
      backBtn.textContent = label || 'Back to original file'
      backHandler = () => {
        handler()
      }
      backBtn.addEventListener('click', backHandler)
    }
  }

  /**
   * Update only the “back to original file” control (e.g. after in-place navigation without rescanning the tree).
   * @param {object} [ctx]
   * @param {boolean} [ctx.showBack]
   * @param {string} [ctx.backLabel]
   * @param {() => void} [ctx.onBack]
   */
  function setExplorerBackNavigation(ctx = {}) {
    setBackVisible(Boolean(ctx.showBack), ctx.backLabel, ctx.onBack)
  }

  function hideAllBodyStates() {
    loadingEl.hidden = true
    progressEl.hidden = true
    progressHeadlineEl.textContent = ''
    progressTextEl.textContent = ''
    emptyEl.hidden = true
    listEl.hidden = true
    wireProgressCancel(null)
    clearTreeListDom()
  }

  /** Hides loading / progress / tree / empty without showing a replacement (e.g. before recovery UI). */
  function clearExplorerBody() {
    hideAllBodyStates()
  }

  /**
   * @param {object} [opts]
   * @param {ExplorerFilesContext} [opts.filesContext]
   */
  function showLoading(opts = {}) {
    setSummary({ fileCount: 0 })
    if (opts.filesContext) applyFilesContext(opts.filesContext)
    hideAllBodyStates()
    applyActionsMode('hidden')
    loadingEl.hidden = false
    depthNoticeEl.hidden = true
  }

  /**
   * @param {object} p
   * @param {number} p.scannedFiles
   * @param {number} p.scannedFolders
   * @param {string} [p.currentFolder]
   * @param {() => void} [p.onCancel]
   * @param {string} [p.progressHeadline]
   * @param {ExplorerFilesContext} [p.filesContext]
   */
  function showProgressLoading(p) {
    if (p.filesContext) applyFilesContext(p.filesContext)
    hideAllBodyStates()
    applyActionsMode('hidden')
    progressEl.hidden = false
    progressHeadlineEl.textContent = p.progressHeadline || 'Scanning workspace…'
    const cur = p.currentFolder ? `\n${shortenPath(p.currentFolder)}` : ''
    progressTextEl.textContent = `Scanning… ${p.scannedFiles} files, ${p.scannedFolders} folders${cur}`
    progressCancelBtn.hidden = !p.onCancel
    wireProgressCancel(p.onCancel || null)
    depthNoticeEl.hidden = true
  }

  /**
   * @param {object} p
   * @param {number} p.scannedFiles
   * @param {number} p.scannedFolders
   * @param {string} [p.currentFolder]
   * @param {string} [p.progressHeadline]
   */
  function updateProgressLoading(p) {
    if (progressEl.hidden) return
    if (p.progressHeadline != null) progressHeadlineEl.textContent = p.progressHeadline
    const cur = p.currentFolder ? `\n${shortenPath(p.currentFolder)}` : ''
    progressTextEl.textContent = `Scanning… ${p.scannedFiles} files, ${p.scannedFolders} folders${cur}`
  }

  /**
   * @param {object} [ctx]
   * @param {boolean} [ctx.showBack]
   * @param {string} [ctx.backLabel]
   * @param {() => void} [ctx.onBack]
   * @param {ExplorerFilesContext} [ctx.filesContext]
   */
  function showEmpty(ctx = {}) {
    if (ctx.filesContext) applyFilesContext(ctx.filesContext)
    setSummary({
      directoryLabel: getDirectoryLabelFromUrl(ctx.currentFileUrl),
      fileCount: 0
    })
    hideAllBodyStates()
    applyActionsMode(ctx.actionsMode || 'sibling')
    emptyEl.hidden = false
    depthNoticeEl.hidden = true
    setBackVisible(Boolean(ctx.showBack), ctx.backLabel, ctx.onBack)
  }

  /**
   * @param {Array<{ displayName: string, href: string, isActive: boolean }>} files
   * @param {object} ctx
   * @param {string} ctx.currentFileUrl
   * @param {string | null} ctx.originalFileUrl
   * @param {boolean} ctx.showBack
   * @param {string} [ctx.backLabel]
   * @param {() => void} ctx.onBack
   * @param {'sibling' | 'workspace' | 'hidden'} [ctx.actionsMode]
   * @param {ExplorerFilesContext} [ctx.filesContext]
   */
  function showFiles(files, ctx) {
    if (ctx.filesContext) applyFilesContext(ctx.filesContext)
    setSummary({
      directoryLabel: getDirectoryLabelFromUrl(ctx.currentFileUrl),
      fileCount: files.length
    })
    hideAllBodyStates()
    depthNoticeEl.hidden = true
    applyActionsMode(ctx.actionsMode || 'sibling')

    if (files.length === 0) {
      emptyEl.hidden = false
      setBackVisible(ctx.showBack, ctx.backLabel, ctx.onBack)
      return
    }

    listEl.hidden = false
    listEl.setAttribute('aria-label', 'Files in current folder')

    const fragment = document.createDocumentFragment()
    for (const file of files) {
      fragment.appendChild(
        createFileRow({
          file,
          depth: 1,
          onPick: (href) => {
            markActiveFile(href)
            onNavigate?.(href)
          }
        })
      )
    }
    listEl.appendChild(fragment)

    setBackVisible(ctx.showBack, ctx.backLabel, ctx.onBack)
  }

  /**
   * @typedef {import('./folder-scanner.js').ExplorerTreeNode} ExplorerTreeNode
   * @param {ExplorerTreeNode} tree - root folder node
   * @param {object} ctx
   * @param {string} [ctx.workspaceLabel]
   * @param {import('./folder-scanner.js').ScanFolderStats} [ctx.stats]
   * @param {number} [ctx.maxScanDepth]
   * @param {boolean} [ctx.showBack]
   * @param {string} [ctx.backLabel]
   * @param {() => void} [ctx.onBack]
   * @param {ExplorerFilesContext} [ctx.filesContext]
   * @param {'sibling' | 'workspace'} [ctx.actionsMode] - which action strip to show (default workspace)
   * @param {string} [ctx.listAriaLabel] - aria-label for the tree list
   */
  function showTree(tree, ctx = {}) {
    if (ctx.filesContext) applyFilesContext(ctx.filesContext)
    const count = countMarkdownFilesInTree(tree)
    setSummary({
      directoryLabel: ctx.workspaceLabel || tree.name || 'Workspace',
      fileCount: count
    })
    hideAllBodyStates()
    applyActionsMode(ctx.actionsMode ?? 'workspace')

    const stats = ctx.stats
    if (stats && (stats.skippedByDepth > 0 || stats.hitFileLimit || stats.hitFolderLimit)) {
      depthNoticeEl.hidden = false
      depthNoticeEl.textContent = buildDepthNotice(stats, ctx.maxScanDepth)
    } else {
      depthNoticeEl.hidden = true
    }

    const children = tree.children || []
    if (children.length === 0) {
      emptyEl.hidden = false
      setBackVisible(Boolean(ctx.showBack), ctx.backLabel, ctx.onBack)
      return
    }

    listEl.hidden = false
    listEl.setAttribute(
      'aria-label',
      ctx.listAriaLabel ||
        (ctx.actionsMode === 'sibling' ? 'Markdown files in folder tree' : 'Workspace files')
    )

    folderExpandedState = buildInitialExpandedMap(children)

    const treeCtx = {
      onPickFile: (href) => {
        markActiveFile(href)
        onNavigate?.(href)
      },
      expandedMap: folderExpandedState,
      syncExpanded: () => syncFolderDomExpandedState()
    }

    const fragment = document.createDocumentFragment()
    for (const node of children) {
      appendTreeNode(fragment, node, treeCtx)
    }
    listEl.appendChild(fragment)
    syncFolderDomExpandedState()

    setBackVisible(Boolean(ctx.showBack), ctx.backLabel, ctx.onBack)
  }

  function syncFolderDomExpandedState() {
    const folders = listEl.querySelectorAll('li[data-folder-href]')
    for (const li of folders) {
      const href = li.getAttribute('data-folder-href') || ''
      const expanded = folderExpandedState.get(href) === true
      const childUl = li.querySelector(':scope > .mdp-explorer__tree-children')
      const row = li.querySelector(':scope > .mdp-explorer__tree-folder-row')
      if (childUl) childUl.hidden = !expanded
      if (row) {
        row.setAttribute('aria-expanded', expanded ? 'true' : 'false')
        row.classList.toggle('is-expanded', expanded)
      }
    }
  }

  /**
   * @param {'sibling' | 'workspace' | 'hidden'} mode
   */
  function applyActionsMode(mode) {
    if (mode === 'hidden') {
      actionsEl.hidden = true
      return
    }
    actionsEl.hidden = false
    if (mode === 'workspace') {
      openOtherBtn.hidden = false
      exitWorkspaceBtn.hidden = false
    } else {
      openOtherBtn.hidden = false
      exitWorkspaceBtn.hidden = true
    }
  }

  function destroy() {
    wireProgressCancel(null)
    if (backHandler) {
      backBtn.removeEventListener('click', backHandler)
      backHandler = null
    }
    for (const d of treeRowTooltipDestroys) d()
    treeRowTooltipDestroys = []
    for (const d of explorerTooltipDestroys) d()
    explorerTooltipDestroys.length = 0
    root.remove()
  }

  return {
    root,
    showLoading,
    clearExplorerBody,
    showProgressLoading,
    updateProgressLoading,
    showEmpty,
    showFiles,
    showTree,
    markActiveFile,
    setFilesContext,
    setExplorerBackNavigation,
    destroy
  }
}

/**
 * @param {import('./folder-scanner.js').ExplorerTreeNode} node
 * @returns {number}
 */
function countMarkdownFilesInTree(node) {
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
function buildDepthNotice(stats, maxScanDepth) {
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
function buildInitialExpandedMap(nodes) {
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
 * @param {ParentNode} parent
 * @param {import('./folder-scanner.js').ExplorerTreeNode} node
 * @param {{ onPickFile: (href: string) => void, expandedMap: Map<string, boolean>, syncExpanded: () => void }} treeCtx
 */
function appendTreeNode(parent, node, treeCtx) {
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

  treeRowTooltipDestroys.push(
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

/**
 * @param {object} opts
 * @param {{ displayName: string, href: string, isActive: boolean }} opts.file
 * @param {number} opts.depth
 * @param {(href: string) => void} opts.onPick
 */
function createFileRow({ file, depth, onPick }) {
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
    // Do not use `file.isActive` here — it is fixed at build time; after navigating away,
    // markActiveFile updates the DOM but this closure would still block clicks on the old active row.
    onPick(file.href)
  })

  li.appendChild(btn)
  return li
}

/**
 * @param {string} url
 */
function shortenPath(url) {
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
function setSummaryFactory(pathEl, metaEl) {
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
function getDirectoryLabelFromUrl(fileUrl) {
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
