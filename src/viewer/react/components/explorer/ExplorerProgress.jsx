import { t } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import React from 'react'
import { Spinner } from '../../../../shared/react/LoadingState.jsx'

export function ExplorerProgress({ headline, text, showCancel, onCancel }) {
  useLocale()
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
        <span>{t(headline)}</span>
      </div>
      <div className="mdp-explorer__progress-text">{t(text)}</div>
      <button
        type="button"
        className="mdp-explorer__progress-cancel mdp-button"
        hidden={!showCancel}
        onClick={() => onCancel?.()}
      >{t('common.actions.cancel')}</button>
    </div>
  )
}
