import { t, translateMessage } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import React from 'react'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'

export function ColorCopyStatus({ text }) {
  useLocale()
  return <span className="mdp-color-source-status" role="status" aria-live="polite">{translateMessage(text)}</span>
}

export function ColorCopyFeedback({ point, leaving, feedbackRef }) {
  useLocale()
  return (
    <span
      ref={feedbackRef}
      className={`mdp-color-copy-feedback${leaving ? ' is-leaving' : ''}`}
      aria-hidden="true"
      style={{ left: point.x, top: point.y }}
    >
      <span className="mdp-color-copy-feedback__pulse" />
      <span className="mdp-color-copy-feedback__label">
        <AppIcon name="check" size={14} />
        <span>{t('common.status.copied')}</span>
      </span>
    </span>
  )
}
