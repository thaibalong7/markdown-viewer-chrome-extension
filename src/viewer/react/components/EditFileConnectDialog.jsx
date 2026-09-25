import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../../shared/react/Button.jsx'

export function EditFileConnectDialog({ open, busy, filePath, onCancel, onConfirm }) {
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
        <p className="mdp-editor-connect-dialog__eyebrow">Safe editing</p>
        <h2 id="mdp-editor-connect-title">Connect the original file before editing</h2>
        <p id="mdp-editor-connect-description">
          Chrome does not automatically grant write access from a local file URL. Markdown Plus
          must verify an existing file before the editor can open.
        </p>

        <div className="mdp-editor-connect-dialog__target">
          <span>Current file</span>
          <code title={filePath}>{filePath || 'Unknown local file'}</code>
        </div>

        <ol>
          <li>Choose this exact file in Chrome’s picker.</li>
          <li>Check both its folder and filename; do not choose a copy with the same name.</li>
          <li>Use Save or Ctrl/Cmd+S to write back to the connected file.</li>
        </ol>

        <div className="mdp-editor-connect-dialog__actions">
          <Button ref={cancelButtonRef} variant="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            busy={busy}
            busyLabel="Verifying file…"
            onClick={onConfirm}
          >
            Verify file and edit
          </Button>
        </div>
      </section>
    </div>
  )

  const portalTarget = typeof document !== 'undefined'
    ? document.querySelector('#mdp-viewer-root .mdp-root')
    : null
  return portalTarget ? createPortal(dialog, portalTarget) : dialog
}
