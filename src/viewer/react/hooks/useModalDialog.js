import { useEffect, useRef } from 'react'

export function bindModalDialog(dialog, initialFocus, returnFocus, onDismiss) {
  if (!dialog) return undefined
  const previousFocus = returnFocus || dialog.ownerDocument.activeElement
  const onCancel = (event) => {
    event.preventDefault()
    onDismiss()
  }
  const onPointerDown = (event) => {
    if (event.target === dialog) onDismiss()
  }
  dialog.addEventListener('cancel', onCancel)
  dialog.addEventListener('pointerdown', onPointerDown)
  // Native modality keeps the rest of the Viewer inert and contains keyboard focus.
  dialog.showModal()
  initialFocus?.focus({ preventScroll: true })

  return () => {
    dialog.removeEventListener('cancel', onCancel)
    dialog.removeEventListener('pointerdown', onPointerDown)
    if (dialog.open) dialog.close()
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
  }
}

export function useModalDialog({ open, dialogRef, initialFocusRef, returnFocusRef, onDismiss }) {
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss
  useEffect(() => {
    if (!open) return undefined
    return bindModalDialog(
      dialogRef.current,
      initialFocusRef?.current,
      returnFocusRef?.current,
      () => onDismissRef.current?.()
    )
  }, [open, dialogRef, initialFocusRef, returnFocusRef])
}
