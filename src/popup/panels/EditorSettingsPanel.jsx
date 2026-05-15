import React from 'react'
import { DEFAULT_EDITOR_SETTINGS } from '../../shared/constants/editor.js'

/**
 * @param {{ settings: object, onPatch: (partial: object) => void }} props
 */
export function EditorSettingsPanel({ settings, onPatch }) {
  const editor = {
    ...DEFAULT_EDITOR_SETTINGS,
    ...(settings.editor || {})
  }

  return (
    <>
      <label className="popup-field">
        <span className="popup-label">Editor font size (px)</span>
        <input
          className="popup-input"
          type="number"
          min="12"
          max="24"
          step="1"
          value={Number(editor.fontSize || DEFAULT_EDITOR_SETTINGS.fontSize)}
          onChange={(event) =>
            onPatch({
              editor: {
                fontSize: Number(event.target.value) || DEFAULT_EDITOR_SETTINGS.fontSize
              }
            })
          }
        />
      </label>

      <label className="popup-field">
        <span className="popup-label">Tab size</span>
        <input
          className="popup-input"
          type="number"
          min="2"
          max="8"
          step="1"
          value={Number(editor.tabSize || DEFAULT_EDITOR_SETTINGS.tabSize)}
          onChange={(event) =>
            onPatch({
              editor: {
                tabSize: Number(event.target.value) || DEFAULT_EDITOR_SETTINGS.tabSize
              }
            })
          }
        />
      </label>

      <label className="popup-field popup-field-inline">
        <input
          type="checkbox"
          checked={editor.wordWrap !== false}
          onChange={(event) =>
            onPatch({
              editor: {
                wordWrap: event.target.checked
              }
            })
          }
        />
        <span className="popup-label">Word wrap</span>
      </label>

      <label className="popup-field popup-field-inline">
        <input
          type="checkbox"
          checked={editor.lineNumbers !== false}
          onChange={(event) =>
            onPatch({
              editor: {
                lineNumbers: event.target.checked
              }
            })
          }
        />
        <span className="popup-label">Line numbers</span>
      </label>

      <div className="popup-actions">
        <button
          type="button"
          className="popup-button popup-button-danger"
          onClick={() => {
            const ok = window.confirm('Reset editor settings to default values?')
            if (!ok) return
            void onPatch({ editor: { ...DEFAULT_EDITOR_SETTINGS } })
          }}
        >
          Reset editor settings
        </button>
      </div>
    </>
  )
}
