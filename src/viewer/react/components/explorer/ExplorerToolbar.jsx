import React from 'react'
import { IconButton } from '../common/IconButton.jsx'
import { CollapseAllIcon } from '../icons/CollapseAllIcon.jsx'
import { RefreshIcon } from '../icons/RefreshIcon.jsx'

export function ExplorerToolbar({
  summaryFileCount,
  summaryDirectoryLabel,
  isBusy = false,
  isRefreshing,
  refreshDisabled,
  refreshTooltip,
  showCollapseAllFolders,
  collapseAllFoldersDisabled,
  collapseKeepsOpenFilePath,
  onRefresh,
  onCollapseAllFolders
}) {
  const directoryLabel = String(summaryDirectoryLabel || '').trim() || 'Current folder'
  const directoryName = directoryLabel.split(/[\\/]+/).filter(Boolean).pop() || directoryLabel
  return (
    <div className="mdp-explorer__toolbar" role="group" aria-label="File list controls">
      <div className="mdp-explorer__toolbar-summary">
        <span className="mdp-explorer__toolbar-location" title={directoryLabel}>{directoryName}</span>
        <span className="mdp-explorer__toolbar-count">
          {isBusy ? 'Scanning…' : `· ${summaryFileCount} ${summaryFileCount === 1 ? 'file' : 'files'}`}
        </span>
      </div>
      <div className="mdp-explorer__toolbar-actions">
        {showCollapseAllFolders ? (
          <IconButton
            tooltip={
              collapseAllFoldersDisabled
                ? 'All folders are collapsed'
                : collapseKeepsOpenFilePath
                  ? 'Collapse folders outside the open file path'
                  : 'Collapse all folders'
            }
            className="mdp-explorer__toolbar-btn"
            aria-label="Collapse all folders"
            disabled={collapseAllFoldersDisabled}
            onClick={() => onCollapseAllFolders?.()}
          >
            <CollapseAllIcon className="mdp-explorer__toolbar-icon" />
          </IconButton>
        ) : null}
        <IconButton
          tooltip={refreshTooltip}
          className={`mdp-explorer__toolbar-btn mdp-explorer__refresh-btn${isRefreshing ? ' is-refreshing' : ''}`}
          aria-label={isRefreshing ? 'Refreshing file list' : 'Refresh file list'}
          aria-busy={isRefreshing}
          disabled={refreshDisabled || isRefreshing}
          onClick={() => onRefresh?.()}
        >
          <RefreshIcon className="mdp-explorer__refresh-icon" />
        </IconButton>
      </div>
    </div>
  )
}
