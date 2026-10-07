import React, { useId, useRef, useState } from 'react'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'
import { getFilesDetailsExpanded, setFilesDetailsExpanded } from '../../../explorer/explorer-state.js'
import { explorerModeBadgeLabel } from '../../../explorer/explorer-files-context.js'
import { canCopyCurrentFileLink, copyCurrentFileLink } from '../../../actions/file-link-actions.js'
import { openExplorerSettings } from '../../../actions/explorer-settings-actions.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useCopyFeedback } from '../../hooks/useCopyFeedback.js'
import { useExplorerDetailsLayout } from '../../hooks/explorer/useExplorerDetailsLayout.js'
import { IconButton } from '../common/IconButton.jsx'
import { PanelHeader } from '../common/PanelHeader.jsx'
import { Tooltip } from '../Tooltip.jsx'
import { CopyLinkIcon } from '../icons/CopyLinkIcon.jsx'
import { FolderIcon } from '../icons/FolderIcon.jsx'
import { ExplorerContextActions } from './ExplorerContextActions.jsx'
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

function DetailsRegion({ id, expanded, actions = false, children }) {
  return (
    <div id={id} className={`mdp-explorer__details${expanded ? ' is-expanded' : ''}`} aria-hidden={!expanded} inert={!expanded}>
      <div className="mdp-explorer__details-clip">
        <div className={`mdp-explorer__details-content${actions ? ' mdp-explorer__details-content--actions' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function ExplorerHeader({
  filesContext,
  summaryDirectoryLabel,
  depthNotice,
  actionsMode,
  showBack,
  backLabel,
  actionsDisabled,
  onBack,
  onOpenAnotherFolder,
  onExitWorkspace
}) {
  const { showToast } = useToast()
  const [detailsExpanded, setDetailsExpanded] = useState(getFilesDetailsExpanded)
  const detailsId = useId()
  const actionsId = useId()
  const summaryRef = useRef(null)
  const badgeRef = useRef(null)
  const disclosureRef = useRef(null)
  const layout = useExplorerDetailsLayout(summaryRef, badgeRef)
  const detailsLabel = detailsExpanded ? 'Minimize file details' : 'Expand file details'
  const { copied: copyLinkCopied, flashCopied: flashCopyLinkCopied } = useCopyFeedback()
  const modeBadge = filesContext?.modeBadge || 'folder'
  const canCopyCurrentFile = canCopyCurrentFileLink(filesContext?.currentFileUrl)
  const currentFileName = getCurrentFileName(filesContext?.currentLine)
  const contextStatus = filesContext?.statusLine || ''
  const directoryLabel = summaryDirectoryLabel || 'Current folder'
  const directoryDisplayLabel = getDirectoryDisplayLabel(directoryLabel)
  const openFolderLabel = actionsMode === 'workspace' ? 'Switch folder…' : 'Open folder…'
  const buttonState = getExplorerHeaderButtonState({ actionsMode, showBack, actionsDisabled })
  const copyLabel = copyLinkCopied ? 'Copied' : 'Copy open file link'
  const copyTooltip = canCopyCurrentFile ? copyLabel : 'Copy link unavailable for workspace virtual files'
  const navigationLabel = actionsMode === 'workspace' ? 'Leave workspace' : backLabel || 'Back to original file'
  const navigationDisabled = actionsMode === 'workspace' ? buttonState.leaveWorkspaceDisabled : buttonState.backDisabled

  const onToggleDetails = () => {
    const expanded = !detailsExpanded
    setDetailsExpanded(expanded)
    setFilesDetailsExpanded(expanded)
  }

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

  const onOpenExplorerSettings = () => {
    void (async () => {
      try {
        await openExplorerSettings()
      } catch {
        showToast?.('Could not open Settings.', { variant: 'error' })
      }
    })()
  }

  const onExplorerSettingsKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    onOpenExplorerSettings()
  }

  const onContextNavigate = () => {
    if (navigationDisabled) return
    if (actionsMode === 'workspace') onExitWorkspace?.()
    else onBack?.()
  }

  const commands = [
    {
      key: 'copy-link', label: copyLabel, tooltip: copyTooltip, disabled: !canCopyCurrentFile,
      copied: copyLinkCopied, icon: <CopyLinkIcon className="mdp-explorer__context-command-icon" />,
      onClick: onCopyCurrentFile
    },
    ...(actionsMode !== 'hidden' ? [{
      key: 'open-folder', label: openFolderLabel, disabled: buttonState.openFolderDisabled,
      icon: <FolderIcon className="mdp-explorer__context-command-icon" />,
      onClick: () => onOpenAnotherFolder?.()
    }] : []),
    ...(!buttonState.leaveWorkspaceHidden || !buttonState.backHidden ? [{
      key: 'navigate', label: navigationLabel, disabled: navigationDisabled,
      icon: <span className="mdp-explorer__back-icon" aria-hidden="true">←</span>,
      onClick: onContextNavigate
    }] : [])
  ]

  return (
    <PanelHeader className="mdp-explorer__header" title="Files">
      <div className="mdp-explorer__context" data-details-expanded={detailsExpanded} aria-label="Files location and status">
        <div className="mdp-explorer__context-summary" ref={summaryRef}>
          <span ref={badgeRef} title={explorerModeBadgeLabel(modeBadge)} className={`mdp-explorer__badge mdp-explorer__badge--${modeBadge}`}>
            {explorerModeBadgeLabel(modeBadge)}
          </span>
          {contextStatus && detailsExpanded ? <span className="mdp-explorer__context-status">{contextStatus}</span> : null}
          <ExplorerContextActions commands={detailsExpanded ? [] : commands} layout={layout} disclosureRef={disclosureRef}>
            <IconButton
              ref={disclosureRef}
              className="mdp-explorer__details-toggle"
              tooltip={detailsLabel}
              aria-label={detailsLabel}
              aria-expanded={detailsExpanded}
              aria-controls={`${detailsId} ${actionsId}`}
              onClick={onToggleDetails}
            >
              <AppIcon name="chevron-down" size={16} className="mdp-explorer__details-chevron" />
            </IconButton>
          </ExplorerContextActions>
        </div>
        <DetailsRegion id={detailsId} expanded={detailsExpanded}>
          <div className="mdp-explorer__context-row">
            <div className="mdp-explorer__context-current" title={currentFileName}>
              <span className="mdp-explorer__context-label">Current file</span>
              <strong className="mdp-explorer__context-file">{currentFileName}</strong>
            </div>
            <IconButton tooltip={copyTooltip} className="mdp-explorer__copy-link-btn" copiedClassName="is-copied"
              copied={copyLinkCopied} aria-label={copyLabel} disabled={!canCopyCurrentFile} onClick={onCopyCurrentFile}>
              <CopyLinkIcon className="mdp-explorer__copy-link-icon" />
            </IconButton>
          </div>
          <div className="mdp-explorer__path" title={directoryLabel}>
            <FolderIcon className="mdp-explorer__path-icon" />
            <span className="mdp-explorer__path-label">{directoryDisplayLabel}</span>
          </div>
        </DetailsRegion>
      </div>
      <DetailsRegion id={actionsId} expanded={detailsExpanded} actions>
        <div className="mdp-explorer__actions" hidden={actionsMode === 'hidden'}>
          <button type="button" className="mdp-explorer__action-btn mdp-button" disabled={buttonState.openFolderDisabled}
            onClick={() => onOpenAnotherFolder?.()}>
            <FolderIcon className="mdp-explorer__action-icon" />
            <span>{openFolderLabel}</span>
          </button>
          <Tooltip content="Leave workspace mode and return to the file list for the current folder. The original file is restored when needed.">
            <button type="button" className="mdp-explorer__action-btn mdp-explorer__action-btn--secondary mdp-button"
              hidden={buttonState.leaveWorkspaceHidden} disabled={buttonState.leaveWorkspaceDisabled} onClick={() => onExitWorkspace?.()}>
              Leave workspace
            </button>
          </Tooltip>
        </div>
        <button type="button" className="mdp-explorer__back-btn mdp-button" hidden={buttonState.backHidden}
          disabled={buttonState.backDisabled} title={backLabel || 'Back to original file'}
          onClick={() => { if (!buttonState.backDisabled) onBack?.() }}>
          <span className="mdp-explorer__back-icon" aria-hidden="true">←</span>
          <span className="mdp-explorer__back-label">{backLabel || 'Back to original file'}</span>
        </button>
      </DetailsRegion>
      {filesContext?.warningLine ? (
        <div className="mdp-explorer__context-warning mdp-explorer__persistent-notice" role="note">{filesContext.warningLine}</div>
      ) : null}
      {depthNotice ? (
        <div className="mdp-explorer__depth-notice mdp-explorer__persistent-notice" role="note">
          <span>{depthNotice}</span>{' '}
          <span role="link" tabIndex={0} className="mdp-explorer__settings-link" onClick={onOpenExplorerSettings} onKeyDown={onExplorerSettingsKeyDown}>
            Adjust scan limits in Settings
          </span>
          , then refresh.
        </div>
      ) : null}
    </PanelHeader>
  )
}
