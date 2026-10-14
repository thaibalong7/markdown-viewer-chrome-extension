import React from 'react'
import { AppIcon } from '../../../shared/react/AppIcon.jsx'
import { IconSwap } from './common/IconSwap.jsx'

const pairs = { theme: ['moon', 'sun'], copy: ['link', 'check'], edit: ['edit', 'check'], 'view-mode': ['source', 'reader'] }

export function DocumentActionIcon({ action, className = '' }) {
  const pair = pairs[action.id]
  if (!pair) return <AppIcon name={action.icon} className={`${className} ${action.iconClassName || ''}`} />
  return <IconSwap name={pair[0]} alternate={pair[1]} swapped={action.icon === pair[1]}
    className={`${className} ${action.iconClassName || ''}`} />
}
