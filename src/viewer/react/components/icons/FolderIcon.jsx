import React from 'react'
import { FileTypeIcon } from '../../../../shared/react/FileTypeIcon.jsx'

export function FolderIcon({ expanded = false, ...props }) {
  return <FileTypeIcon name={expanded ? 'folder-open' : 'folder'} {...props} />
}
