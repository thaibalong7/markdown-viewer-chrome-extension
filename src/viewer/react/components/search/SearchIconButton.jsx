import React from 'react'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'
import { IconButton } from '../common/IconButton.jsx'

export function SearchIconButton({ icon, label, ...props }) {
  return <IconButton className="mdp-search__icon" tooltip={label} aria-label={label} {...props}><AppIcon name={icon} size={16} /></IconButton>
}
