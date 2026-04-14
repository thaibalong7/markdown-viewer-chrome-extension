import React, { createContext, useContext, useMemo, useReducer } from 'react'
import { getActiveSidebarTab } from '../../explorer/explorer-state.js'

const ViewerStateContext = createContext(null)
const ViewerDispatchContext = createContext(null)

function buildInitialState({
  markdown = '',
  currentFileUrl = '',
  activeSidebarTab = getActiveSidebarTab(),
  tocVisible = true
} = {}) {
  return {
    markdown,
    currentFileUrl,
    activeSidebarTab,
    tocVisible
  }
}

function viewerStateReducer(state, action) {
  switch (action?.type) {
    case 'SET_MARKDOWN':
      return { ...state, markdown: action.payload ?? '' }
    case 'SET_FILE_URL':
      return { ...state, currentFileUrl: action.payload ?? '' }
    case 'SET_SIDEBAR_TAB':
      return { ...state, activeSidebarTab: action.payload || 'outline' }
    case 'SET_TOC_VISIBLE':
      return { ...state, tocVisible: Boolean(action.payload) }
    default:
      return state
  }
}

export function ViewerStateProvider({
  markdown,
  currentFileUrl,
  activeSidebarTab,
  tocVisible,
  children
}) {
  const [state, dispatch] = useReducer(
    viewerStateReducer,
    buildInitialState({
      markdown,
      currentFileUrl,
      activeSidebarTab,
      tocVisible
    })
  )

  const stateValue = useMemo(() => state, [state])

  return (
    <ViewerStateContext.Provider value={stateValue}>
      <ViewerDispatchContext.Provider value={dispatch}>
        {children}
      </ViewerDispatchContext.Provider>
    </ViewerStateContext.Provider>
  )
}

export function useViewerState() {
  const context = useContext(ViewerStateContext)
  if (context === null) {
    throw new Error('useViewerState must be used within ViewerStateProvider.')
  }
  return context
}

export function useViewerDispatch() {
  const context = useContext(ViewerDispatchContext)
  if (context === null) {
    throw new Error('useViewerDispatch must be used within ViewerStateProvider.')
  }
  return context
}
