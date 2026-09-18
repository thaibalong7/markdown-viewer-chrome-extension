import React from 'react'
import { explorerModeBadgeLabel } from '../../../explorer/explorer-files-context.js'
import { canCopyCurrentFileLink, copyCurrentFileLink } from '../../../actions/file-link-actions.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useCopyFeedback } from '../../hooks/useCopyFeedback.js'
import { IconButton } from '../common/IconButton.jsx'
import { PanelHeader } from '../common/PanelHeader.jsx'
import { Tooltip } from '../Tooltip.jsx'
import { CopyLinkIcon } from '../icons/CopyLinkIcon.jsx'
import { CollapseAllIcon } from '../icons/CollapseAllIcon.jsx'
import { FolderIcon } from '../icons/FolderIcon.jsx'
import { RefreshIcon } from '../icons/RefreshIcon.jsx'
import { getExplorerHeaderButtonState } from './explorer-header-state.js'

function getCurrentFileName(currentLine) {
  return String(currentLine || '').trim() || 'No file selected'
}

function getDirectoryDisplayLabel(directoryLabel) {
  const value = String(directoryLabel || '').trim() || 'Current folder'
  const segments = value.split(/[\\/]+/).filter(Boolean)
  if (segments.length <= 2) return value
  return `…/${segments.slice(-2).join('/')}`
}

export function ExplorerHeader({
  filesContext,
  summaryDirectoryLabel,
  summaryFileCount,
  depthNotice,
  actionsMode,
  showBack,
  backLabel,
  isRefreshing,
  refreshDisabled,
  refreshTooltip,
  showCollapseAllFolders,
  collapseAllFoldersDisabled,
  collapseKeepsOpenFilePath,
  actionsDisabled,
  onBack,
  onRefresh,
  onCollapseAllFolders,
  onOpenAnotherFolder,
  onExitWorkspace
}) {
  const { showToast } = useToast()
  const { copied: copyLinkCopied, flashCopied: flashCopyLinkCopied } = useCopyFeedback()
  const modeBadge = filesContext?.modeBadge || 'folder'
  const canCopyCurrentFile = canCopyCurrentFileLink(filesContext?.currentFileUrl)
  const currentFileName = getCurrentFileName(filesContext?.currentLine)
  const contextStatus = filesContext?.statusLine || ''
  const directoryLabel = summaryDirectoryLabel || 'Current folder'
  const directoryDisplayLabel = getDirectoryDisplayLabel(directoryLabel)
  const openFolderLabel = actionsMode === 'workspace' ? 'Switch folder…' : 'Open folder…'
  const buttonState = getExplorerHeaderButtonState({ actionsMode, showBack, actionsDisabled })

  const onCopyCurrentFile = () => {
    void (async () => {
      try {
        await copyCurrentFileLink(filesContext?.currentFileUrl)
        flashCopyLinkCopied()
        showToast?.('Copied file link', { variant: 'success' })
      } catch {
        showToast?.('Could not copy file link', { variant: 'error' })
      }
    })()
  }

  return (
    <PanelHeader
      className="mdp-explorer__header"
      title="Files"
      meta={`${summaryFileCount} ${summaryFileCount === 1 ? 'file' : 'files'}`}
      action={
        <div className="mdp-explorer__header-actions">
          {showCollapseAllFolders ? (
            <IconButton
              tooltip={
                collapseAllFoldersDisabled
                  ? 'All folders are collapsed'
                  : collapseKeepsOpenFilePath
                    ? 'Collapse folders outside the open file path'
                    : 'Collapse all folders'
              }
              className="mdp-explorer__header-action-btn"
              aria-label="Collapse all folders"
              disabled={collapseAllFoldersDisabled}
              onClick={() => onCollapseAllFolders?.()}
            >
              <CollapseAllIcon className="mdp-explorer__header-action-icon" />
            </IconButton>
          ) : null}
          <IconButton
            tooltip={refreshTooltip}
            className={`mdp-explorer__header-action-btn mdp-explorer__refresh-btn${isRefreshing ? ' is-refreshing' : ''}`}
            aria-label={isRefreshing ? 'Refreshing open file and file list' : 'Refresh open file and file list'}
            disabled={refreshDisabled || isRefreshing}
            onClick={() => onRefresh?.()}
          >
            <RefreshIcon className="mdp-explorer__refresh-icon" />
          </IconButton>
        </div>
      }
    >
      <div className="mdp-explorer__context" aria-label="Files location and status">
        <div className="mdp-explorer__context-summary">
          <span className={`mdp-explorer__badge mdp-explorer__badge--${modeBadge}`}>
            {explorerModeBadgeLabel(modeBadge)}
          </span>
          {contextStatus ? <span className="mdp-explorer__context-status">{contextStatus}</span> : null}
        </div>

        <div className="mdp-explorer__context-row">
          <div className="mdp-explorer__context-current" title={currentFileName}>
            <span className="mdp-explorer__context-label">Current file</span>
            <strong className="mdp-explorer__context-file">{currentFileName}</strong>
          </div>
          <IconButton
            tooltip={
              canCopyCurrentFile
                ? copyLinkCopied
                  ? 'Copied'
                  : 'Copy open file link'
                : 'Copy link unavailable for workspace virtual files'
            }
            className="mdp-explorer__copy-link-btn"
            copiedClassName="is-copied"
            copied={copyLinkCopied}
            aria-label={copyLinkCopied ? 'Copied' : 'Copy open file link'}
            disabled={!canCopyCurrentFile}
            onClick={onCopyCurrentFile}
          >
            <CopyLinkIcon className="mdp-explorer__copy-link-icon" />
          </IconButton>
        </div>

        <div className="mdp-explorer__path" title={directoryLabel}>
          <FolderIcon className="mdp-explorer__path-icon" />
          <span className="mdp-explorer__path-label">{directoryDisplayLabel}</span>
        </div>

        <div className="mdp-explorer__context-warning" hidden={!filesContext?.warningLine} role="note">
          {filesContext?.warningLine || ''}
        </div>
      </div>

      <div className="mdp-explorer__actions" hidden={actionsMode === 'hidden'}>
        <button
          type="button"
          className="mdp-explorer__action-btn mdp-button"
          disabled={buttonState.openFolderDisabled}
          onClick={() => onOpenAnotherFolder?.()}
        >
          <FolderIcon className="mdp-explorer__action-icon" />
          <span>{openFolderLabel}</span>
        </button>
        <Tooltip content="Leave workspace mode and return to the file list for the current folder. The original file is restored when needed.">
          <button
            type="button"
            className="mdp-explorer__action-btn mdp-explorer__action-btn--secondary mdp-button"
            hidden={buttonState.leaveWorkspaceHidden}
            disabled={buttonState.leaveWorkspaceDisabled}
            onClick={() => onExitWorkspace?.()}
          >
            Leave workspace
          </button>
        </Tooltip>
      </div>

      <button
        type="button"
        className="mdp-explorer__back-btn mdp-button"
        hidden={buttonState.backHidden}
        disabled={buttonState.backDisabled}
        title={backLabel || 'Back to original file'}
        onClick={() => {
          if (!buttonState.backDisabled) onBack?.()
        }}
      >
        <span className="mdp-explorer__back-icon" aria-hidden="true">←</span>
        <span className="mdp-explorer__back-label">{backLabel || 'Back to original file'}</span>
      </button>

      {depthNotice ? (
        <div className="mdp-explorer__depth-notice" role="note">
          {depthNotice}
        </div>
      ) : null}
    </PanelHeader>
  )
}
