import React from 'react'
import { useToast } from '../contexts/ToastContext.jsx'

export function Toast() {
  const { toastMessage, toastVariant, isVisible } = useToast()
  const variantClass = `mdp-toast--${toastVariant || 'info'}`

  return (
    <div
      className={`mdp-toast ${variantClass}${isVisible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
    >
      {toastMessage}
    </div>
  )
}
