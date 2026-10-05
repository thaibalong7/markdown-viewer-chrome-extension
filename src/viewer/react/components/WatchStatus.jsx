import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Badge } from '../../../shared/react/Badge.jsx'
import { Button } from '../../../shared/react/Button.jsx'
import { Notice } from '../../../shared/react/Notice.jsx'
import { CheckUpdatesIcon } from './icons/CheckUpdatesIcon.jsx'
import { DocumentApplyIcon } from './icons/DocumentApplyIcon.jsx'
import { DocumentUpdatesIcon } from './icons/DocumentUpdatesIcon.jsx'
import { IconButton } from './common/IconButton.jsx'
import { useDismissableLayer } from '../hooks/useDismissableLayer.js'
import { EditorUpdateConfirmation, EditorUpdateWarning } from './EditorUpdateConfirmation.jsx'

const UPDATE_NOTICE_DURATION_MS = 5200

export function getWatchMessage(state, isEditMode) {
  if (!state.supported) return 'Select the workspace again to check for updated files.'
  if (state.error) return state.error
  if (state.pending) {
    if (isEditMode) return 'This file changed on disk. Load it to leave edit mode.'
    if (state.mode === 'auto') {
      return state.deferred
        ? 'An update is ready. It will load when the file is stable and you stop interacting.'
        : 'The latest stable version is being applied automatically.'
    }
    if (state.deferred) return 'An update is ready. It will load when the file is stable and you stop interacting.'
    return 'A newer version of this document is ready.'
  }
  return state.mode === 'off' ? 'Automatic checks are paused.'
    : state.mode === 'auto' ? 'Updates load when the file is stable and you stop interacting.'
      : 'New versions wait until you choose to update.'
}

export function getWatchTriggerPresentation(state, isEditMode) {
  const appliesOnClick = Boolean(
    state.supported && state.pending && !state.error && !isEditMode &&
    (state.mode !== 'auto' || state.deferred)
  )
  if (appliesOnClick) return { action: 'apply', label: 'Update document' }
  if (state.error) return { action: 'details', label: 'Document updates: check failed' }
  if (state.pending && isEditMode) return { action: 'details', label: 'Document updates: load update' }
  if (!state.supported) return { action: 'details', label: 'Document updates: live watch unavailable' }
  return { action: 'details', label: 'Document updates' }
}

export function WatchStatus({ state = {}, isEditMode, editorDirty, onCheck, onApply }) {
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
  const panelId = useId()
  const editorWarningId = useId()
  const close = useCallback(() => setOpen(false), [])
  useDismissableLayer({ open: open && !confirmingApply, layerRef: wrapRef, onDismiss: close, restoreFocusRef: triggerRef, preventEscapeDefault: true })
  useEffect(() => {
    if (!state.available) setOpen(false)
  }, [state.available])
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
  const attention = Boolean(state.pending || state.error || !state.supported)
  const indicator = state.error ? 'error' : !state.supported ? 'warning' : 'pending'
  const modeLabel = state.mode === 'off' ? 'Off' : state.mode === 'auto' ? 'Automatic' : 'Ask'
  const modeVariant = state.mode === 'off' ? 'warning' : state.mode === 'auto' ? 'success' : 'info'
  const message = getWatchMessage(state, isEditMode)
  const editorUpdatePending = Boolean(state.supported && state.pending && isEditMode)
  const showPendingAction = Boolean(
    state.supported && state.pending &&
    (state.mode !== 'auto' || state.deferred || isEditMode)
  )
  const applyUpdate = (options) => {
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
      <IconButton
        ref={triggerRef}
        className={`mdp-fab-btn mdp-watch-status__trigger${attention ? ` mdp-watch-status__trigger--attention mdp-watch-status__trigger--${indicator}` : ''}`}
        tooltip={presentation.label}
        aria-label={presentation.label}
        aria-haspopup={appliesOnClick ? undefined : 'dialog'}
        aria-expanded={appliesOnClick ? undefined : open}
        aria-controls={appliesOnClick ? undefined : panelId}
        data-mdp-watch-action={presentation.action}
        disabled={appliesOnClick && state.manualChecking}
        onClick={handleTriggerClick}
      >
        <span className={`mdp-fab-btn__icon mdp-watch-status__icon-swap${appliesOnClick ? ' is-apply' : ''}`}>
          <DocumentUpdatesIcon className="mdp-watch-status__icon mdp-watch-status__icon--details" />
          <DocumentApplyIcon className="mdp-watch-status__icon mdp-watch-status__icon--apply" />
        </span>
      </IconButton>
      {noticeVisible && (
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
          <strong>New version available</strong>
          <span>Update now</span>
        </button>
      )}
      <span className="mdp-watch-status__announcement" role="status" aria-live="polite" aria-atomic="true">
        {state.error ? 'Document update check failed. Open Document updates to retry.'
          : state.pending && state.mode === 'auto' && !isEditMode
            ? state.deferred
              ? 'A new document version will load automatically when you stop interacting.'
              : 'Applying a new document version automatically.'
            : state.pending ? 'A new document version is available.' : ''}
      </span>
      <section
        ref={panelRef}
        id={panelId}
        className={`mdp-ui-card mdp-watch-status__panel${showPendingAction ? ' mdp-watch-status__panel--has-actions' : ''}${editorUpdatePending ? ' mdp-watch-status__panel--editor-update' : ''}`}
        hidden={!open}
        role="dialog"
        aria-label="Document updates"
        tabIndex={-1}
      >
        <header className="mdp-watch-status__header">
          <div className="mdp-watch-status__heading">
            <h3>Document updates</h3>
            {state.supported && (
              <Badge variant={modeVariant} className="mdp-watch-status__mode">{modeLabel}</Badge>
            )}
          </div>
          {state.supported && (
            <div className="mdp-watch-status__header-actions" aria-busy={state.manualChecking || undefined}>
              <IconButton
                className={`mdp-fab-btn mdp-watch-status__check${state.error ? ' mdp-watch-status__check--error' : ''}`}
                tooltip={state.error ? 'Try again' : 'Check now'}
                aria-label={state.error ? 'Try again' : 'Check now'}
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
            title={state.error ? 'Update check failed' : 'Live updates unavailable'}>{message}</Notice>
          : <p className="mdp-watch-status__message">{message}</p>)}
        {editorUpdatePending && <EditorUpdateWarning id={editorWarningId} dirty={editorDirty} compact />}
        {showPendingAction && (
          <div className="mdp-watch-status__actions" aria-busy={state.manualChecking || undefined}>
            <Button ref={applyButtonRef} variant="primary" disabled={state.manualChecking} onClick={requestApply}
              aria-describedby={editorUpdatePending ? editorWarningId : undefined}>
              {isEditMode ? 'Load disk version…' : state.mode === 'auto' ? 'Update now' : 'Update document'}
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
