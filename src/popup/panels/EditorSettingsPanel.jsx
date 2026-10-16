import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
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
  useLocale()
  const editor = {
    ...DEFAULT_EDITOR_SETTINGS,
    ...(settings.editor || {})
  }
  const editorEnabled = editor.enabled === true

  return (
    <>
      <Notice variant="warning" title={t('popup.editor.experimentalEditor')} className="popup-editor-notice">{t('popup.editor.editingIsOffByDefaultWhenEnabledMarkdown')}</Notice>

      <div className="popup-setting-row popup-setting-row--feature">
        <div>
          <span className="popup-setting-row__label">{t('popup.editor.enableEditor')}</span>
          <p className="popup-setting-row__description">{t('popup.editor.optInToEditingLocalMarkdownFiles')}</p>
        </div>
        <Switch
          id="popup-editor-enabled"
          label={t('popup.editor.enableExperimentalEditor')}
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
        label={t('popup.editor.editorFontSize')}
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
        label={t('popup.editor.tabSize')}
        rangeLabel='popup.editor.tabSizeRange'
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
        <span className="popup-setting-row__label">{t('popup.editor.wordWrap')}</span>
        <Switch
          id="popup-editor-word-wrap"
          label={t('popup.editor.wordWrap')}
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
        <span className="popup-setting-row__label">{t('popup.editor.lineNumbers')}</span>
        <Switch
          id="popup-editor-line-numbers"
          label={t('popup.editor.lineNumbers')}
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
            const ok = window.confirm(t('popup.editor.resetEditorPreferencesToDefaultValues'))
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
        >{t('popup.editor.resetEditorPreferences')}</Button>
      </div>
      </div>
    </>
  )
}
