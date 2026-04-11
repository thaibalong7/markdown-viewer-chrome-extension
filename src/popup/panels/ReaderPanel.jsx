import React from 'react'
import { BUILT_IN_THEMES } from '../../theme/index.js'
import { Tooltip } from '../components/Tooltip.jsx'
import {
  createReaderUiDefaultsPatch,
  FONT_FAMILY_PRESETS,
  THEME_LABELS
} from '../settings-constants.js'

/**
 * @param {{ settings: object, onPatch: (partial: object) => void }} props
 */
export function ReaderPanel({ settings, onPatch }) {
  return (
    <>
      <label className="popup-field">
        <span className="popup-label">Theme</span>
        <select
          className="popup-input"
          value={settings.theme?.preset || 'light'}
          onChange={(event) =>
            onPatch({
              theme: { preset: event.target.value }
            })
          }
        >
          {Object.keys(BUILT_IN_THEMES).map((preset) => (
            <option key={preset} value={preset}>
              {THEME_LABELS[preset] || preset}
            </option>
          ))}
        </select>
      </label>

      <label className="popup-field">
        <span className="popup-label">Font family</span>
        <Tooltip
          content="Uses fonts installed on your system. Presets list several fallbacks if the first choice is missing."
        >
          <select
            className="popup-input"
            value={settings.typography?.fontFamily || FONT_FAMILY_PRESETS[0].value}
            onChange={(event) =>
              onPatch({
                typography: {
                  fontFamily: event.target.value
                }
              })
            }
          >
            {FONT_FAMILY_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </Tooltip>
      </label>

      <label className="popup-field">
        <span className="popup-label">Font size (px)</span>
        <input
          className="popup-input"
          type="number"
          min="12"
          max="28"
          step="1"
          value={Number(settings.typography?.fontSize || 16)}
          onChange={(event) =>
            onPatch({
              typography: {
                fontSize: Number(event.target.value) || 16
              }
            })
          }
        />
      </label>

      <label className="popup-field">
        <span className="popup-label">Line height</span>
        <Tooltip content="Unitless line-spacing multiplier (e.g. 1.7 ≈ 170% of font size). Not pixels.">
          <input
            className="popup-input"
            type="number"
            min="1.2"
            max="2.2"
            step="0.1"
            value={Number(settings.typography?.lineHeight || 1.7)}
            onChange={(event) =>
              onPatch({
                typography: {
                  lineHeight: Number(event.target.value) || 1.7
                }
              })
            }
          />
        </Tooltip>
      </label>

      <label className="popup-field">
        <span className="popup-label">Content width (px)</span>
        <input
          className="popup-input"
          type="number"
          min="640"
          max="1400"
          step="10"
          value={Number(settings.layout?.contentMaxWidth || 980)}
          onChange={(event) =>
            onPatch({
              layout: {
                contentMaxWidth: Number(event.target.value) || 980
              }
            })
          }
        />
      </label>

      <label className="popup-field popup-field-inline">
        <input
          type="checkbox"
          checked={settings.layout?.showToc !== false}
          onChange={(event) =>
            onPatch({
              layout: {
                showToc: event.target.checked
              }
            })
          }
        />
        <span className="popup-label">Show table of contents</span>
      </label>

      <div className="popup-actions">
        <button
          type="button"
          className="popup-button popup-button-danger"
          onClick={() => {
            const ok = window.confirm('Reset reader UI settings to default values?')
            if (!ok) return
            void onPatch(createReaderUiDefaultsPatch())
          }}
        >
          Reset reader UI
        </button>
      </div>
    </>
  )
}
