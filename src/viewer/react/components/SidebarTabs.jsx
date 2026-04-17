import React, { useEffect } from 'react'
import {
  getActiveSidebarTab,
  setActiveSidebarTab as persistActiveSidebarTab
} from '../../explorer/explorer-state.js'
import { useSidebarTabDispatch, useSidebarTabState } from '../contexts/SidebarTabContext.jsx'

export function SidebarTabs() {
  const { activeSidebarTab } = useSidebarTabState()
  const dispatch = useSidebarTabDispatch()
  const isFiles = activeSidebarTab === 'files'

  useEffect(() => {
    const storedTab = getActiveSidebarTab()
    dispatch({ type: 'SET_SIDEBAR_TAB', payload: storedTab })
  }, [dispatch])

  useEffect(() => {
    persistActiveSidebarTab(isFiles ? 'files' : 'outline')
  }, [isFiles])

  return (
    <div className="mdp-sidebar-tabs" role="tablist" aria-label="Sidebar">
      <button
        type="button"
        className={`mdp-sidebar-tab${isFiles ? '' : ' is-active'}`}
        role="tab"
        aria-selected={String(!isFiles)}
        id="mdp-tab-outline"
        aria-controls="mdp-panel-outline"
        onClick={() => dispatch({ type: 'SET_SIDEBAR_TAB', payload: 'outline' })}
      >
        Outline
      </button>
      <button
        type="button"
        className={`mdp-sidebar-tab${isFiles ? ' is-active' : ''}`}
        role="tab"
        aria-selected={String(isFiles)}
        id="mdp-tab-files"
        aria-controls="mdp-panel-files"
        onClick={() => dispatch({ type: 'SET_SIDEBAR_TAB', payload: 'files' })}
      >
        Files
      </button>
    </div>
  )
}
