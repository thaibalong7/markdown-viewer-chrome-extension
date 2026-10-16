import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'

export function Spinner() {
  return (
    <span
      className="mdp-ui-spinner"
      aria-hidden="true"
    />
  )
}

export function LoadingState({
  label,
  className = ''
}) {
  useLocale()
  return (
    <div
      className={`mdp-ui-loading-state ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner />
      <span>{t(label)}</span>
    </div>
  )
}
