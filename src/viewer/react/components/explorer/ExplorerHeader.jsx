import { t, isMessage } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import React, { useId, useRef, useState } from 'react'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'
import { getFilesDetailsExpanded, setFilesDetailsExpanded } from '../../../explorer/explorer-state.js'
import { canCopyCurrentFileLink, copyCurrentFileLink } from '../../../actions/file-link-actions.js'
import { openExplorerSettings } from '../../../actions/explorer-settings-actions.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useCopyFeedback } from '../../hooks/useCopyFeedback.js'
import { useExplorerDetailsLayout } from '../../hooks/explorer/useExplorerDetailsLayout.js'
import { IconSwap } from '../common/IconSwap.jsx'
import { IconButton } from '../common/IconButton.jsx'
import { ExplorerContextActions } from './ExplorerContextActions.jsx'
import { getExplorerHeaderButtonState } from './explorer-header-state.js'

function getCurrentFileName(currentLine) {
  return String(isMessage(currentLine) ? t(currentLine) : currentLine || '').trim()
}

function DetailsRegion({ id, expanded, children }) {
  return (
    <div id={id} className={`mdp-explorer__details${expanded ? ' is-expanded' : ''}`} aria-hidden={!expanded} inert={!expanded}>
      <div className="mdp-explorer__details-clip">
        <div className="mdp-explorer__details-content">
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
  useLocale()
  const { showToast } = useToast()
  const [detailsExpanded, setDetailsExpanded] = useState(getFilesDetailsExpanded)
  const detailsId = useId()
  const summaryRef = useRef(null)
  const badgeRef = useRef(null)
  const disclosureRef = useRef(null)
  const layout = useExplorerDetailsLayout(summaryRef, badgeRef)
  const detailsLabel = detailsExpanded ? 'viewer.explorer.header.hideFileDetails' : 'viewer.explorer.header.showFileDetails'
  const { copied: copyLinkCopied, flashCopied: flashCopyLinkCopied } = useCopyFeedback()
  const isWorkspace = actionsMode === 'workspace' || (actionsMode === 'hidden' && filesContext?.modeBadge === 'workspace')
  const canCopyCurrentFile = canCopyCurrentFileLink(filesContext?.currentFileUrl)
  const currentFileName = getCurrentFileName(filesContext?.currentLine)
  const directoryLabel = (isMessage(summaryDirectoryLabel) ? t(summaryDirectoryLabel) : summaryDirectoryLabel) || (isWorkspace ? t('viewer.explorer.workspace') : t('viewer.explorer.currentFolder'))
  const directoryParts = directoryLabel.split(/[\\/]/).filter(Boolean)
  const directoryDisplay = directoryParts.length > 3 ? `…/${directoryParts.slice(-2).join('/')}` : directoryLabel
  const openFolderLabel = actionsMode === 'workspace' ? 'viewer.explorer.header.switchFolder' : 'viewer.explorer.header.openFolder'
  const buttonState = getExplorerHeaderButtonState({ actionsMode, showBack, actionsDisabled })
  const copyLabel = copyLinkCopied ? 'common.status.copied' : 'common.actions.copyLink'
  const copyUnavailableReason = canCopyCurrentFile ? '' : 'viewer.explorer.header.unavailableForWorkspaceVirtualFiles'
  const copyTooltip = copyUnavailableReason ? 'viewer.actions.copyLinkUnavailableForWorkspaceVirtualFiles' : copyLabel
  const navigationLabel = actionsMode === 'workspace' ? 'common.actions.leaveWorkspace' : backLabel || 'common.actions.backToOriginalFile'
  const navigationIcon = actionsMode === 'workspace' ? 'leave-workspace' : 'back-to-file'
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
        showToast?.('viewer.actions.export.copiedFileLink', { variant: 'success' })
      } catch {
        showToast?.('errors.viewer.actions.copyFileLink', { variant: 'error' })
      }
    })()
  }

  const onOpenExplorerSettings = () => {
    void (async () => {
      try {
        await openExplorerSettings()
      } catch {
        showToast?.('errors.popup.openSettings', { variant: 'error' })
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
    ...(actionsMode !== 'hidden' ? [{
      key: 'open-folder', label: openFolderLabel, disabled: buttonState.openFolderDisabled,
      icon: <AppIcon name="folder-select" size={16} className="mdp-explorer__context-command-icon" />,
      onClick: () => onOpenAnotherFolder?.()
    }] : []),
    {
      key: 'copy-link', label: copyLabel, ariaLabel: copyTooltip,
      tooltip: copyUnavailableReason ? copyTooltip : undefined, disabled: !canCopyCurrentFile,
      copied: copyLinkCopied, icon: <IconSwap name="link" size={16} swapped={copyLinkCopied} className="mdp-explorer__context-command-icon" />,
      onClick: onCopyCurrentFile
    },
    ...(!buttonState.leaveWorkspaceHidden || !buttonState.backHidden ? [{
      key: 'navigate', label: navigationLabel, disabled: navigationDisabled,
      icon: <IconSwap name="back-to-file" alternate="leave-workspace" swapped={navigationIcon === 'leave-workspace'} size={16} className="mdp-explorer__back-icon" />,
      onClick: onContextNavigate
    }] : [])
  ]

  return (
    <div className="mdp-panel-header mdp-explorer__header">
      <div className="mdp-panel-header__row" ref={summaryRef}>
        <div className="mdp-panel-header__heading-main" ref={badgeRef}>
          <strong className="mdp-panel-header__heading">{t('viewer.explorer.title')}</strong>
          {isWorkspace ? <span className="mdp-explorer__badge mdp-explorer__badge--workspace">{t('viewer.explorer.workspace')}</span> : null}
        </div>
        <div className="mdp-explorer__header-actions">
          {!detailsExpanded ? <ExplorerContextActions commands={commands} layout={{ ...layout, reservedCount: 1 }} fallbackFocusRef={disclosureRef} /> : null}
          <IconButton
            ref={disclosureRef}
            className="mdp-explorer__context-command mdp-explorer__details-toggle"
            tooltip={t(detailsLabel)}
            aria-label={t(detailsLabel)}
            aria-expanded={detailsExpanded}
            aria-controls={detailsId}
            onClick={onToggleDetails}
          >
            <AppIcon name="file-details" size={16} className={`mdp-explorer__details-icon${detailsExpanded ? ' is-expanded' : ''}`} />
          </IconButton>
        </div>
      </div>
      <DetailsRegion id={detailsId} expanded={detailsExpanded}>
        <div className="mdp-explorer__context" aria-label={t('viewer.explorer.header.openFileDetails')}>
          <span className="mdp-explorer__context-label">{t('viewer.explorer.header.openFile')}</span>
          <div className="mdp-explorer__context-row">
            <div className="mdp-explorer__context-current" title={currentFileName || t('viewer.explorer.context.noFileSelected')}>
              <strong className="mdp-explorer__context-file">{currentFileName || t('viewer.explorer.context.noFileSelected')}</strong>
            </div>
            {detailsExpanded ? <IconButton className="mdp-explorer__context-command mdp-explorer__copy-link-btn"
                tooltip={t(copyTooltip)} aria-label={t(copyTooltip)} disabled={!canCopyCurrentFile}
                copied={copyLinkCopied} copiedClassName="is-copied" onClick={onCopyCurrentFile}>
                <IconSwap name="link" size={16} swapped={copyLinkCopied} className="mdp-explorer__context-command-icon" />
              </IconButton> : null}
          </div>
          <div className="mdp-explorer__path" title={directoryLabel} aria-label={`${t(isWorkspace ? 'viewer.explorer.header.workspaceRoot' : 'viewer.explorer.currentFolder')}: ${directoryLabel}`}>
            <span className="mdp-explorer__path-label">{directoryDisplay}</span>
          </div>
          {detailsExpanded && actionsMode !== 'hidden' ? <div className="mdp-explorer__detail-actions">
              <button type="button" className="mdp-explorer__folder-btn mdp-button" aria-label={t(openFolderLabel)}
                disabled={buttonState.openFolderDisabled} onClick={() => onOpenAnotherFolder?.()}>
                <AppIcon name="folder-select" size={16} className="mdp-explorer__context-command-icon" />
                <span>{t(openFolderLabel)}</span>
              </button>
              {!buttonState.leaveWorkspaceHidden || !buttonState.backHidden ? <button type="button" className="mdp-explorer__back-btn mdp-button" aria-label={t(navigationLabel)}
                  disabled={navigationDisabled} onClick={onContextNavigate}>
                  <IconSwap name="back-to-file" alternate="leave-workspace" swapped={navigationIcon === 'leave-workspace'} size={16} className="mdp-explorer__back-icon" />
                  <span className="mdp-explorer__back-label">{t(navigationLabel)}</span>
                </button> : null}
            </div> : null}
        </div>
      </DetailsRegion>
      {filesContext?.warningLine ? <div className="mdp-explorer__context-warning mdp-explorer__persistent-notice" role="note">{t(filesContext.warningLine)}</div> : null}
      {depthNotice ? <div className="mdp-explorer__depth-notice mdp-explorer__persistent-notice" role="note">
          <span>{t(depthNotice)}</span>{' '}
          <span role="link" tabIndex={0} className="mdp-explorer__settings-link" onClick={onOpenExplorerSettings} onKeyDown={onExplorerSettingsKeyDown}>{t('viewer.explorer.header.adjustScanLimitsInSettings')}</span>{t('viewer.explorer.header.thenRefresh')}</div> : null}
    </div>
  )
}
