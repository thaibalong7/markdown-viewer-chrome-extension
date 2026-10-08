import React, { useId, useRef } from 'react'
import { Badge } from '../../../shared/react/Badge.jsx'
import { Button } from '../../../shared/react/Button.jsx'
import { ModalDialog } from './common/ModalDialog.jsx'

export function ExitEditConfirmation({ open, busy = false, returnFocusRef, onCancel, onConfirm }) {
  const cancelRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  return (
    <ModalDialog
      open={open}
      initialFocusRef={cancelRef}
      returnFocusRef={returnFocusRef}
      onDismiss={onCancel}
      className="mdp-exit-edit-modal"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="mdp-ui-card mdp-exit-edit-confirmation">
        <div className="mdp-exit-edit-confirmation__content">
          <Badge variant="warning">Unsaved changes</Badge>
          <h2 id={titleId}>Discard changes and exit edit mode?</h2>
          <p id={descriptionId}>
            Your unsaved changes will be lost. The saved file will stay unchanged.
          </p>
        </div>
        <div className="mdp-ui-action-footer mdp-ui-action-footer--end mdp-exit-edit-confirmation__actions">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>Keep editing</Button>
          <Button variant="danger" disabled={busy} onClick={onConfirm}>Discard changes</Button>
        </div>
      </div>
    </ModalDialog>
  )
}
