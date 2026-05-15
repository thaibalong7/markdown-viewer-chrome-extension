import React from 'react'
import { fileHistoryDirectoryFromUrl, fileHistoryTitleFromUrl } from '../../shared/file-history.js'

function formatOpenedAt(openedAt) {
  const date = new Date(Number(openedAt))
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

/**
 * @param {{
 *   history: Array<{ url: string, title?: string, openedAt?: number }>,
 *   loading: boolean,
 *   busyUrl: string,
 *   errorMessage: string,
 *   onOpen: (url: string) => void,
 *   onClear: () => void
 * }} props
 */
export function FileHistoryPanel({ history, loading, busyUrl, errorMessage, onOpen, onClear }) {
  if (loading) {
    return <div className="popup-muted">Loading recent files...</div>
  }

  if (!history.length) {
    return (
      <div className="popup-empty-state">
        <p className="popup-empty-state__title">No recent files yet</p>
        <p className="popup-empty-state__copy">
          Open local Markdown files with Markdown Plus and they will appear here.
        </p>
        {errorMessage ? <div className="popup-error-inline">{errorMessage}</div> : null}
      </div>
    )
  }

  return (
    <div className="popup-history-panel">
      <div className="popup-history-actions">
        <span className="popup-muted">{history.length} recent file{history.length === 1 ? '' : 's'}</span>
        <button type="button" className="popup-button" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="popup-history-list">
        {history.map((entry) => {
          const title = entry.title || fileHistoryTitleFromUrl(entry.url)
          const directory = fileHistoryDirectoryFromUrl(entry.url)
          const openedAt = formatOpenedAt(entry.openedAt)
          const isBusy = busyUrl === entry.url

          return (
            <button
              key={entry.url}
              type="button"
              className="popup-history-item"
              onClick={() => onOpen(entry.url)}
              disabled={isBusy}
              title={entry.url}
            >
              <span className="popup-history-item__main">
                <span className="popup-history-item__title">{isBusy ? 'Opening...' : title}</span>
                <span className="popup-history-item__path">{directory}</span>
              </span>
              {openedAt ? <span className="popup-history-item__time">{openedAt}</span> : null}
            </button>
          )
        })}
      </div>

      {errorMessage ? <div className="popup-error-inline">{errorMessage}</div> : null}
    </div>
  )
}
