import React from 'react'
import { FileTypeIcon } from '../../../../shared/react/FileTypeIcon.jsx'

const FILE_ICONS = {
  database: 'database', diagram: 'diagram', document: 'markdown',
  image: 'image', text: 'text', 'vector-image': 'vector'
}

export function FileIcon({ kind = 'document', ...props }) {
  return <FileTypeIcon name={FILE_ICONS[kind] || 'text'} {...props} />
}
