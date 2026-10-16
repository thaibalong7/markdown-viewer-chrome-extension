import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'

const BADGE_VARIANTS = new Set(['default', 'info', 'success', 'warning', 'danger'])

export function Badge({ variant = 'default', className = '', children }) {
  useLocale()
  const resolvedVariant = BADGE_VARIANTS.has(variant) ? variant : 'default'
  const variantClass = resolvedVariant === 'default' ? '' : `mdp-ui-badge--${resolvedVariant}`

  return (
    <span className={['mdp-ui-badge', variantClass, className].filter(Boolean).join(' ')}>
      {t(children)}
    </span>
  )
}
