import React from 'react'
import { useToast } from '../contexts/ToastContext.jsx'

export function Toast() {
  const { toastMessage, isVisible } = useToast()

  return (
    <div className={`mdp-toast${isVisible ? ' is-visible' : ''}`} role="status" aria-live="polite">
      {toastMessage}
    </div>
  )
}
