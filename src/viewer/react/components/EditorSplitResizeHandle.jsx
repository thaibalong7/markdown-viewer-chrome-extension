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
  useEditorSplitResize({ rootEl, editorEl, previewEl, handleEl })

  return (
    <Tooltip
      pointerPlacement
      content="Drag to resize the editor and preview. When focused, use Left/Right Arrow keys (16px per step)."
    >
      <div
        className="mdp-editor-split__resize-handle"
        role="separator"
        aria-label="Resize editor and preview"
        aria-orientation="vertical"
        aria-valuemin="240"
        tabIndex={0}
        ref={setHandleEl}
      />
    </Tooltip>
  )
}
