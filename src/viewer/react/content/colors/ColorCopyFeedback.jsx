import React from 'react'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'

export function ColorCopyStatus({ text }) {
  return <span className="mdp-color-source-status" role="status" aria-live="polite">{text}</span>
}

export function ColorCopyFeedback({ point, leaving, feedbackRef }) {
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
        <span>Copied</span>
      </span>
    </span>
  )
}
