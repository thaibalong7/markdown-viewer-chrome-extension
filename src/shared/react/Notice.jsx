import { translateMessage } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'

const NOTICE_VARIANTS = new Set(['info', 'success', 'warning', 'danger'])

export function Notice({ variant = 'info', title, className = '', children, ...props }) {
  useLocale()
  const resolvedVariant = NOTICE_VARIANTS.has(variant) ? variant : 'info'
  const variantClass = resolvedVariant === 'info' ? '' : `mdp-ui-notice--${resolvedVariant}`

  return (
    <div
      {...props}
      className={['mdp-ui-notice', variantClass, className].filter(Boolean).join(' ')}
    >
      {title ? <strong>{translateMessage(title)}</strong> : null}
      {translateMessage(children)}
    </div>
  )
}
