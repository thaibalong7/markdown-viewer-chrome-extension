import React, { useEffect } from 'react'
import {
  getActiveSidebarTab,
  setActiveSidebarTab as persistActiveSidebarTab
} from '../../explorer/explorer-state.js'
import { useViewerDispatch, useViewerState } from '../contexts/ViewerStateContext.jsx'

export function SidebarTabs({ onTabBarRef, onTabFilesRef, onTabOutlineRef }) {
  const { activeSidebarTab } = useViewerState()
  const dispatch = useViewerDispatch()
  const isFiles = activeSidebarTab === 'files'

  useEffect(() => {
    const storedTab = getActiveSidebarTab()
    dispatch({ type: 'SET_SIDEBAR_TAB', payload: storedTab })
  }, [dispatch])

  useEffect(() => {
    persistActiveSidebarTab(isFiles ? 'files' : 'outline')
  }, [isFiles])

  return (
    <div className="mdp-sidebar-tabs" role="tablist" aria-label="Sidebar" ref={onTabBarRef}>
      <button
        type="button"
        className={`mdp-sidebar-tab${isFiles ? '' : ' is-active'}`}
        role="tab"
        aria-selected={String(!isFiles)}
        id="mdp-tab-outline"
        aria-controls="mdp-panel-outline"
        ref={onTabOutlineRef}
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
        ref={onTabFilesRef}
        onClick={() => dispatch({ type: 'SET_SIDEBAR_TAB', payload: 'files' })}
      >
        Files
      </button>
    </div>
  )
}
