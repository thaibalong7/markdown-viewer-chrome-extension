import React from 'react'
import { DEFAULT_EDITOR_SETTINGS } from '../../shared/constants/editor.js'
import { Button } from '../../shared/react/Button.jsx'
import { NumberField } from '../../shared/react/NumberField.jsx'
import { Switch } from '../../shared/react/Switch.jsx'

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
      <NumberField
        id="popup-editor-font-size"
        label="Editor font size"
        rangeLabel="12–24 px"
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

      <NumberField
        id="popup-editor-tab-size"
        label="Tab size"
        rangeLabel="2–8 spaces"
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

      <div className="popup-setting-row">
        <span className="popup-setting-row__label">Word wrap</span>
        <Switch
          id="popup-editor-word-wrap"
          label="Word wrap"
          checked={editor.wordWrap !== false}
          onChange={(event) =>
            onPatch({
              editor: {
                wordWrap: event.target.checked
              }
            })
          }
        />
      </div>

      <div className="popup-setting-row">
        <span className="popup-setting-row__label">Line numbers</span>
        <Switch
          id="popup-editor-line-numbers"
          label="Line numbers"
          checked={editor.lineNumbers !== false}
          onChange={(event) =>
            onPatch({
              editor: {
                lineNumbers: event.target.checked
              }
            })
          }
        />
      </div>

      <div className="popup-actions">
        <Button
          variant="danger"
          className="popup-reset-button"
          onClick={() => {
            const ok = window.confirm('Reset editor settings to default values?')
            if (!ok) return
            void onPatch({ editor: { ...DEFAULT_EDITOR_SETTINGS } })
          }}
        >
          Reset editor settings
        </Button>
      </div>
    </>
  )
}
