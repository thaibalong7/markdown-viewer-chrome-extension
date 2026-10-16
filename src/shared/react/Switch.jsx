import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'

export function Switch({ label, className = '', id, ...inputProps }) {
  useLocale()
  return (
    <label className={`mdp-ui-switch ${className}`.trim()} htmlFor={id}>
      <span className="mdp-ui-visually-hidden">{t(label)}</span>
      <input {...inputProps} id={id} type="checkbox" />
      <span className="mdp-ui-switch__track" aria-hidden="true" />
    </label>
  )
}
