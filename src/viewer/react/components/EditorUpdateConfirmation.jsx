import { t } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React, { useId, useRef } from 'react'
import { Badge } from '../../../shared/react/Badge.jsx'
import { Button } from '../../../shared/react/Button.jsx'
import { Notice } from '../../../shared/react/Notice.jsx'
import { ModalDialog } from './common/ModalDialog.jsx'

export function getEditorUpdateCopy(dirty) {
  return dirty ? {
    tone: 'danger',
    eyebrow: 'options.themes.editor.unsavedChanges',
    title: 'viewer.editor.updateConfirmation.yourUnsavedDraftWillBeDiscarded',
    compactTitle: 'viewer.editor.updateConfirmation.unsavedDraftWillBeDiscarded',
    body: 'viewer.editor.updateConfirmation.versionOnDiskChangedOutsideMarkdownPlusLoading',
    compactBody: 'viewer.editor.updateConfirmation.loadingTheDiskVersionPermanentlyReplacesYourDraft',
    confirmLabel: 'viewer.editor.updateConfirmation.discardDraftAndLoadDiskVersion'
  } : {
    tone: 'warning',
    eyebrow: 'viewer.editor.updateConfirmation.editModeWillClose',
    title: 'viewer.editor.updateConfirmation.loadingThisUpdateWillCloseEditMode',
    compactTitle: 'viewer.editor.updateConfirmation.editModeWillClose',
    body: 'viewer.editor.updateConfirmation.latestVersionIsAlreadyOnDiskMarkdownPlus',
    compactBody: 'viewer.editor.updateConfirmation.loadingTheDiskVersionClosesTheEditorAnd',
    confirmLabel: 'viewer.editor.updateConfirmation.exitEditModeAndLoadDiskVersion'
  }
}

export function EditorUpdateWarning({ dirty = false, compact = false, id }) {
  useLocale()
  const copy = getEditorUpdateCopy(dirty)
  return <Notice id={id} variant={copy.tone} title={compact ? t(copy.compactTitle) : t(copy.title)}
    className={`mdp-editor-update-warning${compact ? ' mdp-editor-update-warning--compact' : ''}`} role="alert">
    <p>{compact ? t(copy.compactBody) : t(copy.body)}</p>
  </Notice>
}

export function EditorUpdateConfirmation({ open, dirty = false, busy = false, returnFocusRef, onCancel, onConfirm }) {
  useLocale()
  const cancelRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  const copy = getEditorUpdateCopy(dirty)
  return <ModalDialog open={open} initialFocusRef={cancelRef} returnFocusRef={returnFocusRef}
    onDismiss={() => { if (!busy) onCancel?.() }} className="mdp-editor-update-confirmation-backdrop"
    role="alertdialog" aria-labelledby={titleId} aria-describedby={descriptionId}>
    <div className="mdp-ui-card mdp-editor-update-confirmation">
      <div className="mdp-editor-update-confirmation__content">
        <Badge variant={dirty ? 'danger' : 'warning'} className="mdp-editor-update-confirmation__badge">{t(copy.eyebrow)}</Badge>
        <h2 id={titleId}>{t(copy.title)}</h2>
        <p id={descriptionId}>{t(copy.body)}</p>
        <Notice className="mdp-editor-update-confirmation__note">{t('viewer.editor.updateConfirmation.externalUpdateIsAlreadySavedOnDiskThis')}</Notice>
      </div>
      <div className="mdp-ui-action-footer mdp-ui-action-footer--end mdp-editor-update-confirmation__actions">
        <Button ref={cancelRef} variant="quiet" disabled={busy} onClick={onCancel}>{t('viewer.editor.keepEditing')}</Button>
        <Button variant={dirty ? 'danger' : 'primary'} busy={busy} busyLabel={t('viewer.editor.updateConfirmation.loadingDiskVersion')} onClick={onConfirm}>
          {t(copy.confirmLabel)}
        </Button>
      </div>
    </div>
  </ModalDialog>
}
