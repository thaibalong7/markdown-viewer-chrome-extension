import React from 'react'
import { APPLICATION_ICONS } from '../icons/application-icons.js'
import { IconShapes } from './IconShapes.jsx'

/** Decorative glyph; its enclosing control owns the accessible name and hit target. */
export function AppIcon({ name, size = 18, ...props }) {
  const iconName = Object.hasOwn(APPLICATION_ICONS, name) ? name : 'info'
  const icon = APPLICATION_ICONS[iconName]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" data-mdp-icon={iconName} data-mdp-family="app" {...props}>
      <IconShapes elements={icon.elements} />
    </svg>
  )
}
