import React from 'react'
import { Spinner } from '../../../../shared/react/LoadingState.jsx'

export function ExplorerProgress({ headline, text, showCancel, onCancel }) {
  return (
    <div
      className="mdp-explorer__progress"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mdp-explorer__progress-headline">
        <Spinner />
        <span>{headline}</span>
      </div>
      <div className="mdp-explorer__progress-text">{text}</div>
      <button
        type="button"
        className="mdp-explorer__progress-cancel mdp-button"
        hidden={!showCancel}
        onClick={() => onCancel?.()}
      >
        Cancel
      </button>
    </div>
  )
}
