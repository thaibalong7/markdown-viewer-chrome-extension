import React, { createContext, useContext, useMemo, useReducer } from 'react'
import { getActiveSidebarTab } from '../../explorer/explorer-state.js'

const SidebarTabStateContext = createContext(null)
const SidebarTabDispatchContext = createContext(null)

function sidebarTabReducer(state, action) {
  switch (action?.type) {
    case 'SET_SIDEBAR_TAB':
      return action.payload || 'outline'
    default:
      return state
  }
}

export function SidebarTabProvider({ initialTab, children }) {
  const [activeSidebarTab, dispatch] = useReducer(
    sidebarTabReducer,
    initialTab || getActiveSidebarTab()
  )

  const stateValue = useMemo(() => ({ activeSidebarTab }), [activeSidebarTab])

  return (
    <SidebarTabStateContext.Provider value={stateValue}>
      <SidebarTabDispatchContext.Provider value={dispatch}>{children}</SidebarTabDispatchContext.Provider>
    </SidebarTabStateContext.Provider>
  )
}

export function useSidebarTabState() {
  const context = useContext(SidebarTabStateContext)
  if (context === null) {
    throw new Error('useSidebarTabState must be used within SidebarTabProvider.')
  }
  return context
}

export function useSidebarTabDispatch() {
  const context = useContext(SidebarTabDispatchContext)
  if (context === null) {
    throw new Error('useSidebarTabDispatch must be used within SidebarTabProvider.')
  }
  return context
}
