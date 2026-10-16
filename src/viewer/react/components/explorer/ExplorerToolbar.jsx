import { t, isMessage } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
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
  useLocale()
  const directoryLabel = String(isMessage(summaryDirectoryLabel) ? t(summaryDirectoryLabel) : summaryDirectoryLabel || '').trim() || t('viewer.explorer.currentFolder')
  const directoryName = directoryLabel.split(/[\\/]+/).filter(Boolean).pop() || directoryLabel
  return (
    <div className="mdp-explorer__toolbar" role="group" aria-label={t('viewer.explorer.toolbar.fileListControls')}>
      <div className="mdp-explorer__toolbar-summary">
        <span className="mdp-explorer__toolbar-location" title={directoryLabel}>{directoryName}</span>
        <span className="mdp-explorer__toolbar-count">
          {isBusy ? t('viewer.explorer.toolbar.scanning') : t('viewer.explorer.fileCount', { count: summaryFileCount })}
        </span>
      </div>
      <div className="mdp-explorer__toolbar-actions">
        {showCollapseAllFolders ? <IconButton
            tooltip={
              collapseAllFoldersDisabled ? t('viewer.explorer.toolbar.allFoldersAreCollapsed') : collapseKeepsOpenFilePath ? t('viewer.explorer.toolbar.collapseFoldersOutsideTheOpenFilePath') : t('viewer.explorer.toolbar.collapseAllFolders')
            }
            className="mdp-explorer__toolbar-btn"
            aria-label={t('viewer.explorer.toolbar.collapseAllFolders')}
            disabled={collapseAllFoldersDisabled}
            onClick={() => onCollapseAllFolders?.()}
          >
            <CollapseAllIcon className="mdp-explorer__toolbar-icon" />
          </IconButton> : null}
        <IconButton
          tooltip={refreshTooltip}
          className={`mdp-explorer__toolbar-btn mdp-explorer__refresh-btn${isRefreshing ? ' is-refreshing' : ''}`}
          aria-label={isRefreshing ? t('viewer.explorer.panel.refreshingFileList') : t('common.actions.refreshFileList')}
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
