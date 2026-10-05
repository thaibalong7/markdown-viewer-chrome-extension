import React, { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useModalDialog } from '../../hooks/useModalDialog.js'

/** Native modality and focus lifecycle shared by Viewer dialogs. */
export function ModalDialog({ open, initialFocusRef, returnFocusRef, onDismiss, children, ...props }) {
  const dialogRef = useRef(null)
  useModalDialog({ open, dialogRef, initialFocusRef, returnFocusRef, onDismiss })
  if (!open) return null

  const dialog = <dialog ref={dialogRef} aria-modal="true" {...props}>{children}</dialog>
  const target = returnFocusRef?.current?.closest?.('.mdp-root')
    || globalThis.document?.querySelector('#mdp-viewer-root .mdp-root')
  return target ? createPortal(dialog, target) : dialog
}
