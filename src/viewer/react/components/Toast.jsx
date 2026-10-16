import { translateMessage } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React from 'react'
import { useToast } from '../contexts/ToastContext.jsx'

export function Toast() {
  useLocale()
  const { toastMessage, toastVariant, isVisible } = useToast()
  const variantClass = `mdp-toast--${toastVariant || 'info'}`

  return (
    <div
      className={`mdp-toast ${variantClass}${isVisible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {translateMessage(toastMessage)}
    </div>
  )
}
