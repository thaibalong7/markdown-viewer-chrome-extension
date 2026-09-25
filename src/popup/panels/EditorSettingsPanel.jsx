import React from 'react'
import { DEFAULT_EDITOR_SETTINGS } from '../../shared/constants/editor.js'
import { Button } from '../../shared/react/Button.jsx'
import { NumberField } from '../../shared/react/NumberField.jsx'
import { Switch } from '../../shared/react/Switch.jsx'
import { Notice } from '../../shared/react/Notice.jsx'

/**
 * @param {{ settings: object, saving?: boolean, onPatch: (partial: object) => void, onImmediatePatch: (partial: object) => Promise<unknown> }} props
 */
export function EditorSettingsPanel({ settings, saving = false, onPatch, onImmediatePatch }) {
  const editor = {
    ...DEFAULT_EDITOR_SETTINGS,
    ...(settings.editor || {})
  }
  const editorEnabled = editor.enabled === true

  return (
    <>
      <Notice variant="warning" title="Experimental editor" className="popup-editor-notice">
        Editing is off by default. When enabled, Markdown Plus will ask you to connect the exact
        original file before an edit session starts.
      </Notice>

      <div className="popup-setting-row popup-setting-row--feature">
        <div>
          <span className="popup-setting-row__label">Enable editor</span>
          <p className="popup-setting-row__description">Opt in to editing local Markdown files.</p>
        </div>
        <Switch
          id="popup-editor-enabled"
          label="Enable experimental editor"
          checked={editorEnabled}
          disabled={saving}
          onChange={(event) => {
            void onImmediatePatch({ editor: { enabled: event.target.checked } })
          }}
        />
      </div>

      <div className={`popup-editor-preferences${editorEnabled ? '' : ' is-disabled'}`}>
      <NumberField
        id="popup-editor-font-size"
        label="Editor font size"
        rangeLabel="12–24 px"
        min="12"
        max="24"
        step="1"
        value={Number(editor.fontSize || DEFAULT_EDITOR_SETTINGS.fontSize)}
        disabled={!editorEnabled}
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
        disabled={!editorEnabled}
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
          disabled={!editorEnabled}
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
          disabled={!editorEnabled}
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
          disabled={!editorEnabled}
          onClick={() => {
            const ok = window.confirm('Reset editor preferences to default values?')
            if (!ok) return
            void onPatch({
              editor: {
                fontSize: DEFAULT_EDITOR_SETTINGS.fontSize,
                tabSize: DEFAULT_EDITOR_SETTINGS.tabSize,
                wordWrap: DEFAULT_EDITOR_SETTINGS.wordWrap,
                lineNumbers: DEFAULT_EDITOR_SETTINGS.lineNumbers
              }
            })
          }}
        >
          Reset editor preferences
        </Button>
      </div>
      </div>
    </>
  )
}
