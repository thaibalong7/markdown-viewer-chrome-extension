import React from 'react'

export function ExplorerProgress({ headline, text, showCancel, onCancel }) {
  return (
    <div className="mdp-explorer__progress">
      <div className="mdp-explorer__progress-headline">{headline}</div>
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
