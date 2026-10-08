import React from 'react'
import { APPLICATION_ICONS } from '../icons/application-icons.js'
import { IconShapes } from './IconShapes.jsx'

/** Decorative glyph; its enclosing control owns the accessible name and hit target. */
export function AppIcon({ name, size = 18, ...props }) {
  const icon = Object.hasOwn(APPLICATION_ICONS, name) ? APPLICATION_ICONS[name] : APPLICATION_ICONS.info
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" {...props}>
      <IconShapes elements={icon.elements} />
    </svg>
  )
}
