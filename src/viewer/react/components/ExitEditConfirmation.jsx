import { t } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React, { useId, useRef } from 'react'
import { Badge } from '../../../shared/react/Badge.jsx'
import { Button } from '../../../shared/react/Button.jsx'
import { ModalDialog } from './common/ModalDialog.jsx'

export function ExitEditConfirmation({ open, busy = false, returnFocusRef, onCancel, onConfirm }) {
  useLocale()
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
          <Badge variant="warning">{t('options.themes.editor.unsavedChanges')}</Badge>
          <h2 id={titleId}>{t('viewer.editor.exitConfirmation.title')}</h2>
          <p id={descriptionId}>{t('viewer.editor.exitConfirmation.yourUnsavedChangesWillBeLostTheSaved')}</p>
        </div>
        <div className="mdp-ui-action-footer mdp-ui-action-footer--end mdp-exit-edit-confirmation__actions">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>{t('viewer.editor.keepEditing')}</Button>
          <Button variant="danger" disabled={busy} onClick={onConfirm}>{t('viewer.editor.discard')}</Button>
        </div>
      </div>
    </ModalDialog>
  )
}
