import { buildCollapsedExpandedMap } from '../../../explorer/explorer-tree-utils.js'
import { normalizeFileUrlForCompare } from '../../../explorer/url-utils.js'

/** @typedef {ReturnType<typeof createInitialState>} ExplorerState */

export function createInitialState() {
  const initialUrl = typeof window !== 'undefined' ? window.location.href : ''
  return {
    explorerMode: 'sibling',
    currentFileUrl: initialUrl,
    activeFileUrl: initialUrl,
    view: 'loading',
    actionsMode: 'hidden',
    files: [],
    tree: null,
    listAriaLabel: 'Workspace files',
    summaryDirectoryLabel: 'Current folder',
    summaryFileCount: 0,
    depthNotice: '',
    progressHeadline: 'Scanning workspace…',
    progressText: '',
    showProgressCancel: false,
    showBack: false,
    backLabel: 'Back to original file',
    isRefreshing: false,
    expandedMap: new Map(),
    filesContext: null
  }
}

/**
 * @param {ExplorerState} state
 * @param {object} action
 * @returns {ExplorerState}
 */
export function explorerReducer(state, action) {
  switch (action.type) {
    case 'PATCH':
      return { ...state, ...action.payload }
    case 'TOGGLE_FOLDER': {
      const nextMap = new Map(state.expandedMap)
      const href = action.href || ''
      nextMap.set(href, !(nextMap.get(href) === true))
      return { ...state, expandedMap: nextMap }
    }
    case 'COLLAPSE_ALL_FOLDERS': {
      return {
        ...state,
        expandedMap: buildCollapsedExpandedMap(
          state.tree?.children || [],
          state.activeFileUrl,
          state.expandedMap,
          normalizeFileUrlForCompare
        )
      }
    }
    default:
      return state
  }
}
