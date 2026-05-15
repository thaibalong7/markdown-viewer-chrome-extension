import React from 'react'

/**
 * @param {object} props
 * @param {number} props.line - 1-based line number
 * @param {number} props.col - 1-based column number
 * @param {number} props.wordCount
 * @param {'saved' | 'modified' | 'saving'} props.saveStatus
 */
export function StatusBar({ line = 1, col = 1, wordCount = 0, saveStatus = 'saved' }) {
  const saveLabel =
    saveStatus === 'saving'
      ? 'Saving\u2026'
      : saveStatus === 'modified'
        ? 'Modified'
        : 'Saved'

  return (
    <div className="mdp-status-bar" role="status" aria-live="polite" aria-atomic="true">
      <span className="mdp-status-bar__item">
        Ln {line}, Col {col}
      </span>
      <span className="mdp-status-bar__sep" aria-hidden="true" />
      <span className="mdp-status-bar__item">
        {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
      </span>
      <span className="mdp-status-bar__sep" aria-hidden="true" />
      <span
        className={`mdp-status-bar__item mdp-status-bar__save mdp-status-bar__save--${saveStatus}`}
      >
        {saveLabel}
      </span>
    </div>
  )
}
