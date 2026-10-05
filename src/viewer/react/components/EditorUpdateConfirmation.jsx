import React, { useId, useRef } from 'react'
import { Badge } from '../../../shared/react/Badge.jsx'
import { Button } from '../../../shared/react/Button.jsx'
import { Notice } from '../../../shared/react/Notice.jsx'
import { ModalDialog } from './common/ModalDialog.jsx'

export function getEditorUpdateCopy(dirty) {
  return dirty ? {
    tone: 'danger',
    eyebrow: 'Unsaved changes',
    title: 'Your unsaved draft will be discarded',
    compactTitle: 'Unsaved draft will be discarded',
    body: 'The version on disk changed outside Markdown Plus. Loading it will permanently replace your editor draft and close edit mode.',
    compactBody: 'Loading the disk version permanently replaces your draft and closes the editor.',
    confirmLabel: 'Discard draft and load disk version'
  } : {
    tone: 'warning',
    eyebrow: 'Edit mode will close',
    title: 'Loading this update will close edit mode',
    compactTitle: 'Edit mode will close',
    body: 'The latest version is already on disk. Markdown Plus will close the editor and reload that version.',
    compactBody: 'Loading the disk version closes the editor and reloads the file.',
    confirmLabel: 'Exit edit mode and load disk version'
  }
}

export function EditorUpdateWarning({ dirty = false, compact = false, id }) {
  const copy = getEditorUpdateCopy(dirty)
  return <Notice id={id} variant={copy.tone} title={compact ? copy.compactTitle : copy.title}
    className={`mdp-editor-update-warning${compact ? ' mdp-editor-update-warning--compact' : ''}`} role="alert">
    <p>{compact ? copy.compactBody : copy.body}</p>
  </Notice>
}

export function EditorUpdateConfirmation({ open, dirty = false, busy = false, returnFocusRef, onCancel, onConfirm }) {
  const cancelRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  const copy = getEditorUpdateCopy(dirty)
  return <ModalDialog open={open} initialFocusRef={cancelRef} returnFocusRef={returnFocusRef}
    onDismiss={() => { if (!busy) onCancel?.() }} className="mdp-editor-update-confirmation-backdrop"
    role="alertdialog" aria-labelledby={titleId} aria-describedby={descriptionId}>
    <div className="mdp-ui-card mdp-editor-update-confirmation">
      <div className="mdp-editor-update-confirmation__content">
        <Badge variant={dirty ? 'danger' : 'warning'} className="mdp-editor-update-confirmation__badge">{copy.eyebrow}</Badge>
        <h2 id={titleId}>{copy.title}</h2>
        <p id={descriptionId}>{copy.body}</p>
        <Notice className="mdp-editor-update-confirmation__note">
          The external update is already saved on disk. This action only changes what is open in Markdown Plus.
        </Notice>
      </div>
      <div className="mdp-ui-action-footer mdp-ui-action-footer--end mdp-editor-update-confirmation__actions">
        <Button ref={cancelRef} variant="quiet" disabled={busy} onClick={onCancel}>Keep editing</Button>
        <Button variant={dirty ? 'danger' : 'primary'} busy={busy} busyLabel="Loading disk version…" onClick={onConfirm}>
          {copy.confirmLabel}
        </Button>
      </div>
    </div>
  </ModalDialog>
}
