import React from 'react'
import { explorerModeBadgeLabel } from '../../../explorer/explorer-files-context.js'
import { canCopyCurrentFileLink, copyCurrentFileLink } from '../../../actions/file-link-actions.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useCopyFeedback } from '../../hooks/useCopyFeedback.js'
import { IconButton } from '../common/IconButton.jsx'
import { Tooltip } from '../Tooltip.jsx'
import { CopyLinkIcon } from '../icons/CopyLinkIcon.jsx'
import { RefreshIcon } from '../icons/RefreshIcon.jsx'

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
  onBack,
  onRefresh,
  onOpenAnotherFolder,
  onExitWorkspace
}) {
  const { showToast } = useToast()
  const { copied: copyLinkCopied, flashCopied: flashCopyLinkCopied } = useCopyFeedback()
  const modeBadge = filesContext?.modeBadge || 'folder'
  const canCopyCurrentFile = canCopyCurrentFileLink(filesContext?.currentFileUrl)

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
    <div className="mdp-explorer__header">
      <div className="mdp-explorer__heading-row">
        <div className="mdp-explorer__heading-main">
          <strong className="mdp-explorer__heading">Files</strong>
          <span className="mdp-explorer__meta">
            {summaryFileCount} {summaryFileCount === 1 ? 'file' : 'files'}
          </span>
        </div>
        <IconButton
          tooltip={refreshTooltip}
          className={`mdp-explorer__refresh-btn${isRefreshing ? ' is-refreshing' : ''}`}
          aria-label={isRefreshing ? 'Refreshing open file and file list' : 'Refresh open file and file list'}
          disabled={refreshDisabled || isRefreshing}
          onClick={() => onRefresh?.()}
        >
          <RefreshIcon className="mdp-explorer__refresh-icon" />
        </IconButton>
      </div>

      <div className="mdp-explorer__context" aria-label="Files location and status">
        <div className="mdp-explorer__context-row">
          <span className={`mdp-explorer__badge mdp-explorer__badge--${modeBadge}`} aria-hidden="true">
            {explorerModeBadgeLabel(modeBadge)}
          </span>
          <div className="mdp-explorer__context-current">{filesContext?.currentLine || ''}</div>
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
        <div className="mdp-explorer__context-status">{filesContext?.statusLine || ''}</div>
        <div className="mdp-explorer__context-warning" hidden={!filesContext?.warningLine} role="note">
          {filesContext?.warningLine || ''}
        </div>
      </div>

      <div className="mdp-explorer__actions" hidden={actionsMode === 'hidden'}>
        <button
          type="button"
          className="mdp-explorer__action-btn mdp-button"
          hidden={actionsMode === 'hidden'}
          onClick={() => onOpenAnotherFolder?.()}
        >
          Open another folder…
        </button>
        <Tooltip content="Leave workspace mode and return to the file list for the current folder. The original file is restored when needed.">
          <button
            type="button"
            className="mdp-explorer__action-btn mdp-button"
            hidden={actionsMode !== 'workspace'}
            onClick={() => onExitWorkspace?.()}
          >
            Exit workspace
          </button>
        </Tooltip>
      </div>

      <div className="mdp-explorer__path">{summaryDirectoryLabel || 'Current folder'}</div>

      <div className="mdp-explorer__depth-notice" hidden={!depthNotice}>
        {depthNotice}
      </div>

      <button type="button" className="mdp-explorer__back-btn mdp-button" hidden={!showBack} onClick={() => onBack?.()}>
        {backLabel || 'Back to original file'}
      </button>
    </div>
  )
}
