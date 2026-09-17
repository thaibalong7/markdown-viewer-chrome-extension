import React from 'react'
import { Spinner } from './LoadingState.jsx'

const BUTTON_VARIANTS = new Set(['secondary', 'primary', 'quiet', 'danger'])

export function Button({
  variant = 'secondary',
  busy = false,
  busyLabel,
  className = '',
  disabled = false,
  children,
  type = 'button',
  ...props
}) {
  const resolvedVariant = BUTTON_VARIANTS.has(variant) ? variant : 'secondary'
  const classes = [
    'mdp-ui-button',
    `mdp-ui-button--${resolvedVariant}`,
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      {...props}
      type={type}
      className={classes}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy ? <Spinner /> : null}
      <span>{busy && busyLabel ? busyLabel : children}</span>
    </button>
  )
}
