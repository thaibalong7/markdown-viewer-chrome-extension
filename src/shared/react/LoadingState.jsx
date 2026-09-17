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
  return (
    <div
      className={`mdp-ui-loading-state ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner />
      <span>{label}</span>
    </div>
  )
}
