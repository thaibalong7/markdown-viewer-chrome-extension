import { formatNumber, t } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React from 'react'

/**
 * @param {object} props
 * @param {number} props.line - 1-based line number
 * @param {number} props.col - 1-based column number
 * @param {number} props.wordCount
 * @param {'saved' | 'modified' | 'saving'} props.saveStatus
 * @param {string} props.targetPath
 */
export function StatusBar({
  line = 1,
  col = 1,
  wordCount = 0,
  saveStatus = 'saved',
  targetPath = ''
}) {
  useLocale()
  const saveLabel =
    saveStatus === 'saving'
      ? 'common.status.saving'
      : saveStatus === 'modified'
        ? 'common.status.modified'
        : 'common.status.saved'

  return (
    <div className="mdp-status-bar" role="status" aria-live="polite" aria-atomic="true">
      <span className="mdp-status-bar__item">{t('viewer.editor.statusBar.ln')}{' '}{formatNumber(line)}{t('viewer.editor.statusBar.col')}{' '}{formatNumber(col)}
      </span>
      <span className="mdp-status-bar__sep" aria-hidden="true" />
      <span className="mdp-status-bar__item">
        {t('viewer.statistics.words', { count: wordCount })}
      </span>
      <span className="mdp-status-bar__sep" aria-hidden="true" />
      <span
        className={`mdp-status-bar__item mdp-status-bar__save mdp-status-bar__save--${saveStatus}`}
      >
        {t(saveLabel)}
      </span>
      {targetPath ? <span className="mdp-status-bar__target" title={targetPath}>{t('viewer.editor.statusBar.target')}{' '}{targetPath}
        </span> : null}
    </div>
  )
}
