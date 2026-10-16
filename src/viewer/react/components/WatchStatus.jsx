import { t, translateMessage } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Badge } from '../../../shared/react/Badge.jsx'
import { Button } from '../../../shared/react/Button.jsx'
import { Notice } from '../../../shared/react/Notice.jsx'
import { AppIcon } from '../../../shared/react/AppIcon.jsx'
import { CheckUpdatesIcon } from './icons/CheckUpdatesIcon.jsx'
import { DocumentApplyIcon } from './icons/DocumentApplyIcon.jsx'
import { DocumentUpdatesIcon } from './icons/DocumentUpdatesIcon.jsx'
import { IconButton } from './common/IconButton.jsx'
import { Tooltip } from './Tooltip.jsx'
import { useDismissableLayer } from '../hooks/useDismissableLayer.js'
import { useWatchUpdateFeedback } from '../hooks/useWatchUpdateFeedback.js'
import { EditorUpdateConfirmation, EditorUpdateWarning } from './EditorUpdateConfirmation.jsx'

const UPDATE_NOTICE_DURATION_MS = 5200

export function getWatchMessage(state, isEditMode) {
  if (!state.supported) return 'viewer.updates.selectTheWorkspaceAgainToCheckForUpdated'
  if (state.error) return state.error
  if (state.pending) {
    if (isEditMode) return 'viewer.updates.fileChangedOnDiskLoadItToLeave'
    if (state.mode === 'auto') {
      return state.deferred
        ? 'viewer.updates.anUpdateIsReadyItWillLoadWhen'
        : 'viewer.updates.latestStableVersionIsBeingAppliedAutomatically'
    }
    if (state.deferred) return 'viewer.updates.anUpdateIsReadyItWillLoadWhen'
    return 'viewer.updates.aNewerVersionOfThisDocumentIsReady'
  }
  return state.mode === 'off' ? 'viewer.updates.automaticChecksArePaused'
    : state.mode === 'auto' ? 'viewer.updates.updatesLoadWhenTheFileIsStableAnd'
      : 'viewer.updates.newVersionsWaitUntilYouChooseToUpdate'
}

export function getWatchTriggerPresentation(state, isEditMode) {
  const appliesOnClick = Boolean(
    state.supported && state.pending && !state.error && !isEditMode &&
    (state.mode !== 'auto' || state.deferred)
  )
  if (appliesOnClick) return { action: 'apply', label: 'viewer.review.updateDocument' }
  if (state.error) return { action: 'details', label: 'viewer.updates.documentUpdatesCheckFailed' }
  if (state.pending && isEditMode) return { action: 'details', label: 'viewer.updates.documentUpdatesLoadUpdate' }
  if (!state.supported) return { action: 'details', label: 'viewer.updates.documentUpdatesLiveWatchUnavailable' }
  return { action: 'details', label: 'viewer.updates.title' }
}

function getWatchVisualPhase(state, feedbackPhase, appliesOnClick) {
  if (state.error) return 'error'
  if (feedbackPhase === 'busy') return 'busy'
  if (!state.supported) return 'warning'
  if (feedbackPhase === 'success' && !state.pending) return 'success'
  return appliesOnClick ? 'ready' : 'idle'
}

export function WatchStatus({ state = {}, isEditMode, editorDirty, onCheck, onApply, disabled = false, dismissSignal }) {
  useLocale()
  const [open, setOpen] = useState(false)
  const [confirmingApply, setConfirmingApply] = useState(false)
  const presentation = getWatchTriggerPresentation(state, isEditMode)
  const appliesOnClick = presentation.action === 'apply'
  const [noticeVisible, setNoticeVisible] = useState(() => appliesOnClick)
  const [noticePaused, setNoticePaused] = useState(false)
  const previousAppliesOnClickRef = useRef(appliesOnClick)
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const applyButtonRef = useRef(null)
  const feedback = useWatchUpdateFeedback(state, isEditMode)
  const visualPhase = getWatchVisualPhase(state, feedback.phase, appliesOnClick)
  const visuallyBusy = visualPhase === 'busy'
  const updateBusy = visuallyBusy || state.manualChecking
  const triggerBusy = visuallyBusy || (appliesOnClick && state.manualChecking)
  const triggerLabel = t(visuallyBusy ? 'viewer.updates.updatingLabel'
    : visualPhase === 'success' ? 'viewer.updates.notifications.documentUpdated' : presentation.label)
  const panelId = useId()
  const editorWarningId = useId()
  const close = useCallback(() => setOpen(false), [])
  useDismissableLayer({ open: open && !confirmingApply, layerRef: wrapRef, onDismiss: close, restoreFocusRef: triggerRef, preventEscapeDefault: true, dismissOnFocusOutside: true })
  useEffect(() => {
    if (!state.available) setOpen(false)
  }, [state.available])
  useEffect(() => {
    if (disabled || dismissSignal) setOpen(false)
  }, [disabled, dismissSignal])
  useEffect(() => {
    if (!isEditMode || !state.pending) setConfirmingApply(false)
  }, [isEditMode, state.pending])
  useEffect(() => {
    if (open) panelRef.current?.focus?.()
  }, [open])
  useEffect(() => {
    if (appliesOnClick && !previousAppliesOnClickRef.current && !open) setNoticeVisible(true)
    if (!appliesOnClick || open) {
      setNoticeVisible(false)
      setNoticePaused(false)
    }
    previousAppliesOnClickRef.current = appliesOnClick
  }, [appliesOnClick, open])
  useEffect(() => {
    if (!noticeVisible || noticePaused) return undefined
    const timer = setTimeout(() => setNoticeVisible(false), UPDATE_NOTICE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [noticePaused, noticeVisible])
  if (!state.available) return null
  const showNotice = noticeVisible && !disabled
  const attention = Boolean(state.pending || state.error || !state.supported)
  const modeLabel = state.mode === 'off' ? 'common.watchModes.off' : state.mode === 'auto' ? 'viewer.updates.automatic' : 'viewer.updates.ask'
  const modeVariant = state.mode === 'off' ? 'warning' : state.mode === 'auto' ? 'success' : 'info'
  const message = getWatchMessage(state, isEditMode)
  const editorUpdatePending = Boolean(state.supported && state.pending && isEditMode)
  const showPendingAction = Boolean(
    state.supported && state.pending &&
    (state.mode !== 'auto' || state.deferred || isEditMode)
  )
  const applyUpdate = (options) => {
    if (updateBusy) return
    if (appliesOnClick && state.mode !== 'auto') feedback.start()
    setNoticeVisible(false)
    setNoticePaused(false)
    setConfirmingApply(false)
    close()
    onApply?.(options)
  }
  const requestApply = () => {
    if (isEditMode) setConfirmingApply(true)
    else applyUpdate()
  }
  const handleTriggerClick = () => {
    if (appliesOnClick) applyUpdate()
    else setOpen((value) => !value)
  }
  return (
    <>
    <div className="mdp-watch-status" ref={wrapRef} data-mdp-watch-open={open ? 'true' : 'false'}>
      {/* Keep the animated button mounted when checking disables it. */}
      <Tooltip content={triggerLabel} suppressed={showNotice}>
        <span className="mdp-icon-button-tooltip-anchor">
          <IconButton
            ref={triggerRef}
            className={`mdp-fab-btn mdp-watch-status__trigger${attention ? ' mdp-watch-status__trigger--attention' : ''}`}
            aria-label={triggerLabel}
            aria-haspopup={appliesOnClick ? undefined : 'dialog'}
            aria-expanded={appliesOnClick ? undefined : open}
            aria-controls={appliesOnClick ? undefined : panelId}
            data-mdp-watch-action={presentation.action}
            data-mdp-watch-phase={visualPhase}
            aria-busy={triggerBusy || undefined}
            disabled={disabled || triggerBusy}
            onClick={handleTriggerClick}
          >
            <span className="mdp-fab-btn__icon mdp-watch-status__icon-swap">
              <DocumentUpdatesIcon data-icon-visible={['idle', 'error', 'warning'].includes(visualPhase)} className="mdp-watch-status__icon mdp-watch-status__icon--details" />
              <DocumentApplyIcon data-icon-visible={visualPhase === 'ready'} className="mdp-watch-status__icon mdp-watch-status__icon--apply" />
              <span className="mdp-watch-status__icon mdp-watch-status__icon--busy" aria-hidden="true"><CheckUpdatesIcon data-icon-visible={false} /></span>
              <AppIcon name="check" data-icon-visible={visualPhase === 'success'} className="mdp-watch-status__icon mdp-watch-status__icon--success" />
            </span>
          </IconButton>
        </span>
      </Tooltip>
      {showNotice && (
        <button
          type="button"
          className="mdp-watch-status__notice"
          onClick={() => applyUpdate()}
          disabled={state.manualChecking}
          onFocus={() => setNoticePaused(true)}
          onBlur={() => setNoticePaused(false)}
          onMouseEnter={() => setNoticePaused(true)}
          onMouseLeave={() => setNoticePaused(false)}
        >
          <strong>{t('viewer.updates.newVersionAvailable')}</strong>
          <span>{t('viewer.updates.updateNow')}</span>
        </button>
      )}
      <span className="mdp-watch-status__announcement" role="status" aria-live="polite" aria-atomic="true">
        {visuallyBusy ? t('viewer.updates.updatingAnnouncement') : visualPhase === 'success' ? t('viewer.updates.documentUpdated') : state.error ? t('viewer.updates.documentUpdateCheckFailedOpenDocumentUpdatesTo') : state.pending && state.mode === 'auto' && !isEditMode ? state.deferred ? t('viewer.updates.aNewDocumentVersionWillLoadAutomaticallyWhen') : t('viewer.updates.applyingANewDocumentVersionAutomatically') : state.pending ? t('viewer.updates.aNewDocumentVersionIsAvailable') : ''}
      </span>
      <section
        ref={panelRef}
        id={panelId}
        className={`mdp-ui-card mdp-watch-status__panel${showPendingAction ? ' mdp-watch-status__panel--has-actions' : ''}${editorUpdatePending ? ' mdp-watch-status__panel--editor-update' : ''}`}
        hidden={!open}
        role="dialog"
        aria-label={t('viewer.updates.title')}
        tabIndex={-1}
      >
        <header className="mdp-watch-status__header">
          <div className="mdp-watch-status__heading">
            <h3>{t('viewer.updates.title')}</h3>
            {state.supported && (
              <Badge variant={modeVariant} className="mdp-watch-status__mode">{t(modeLabel)}</Badge>
            )}
          </div>
          {state.supported && (
            <div className="mdp-watch-status__header-actions" aria-busy={state.manualChecking || undefined}>
              <IconButton
                className={`mdp-fab-btn mdp-watch-status__check${state.error ? ' mdp-watch-status__check--error' : ''}`}
                tooltip={state.error ? t('common.actions.retry') : t('viewer.updates.checkNow')}
                aria-label={state.error ? t('common.actions.retry') : t('viewer.updates.checkNow')}
                disabled={state.manualChecking}
                onClick={onCheck}
              >
                <CheckUpdatesIcon />
              </IconButton>
            </div>
          )}
        </header>
        {!editorUpdatePending && (state.error || !state.supported
          ? <Notice variant={state.error ? 'danger' : 'warning'} className="mdp-watch-status__message"
            title={state.error ? t('viewer.review.updateCheckFailed') : t('viewer.updates.liveUpdatesUnavailable')}>{translateMessage(message)}</Notice>
          : <p className="mdp-watch-status__message">{translateMessage(message)}</p>)}
        {editorUpdatePending && <EditorUpdateWarning id={editorWarningId} dirty={editorDirty} compact />}
        {showPendingAction && (
          <div className="mdp-watch-status__actions" aria-busy={state.manualChecking || undefined}>
            <Button ref={applyButtonRef} variant="primary" disabled={updateBusy} onClick={requestApply}
              aria-describedby={editorUpdatePending ? editorWarningId : undefined}>
              {isEditMode ? t('viewer.review.loadDiskVersion') : state.mode === 'auto' ? t('viewer.updates.updateNow') : t('viewer.review.updateDocument')}
            </Button>
          </div>
        )}
      </section>
    </div>
      <EditorUpdateConfirmation open={confirmingApply} dirty={editorDirty} busy={state.manualChecking}
        returnFocusRef={applyButtonRef} onCancel={() => setConfirmingApply(false)}
        onConfirm={() => applyUpdate({ editorExitConfirmed: true })} />
    </>
  )
}
