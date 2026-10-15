import React from 'react'
import { FILE_TYPE_ICONS } from '../icons/file-type-icons.js'
import { IconShapes } from './IconShapes.jsx'

/** Explorer hues follow the resolved theme palette, never row selection or application icon emphasis. */
export function FileTypeIcon({ name = 'markdown', size = 16, style, ...props }) {
  const icon = Object.hasOwn(FILE_TYPE_ICONS, name) ? FILE_TYPE_ICONS[name] : FILE_TYPE_ICONS.text
  const color = icon.colorToken ? `var(${icon.colorToken}, ${icon.color})` : icon.color
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      {...props} style={{ ...style, color, stroke: color, strokeWidth: 1.25 }}>
      <IconShapes elements={icon.elements} />
    </svg>
  )
}
