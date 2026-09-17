import React from 'react'

const NOTICE_VARIANTS = new Set(['info', 'success', 'warning', 'danger'])

export function Notice({ variant = 'info', title, className = '', children, ...props }) {
  const resolvedVariant = NOTICE_VARIANTS.has(variant) ? variant : 'info'
  const variantClass = resolvedVariant === 'info' ? '' : `mdp-ui-notice--${resolvedVariant}`

  return (
    <div
      {...props}
      className={['mdp-ui-notice', variantClass, className].filter(Boolean).join(' ')}
    >
      {title ? <strong>{title}</strong> : null}
      {children}
    </div>
  )
}
