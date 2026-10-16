import { message as localizedMessage } from '../../../../i18n/index.js'
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
    const mode = filesContext?.modeBadge
    safePatch({
      view: 'loading',
      actionsMode: actionsMode ?? (mode ? mode === 'workspace' ? 'workspace' : 'sibling' : stateRef.current.actionsMode),
      ...(mode === 'folder' ? { summaryDirectoryLabel: getDirectoryLabelFromUrl(currentFileUrlRef.current) } : {}),
      depthNotice: '',
      files: [],
      tree: null,
      listAriaLabel: 'viewer.explorer.context.workspaceFiles',
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
      ...(payload.filesContext?.modeBadge ? {
        actionsMode: payload.filesContext.modeBadge === 'workspace' ? 'workspace' : 'sibling'
      } : {}),
      ...(payload.currentFolder ? { summaryDirectoryLabel: shortenPath(payload.currentFolder) } : {}),
      depthNotice: '',
      files: [],
      tree: null,
      filesContext: payload.filesContext || stateRef.current.filesContext,
      progressHeadline: payload.progressHeadline || 'viewer.explorer.context.scanningWorkspace',
      progressText: localizedMessage('viewer.explorer.scan.progress', { files: payload.scannedFiles, folders: payload.scannedFolders, path: cur }),
      showProgressCancel: Boolean(payload.onCancel)
    })
  }

  const updateProgressLoading = (payload) => {
    if (stateRef.current.view !== 'progress') return
    const cur = payload.currentFolder ? `\n${shortenPath(payload.currentFolder)}` : ''
    safePatch({
      progressHeadline:
        payload.progressHeadline != null ? payload.progressHeadline : stateRef.current.progressHeadline,
      progressText: localizedMessage('viewer.explorer.scan.progress', { files: payload.scannedFiles, folders: payload.scannedFolders, path: cur })
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
      listAriaLabel: 'viewer.explorer.panel.filesInCurrentFolder',
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
        ctx.listAriaLabel || (ctx.actionsMode === 'sibling' ? 'viewer.explorer.accessibility.supportedFilesInFolderTree' : 'viewer.explorer.context.workspaceFiles'),
      expandedMap: shouldPreserveExpandedState
        ? buildPreservedExpandedMap(children, previousExpandedMap)
        : buildInitialExpandedMap(children),
      filesContext: ctx.filesContext || stateRef.current.filesContext,
      summaryDirectoryLabel: tree?.href?.startsWith('file:')
        ? getDirectoryLabelFromUrl(`${tree.href.replace(/\/$/, '')}/_`)
        : ctx.workspaceLabel || tree?.name || localizedMessage('viewer.explorer.workspace'),
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
