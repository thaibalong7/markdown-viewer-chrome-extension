import { t } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import React from 'react'

export function PanelHeader({ title, meta, action, className = '', children }) {
  useLocale()
  const classNames = ['mdp-panel-header', className].filter(Boolean).join(' ')

  return (
    <div className={classNames}>
      <div className="mdp-panel-header__row">
        <div className="mdp-panel-header__heading-main">
          <strong className="mdp-panel-header__heading">{t(title)}</strong>
          {meta ? <span className="mdp-panel-header__meta">{meta}</span> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
