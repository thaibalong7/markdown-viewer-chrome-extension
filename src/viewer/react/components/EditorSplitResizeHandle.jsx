import { t } from '../../../i18n/index.js'
import { useLocale } from '../../../i18n/react.js'
import React from 'react'
import { useEditorSplitResize } from '../hooks/useEditorSplitResize.js'
import { Tooltip } from './Tooltip.jsx'

export function EditorSplitResizeHandle({
  rootEl,
  editorEl,
  previewEl,
  handleEl,
  setHandleEl
}) {
  useLocale()
  useEditorSplitResize({ rootEl, editorEl, previewEl, handleEl })

  return (
    <Tooltip
      pointerPlacement
      content={t('viewer.editor.resizeHandle.dragToResizeTheEditorAndPreviewWhen')}
    >
      <div
        className="mdp-editor-split__resize-handle"
        role="separator"
        aria-label={t('viewer.editor.resizeHandle.resizeEditorAndPreview')}
        aria-orientation="vertical"
        aria-valuemin="240"
        tabIndex={0}
        ref={setHandleEl}
      />
    </Tooltip>
  )
}
