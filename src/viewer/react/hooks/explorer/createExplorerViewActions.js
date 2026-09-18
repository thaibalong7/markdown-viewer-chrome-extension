import {
  buildDepthNotice,
  buildInitialExpandedMap,
  buildPreservedExpandedMap,
  countViewableFilesInTree,
  getDirectoryLabelFromUrl,
  shortenPath
} from '../../../explorer/explorer-tree-utils.js'

/**
 * Imperative view transitions for the Files explorer (patch reducer state).
 * @param {object} deps
 * @param {import('react').MutableRefObject<object>} deps.stateRef
 * @param {(payload: object) => void} deps.safePatch
 * @param {(opts: object) => void} deps.setBackNavigation
 * @param {import('react').MutableRefObject<string>} deps.currentFileUrlRef
 */
export function createExplorerViewActions({ stateRef, safePatch, setBackNavigation, currentFileUrlRef }) {
  const showLoading = ({ filesContext, actionsMode } = {}) => {
    safePatch({
      view: 'loading',
      actionsMode: actionsMode ?? stateRef.current.actionsMode,
      depthNotice: '',
      files: [],
      tree: null,
      listAriaLabel: 'Workspace files',
      summaryFileCount: 0,
      filesContext: filesContext || stateRef.current.filesContext
    })
  }

  const clearExplorerBody = () => {
    safePatch({
      view: 'loading',
      files: [],
      tree: null,
      depthNotice: '',
      progressHeadline: '',
      progressText: '',
      showProgressCancel: false
    })
  }

  const showProgressLoading = (payload) => {
    const cur = payload.currentFolder ? `\n${shortenPath(payload.currentFolder)}` : ''
    safePatch({
      view: 'progress',
      depthNotice: '',
      files: [],
      tree: null,
      filesContext: payload.filesContext || stateRef.current.filesContext,
      progressHeadline: payload.progressHeadline || 'Scanning workspace…',
      progressText: `Scanning… ${payload.scannedFiles} files, ${payload.scannedFolders} folders${cur}`,
      showProgressCancel: Boolean(payload.onCancel)
    })
  }

  const updateProgressLoading = (payload) => {
    if (stateRef.current.view !== 'progress') return
    const cur = payload.currentFolder ? `\n${shortenPath(payload.currentFolder)}` : ''
    safePatch({
      progressHeadline:
        payload.progressHeadline != null ? payload.progressHeadline : stateRef.current.progressHeadline,
      progressText: `Scanning… ${payload.scannedFiles} files, ${payload.scannedFolders} folders${cur}`
    })
  }

  const showEmpty = (ctx = {}) => {
    safePatch({
      view: 'empty',
      actionsMode: ctx.actionsMode || 'sibling',
      filesContext: ctx.filesContext || stateRef.current.filesContext,
      summaryDirectoryLabel: getDirectoryLabelFromUrl(ctx.currentFileUrl),
      summaryFileCount: 0,
      depthNotice: ''
    })
    setBackNavigation({
      showBack: Boolean(ctx.showBack),
      backLabel: ctx.backLabel,
      onBack: ctx.onBack
    })
  }

  const showFiles = (files, ctx) => {
    const list = Array.isArray(files) ? files : []
    safePatch({
      view: list.length ? 'files' : 'empty',
      actionsMode: ctx.actionsMode || 'sibling',
      files: list,
      tree: null,
      listAriaLabel: 'Files in current folder',
      filesContext: ctx.filesContext || stateRef.current.filesContext,
      summaryDirectoryLabel: getDirectoryLabelFromUrl(ctx.currentFileUrl),
      summaryFileCount: list.length,
      depthNotice: '',
      activeFileUrl: ctx.currentFileUrl || ''
    })
    setBackNavigation({
      showBack: Boolean(ctx.showBack),
      backLabel: ctx.backLabel,
      onBack: ctx.onBack
    })
  }

  const showTree = (tree, ctx = {}) => {
    const count = countViewableFilesInTree(tree)
    const children = Array.isArray(tree?.children) ? tree.children : []
    const stats = ctx.stats
    const depthNotice =
      stats && (stats.skippedByDepth > 0 || stats.hitFileLimit || stats.hitFolderLimit)
        ? buildDepthNotice(stats, ctx.maxScanDepth)
        : ''
    const previousExpandedMap = ctx.expandedMap || stateRef.current.expandedMap
    const shouldPreserveExpandedState = Boolean(ctx.preserveExpandedState || ctx.expandedMap)

    safePatch({
      view: children.length ? 'tree' : 'empty',
      actionsMode: ctx.actionsMode ?? 'workspace',
      tree,
      files: [],
      listAriaLabel:
        ctx.listAriaLabel || (ctx.actionsMode === 'sibling' ? 'Supported files in folder tree' : 'Workspace files'),
      expandedMap: shouldPreserveExpandedState
        ? buildPreservedExpandedMap(children, previousExpandedMap)
        : buildInitialExpandedMap(children),
      filesContext: ctx.filesContext || stateRef.current.filesContext,
      summaryDirectoryLabel: ctx.workspaceLabel || tree?.name || 'Workspace',
      summaryFileCount: count,
      depthNotice,
      activeFileUrl: currentFileUrlRef.current
    })
    setBackNavigation({
      showBack: Boolean(ctx.showBack),
      backLabel: ctx.backLabel,
      onBack: ctx.onBack
    })
  }

  return {
    showLoading,
    clearExplorerBody,
    showProgressLoading,
    updateProgressLoading,
    showEmpty,
    showFiles,
    showTree
  }
}
