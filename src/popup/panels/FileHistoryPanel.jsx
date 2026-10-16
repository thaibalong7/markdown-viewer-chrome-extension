import { getLocale, t, translateMessage } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'
import { fileHistoryDirectoryFromUrl, fileHistoryTitleFromUrl } from '../../shared/file-history.js'
import { Button } from '../../shared/react/Button.jsx'
import { LoadingState } from '../../shared/react/LoadingState.jsx'

function formatOpenedAt(openedAt) {
  const date = new Date(Number(openedAt))
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(getLocale(), {
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
  useLocale()
  if (loading) {
    return <LoadingState label={t('popup.history.loadingRecentFiles')} />
  }

  if (!history.length) {
    return (
      <div className="mdp-ui-state">
        <strong className="mdp-ui-state__title">{t('popup.history.noRecentFilesYet')}</strong>
        <p className="mdp-ui-state__message">{t('popup.history.openLocalMarkdownFilesWithMarkdownPlusAnd')}</p>
        {errorMessage ? <div className="popup-error-inline">{translateMessage(errorMessage)}</div> : null}
      </div>
    )
  }

  return (
    <div className="popup-history-panel">
      <div className="popup-history-actions">
        <span className="popup-muted">{t('popup.history.fileCount', { count: history.length })}</span>
        <Button variant="quiet" onClick={onClear}>{t('common.actions.clear')}</Button>
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
                <span className="popup-history-item__title">{isBusy ? t('popup.history.opening') : title}</span>
                <span className="popup-history-item__path">{directory}</span>
              </span>
              {openedAt ? <span className="popup-history-item__time">{openedAt}</span> : null}
            </button>
          )
        })}
      </div>

      {errorMessage ? <div className="popup-error-inline">{translateMessage(errorMessage)}</div> : null}
    </div>
  )
}
