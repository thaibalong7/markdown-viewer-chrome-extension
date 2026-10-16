import { t, translateMessage } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'
import { Button } from '../../shared/react/Button.jsx'
import { Notice } from '../../shared/react/Notice.jsx'

const CONTENT = {
  checking: {
    variant: 'info',
    title: 'popup.fileAccess.checkingFileAccess',
    message: 'popup.fileAccess.confirmingWhetherMarkdownPlusCanOpenLocalFiles'
  },
  allowed: {
    variant: 'success',
    title: 'popup.fileAccess.fileAccessIsReady'
  },
  blocked: {
    variant: 'warning',
    title: 'popup.fileAccess.allowAccessToLocalFiles'
  },
  unavailable: {
    variant: 'danger',
    title: 'popup.fileAccess.fileAccessStatusUnavailable'
  }
}

export function FileAccessCallout({ state, errorMessage = '', onOpenDetails }) {
  useLocale()
  const content = CONTENT[state] || CONTENT.unavailable
  const showAction = state === 'blocked' || state === 'unavailable'

  return (
    <Notice
      variant={content.variant}
      title={t(content.title)}
      className={`popup-file-access popup-file-access--${state}`}
      role={state === 'blocked' || state === 'unavailable' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {showAction ? <ol>
          <li>{t('popup.fileAccess.openChromeExtensions')}</li>
          <li>{t('popup.fileAccess.selectMarkdownPlusDetails')}</li>
          <li>{t('popup.fileAccess.enableAllowAccessToFileURLs')}</li>
        </ol> : content.message ? <p>{t(content.message)}</p> : null}
      {errorMessage ? <p className="popup-file-access__error">{translateMessage(errorMessage)}</p> : null}
      {showAction ? <Button variant="secondary" onClick={onOpenDetails}>{t('common.actions.openExtensionDetails')}</Button> : null}
    </Notice>
  )
}
