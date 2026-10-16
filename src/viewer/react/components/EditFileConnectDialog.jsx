import { t } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../../shared/react/Button.jsx'

export function EditFileConnectDialog({ open, busy, filePath, onCancel, onConfirm }) {
  useLocale()
  const dialogRef = useRef(null)
  const cancelButtonRef = useRef(null)
  const busyRef = useRef(busy)
  const onCancelRef = useRef(onCancel)
  busyRef.current = busy
  onCancelRef.current = onCancel

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    cancelButtonRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault()
        onCancelRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll('button:not(:disabled)') || []
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [open])

  if (!open) return null

  const dialog = (
    <div
      className="mdp-editor-connect-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel?.()
      }}
    >
      <section
        ref={dialogRef}
        className="mdp-editor-connect-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mdp-editor-connect-title"
        aria-describedby="mdp-editor-connect-description"
      >
        <p className="mdp-editor-connect-dialog__eyebrow">{t('viewer.editor.connectDialog.safeEditing')}</p>
        <h2 id="mdp-editor-connect-title">{t('viewer.editor.connectDialog.connectTheOriginalFileBeforeEditing')}</h2>
        <p id="mdp-editor-connect-description">{t('viewer.editor.connectDialog.chromeDoesNotAutomaticallyGrantWriteAccessFrom')}</p>

        <div className="mdp-editor-connect-dialog__target">
          <span>{t('viewer.editor.connectDialog.currentFile')}</span>
          <code title={filePath}>{filePath || t('viewer.editor.connectDialog.unknownLocalFile')}</code>
        </div>

        <ol>
          <li>{t('viewer.editor.connectDialog.chooseThisExactFileInChromeSPicker')}</li>
          <li>{t('viewer.editor.connectDialog.checkBothItsFolderAndFilenameDoNot')}</li>
          <li>{t('viewer.editor.connectDialog.useSaveOrCtrlCmdSToWrite')}</li>
        </ol>

        <div className="mdp-editor-connect-dialog__actions">
          <Button ref={cancelButtonRef} variant="secondary" disabled={busy} onClick={onCancel}>{t('common.actions.cancel')}</Button>
          <Button
            variant="primary"
            busy={busy}
            busyLabel={t('viewer.editor.connectDialog.verifyingFile')}
            onClick={onConfirm}
          >{t('viewer.editor.connectDialog.verifyFileAndEdit')}</Button>
        </div>
      </section>
    </div>
  )

  const portalTarget = typeof document !== 'undefined'
    ? document.querySelector('#mdp-viewer-root .mdp-root')
    : null
  return portalTarget ? createPortal(dialog, portalTarget) : dialog
}
