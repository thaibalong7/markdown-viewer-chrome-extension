import React from 'react'
import {
  Document,
  Drawio,
  Image,
  Markdown,
  SVG as Svg,
  Text
} from '@react-symbols/icons/files'

const FILE_ICONS = {
  diagram: Drawio,
  document: Markdown,
  image: Image,
  text: Text,
  'vector-image': Svg
}

export function FileIcon({ className = '', kind = 'document' }) {
  const Icon = FILE_ICONS[kind] || Document

  return <Icon className={className} aria-hidden="true" focusable="false" />
}
