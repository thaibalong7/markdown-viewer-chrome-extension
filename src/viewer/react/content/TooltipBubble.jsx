import { t } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React from 'react'

export function TooltipBubble({ text, tooltipRef, style }) {
  useLocale()
  return <div ref={tooltipRef} className="mdp-tooltip" role="tooltip" style={style}>{t(text)}</div>
}
