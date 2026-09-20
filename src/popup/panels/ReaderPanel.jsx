import React from 'react'
import { Button } from '../../shared/react/Button.jsx'
import { NumberField } from '../../shared/react/NumberField.jsx'
import { Switch } from '../../shared/react/Switch.jsx'
import { BUILT_IN_THEMES } from '../../theme/index.js'
import { Tooltip } from '../components/Tooltip.jsx'
import {
  createReaderUiDefaultsPatch,
  FONT_FAMILY_PRESETS,
  THEME_LABELS
} from '../settings-constants.js'

function InfoTooltip({ label, content }) {
  return (
    <Tooltip content={content}>
      <button type="button" className="popup-info-button" aria-label={label}>
        i
      </button>
    </Tooltip>
  )
}

/**
 * @param {{ settings: object, onPatch: (partial: object) => void }} props
 */
export function ReaderPanel({ settings, onPatch }) {
  return (
    <>
      <fieldset className="popup-theme-picker">
        <legend className="mdp-ui-field__label">Theme</legend>
        <div className="popup-theme-options">
          {Object.keys(BUILT_IN_THEMES).map((preset) => {
            const selected = (settings.theme?.preset || 'light') === preset
            return (
              <label
                key={preset}
                className={`popup-theme-option ${selected ? 'is-selected' : ''}`}
                data-theme={preset}
              >
                <input
                  type="radio"
                  name="popup-reader-theme"
                  value={preset}
                  checked={selected}
                  onChange={(event) =>
                    onPatch({
                      theme: { preset: event.target.value }
                    })
                  }
                />
                <span className="popup-theme-option__swatch" aria-hidden="true">
                  <span />
                </span>
                <span className="popup-theme-option__label">{THEME_LABELS[preset] || preset}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="mdp-ui-field">
        <div className="mdp-ui-field__label-row">
          <label className="mdp-ui-field__label" htmlFor="reader-font-family">
            Font family
          </label>
          <InfoTooltip
            label="About font family"
            content="Uses fonts installed on your system. Presets list several fallbacks if the first choice is missing."
          />
        </div>
        <select
          id="reader-font-family"
          className="mdp-ui-select"
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
      </div>

      <NumberField
        id="popup-reader-font-size"
        label="Font size"
        rangeLabel="12–28 px"
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

      <NumberField
        id="reader-line-height"
        label="Line height"
        labelAction={(
          <InfoTooltip
            label="About line height"
            content="Unitless line-spacing multiplier (e.g. 1.7 ≈ 170% of font size). Not pixels."
          />
        )}
        rangeLabel="1.2–2.2"
        inputMode="decimal"
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

      <NumberField
        id="popup-reader-content-width"
        label="Content width"
        rangeLabel="640–1,400 px"
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

      <div className="popup-setting-row">
        <span className="popup-setting-row__label">Show table of contents</span>
        <Switch
          id="popup-reader-show-toc"
          label="Show table of contents"
          checked={settings.layout?.showToc !== false}
          onChange={(event) =>
            onPatch({
              layout: {
                showToc: event.target.checked
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
            const ok = window.confirm('Reset reader UI settings to default values?')
            if (!ok) return
            void onPatch(createReaderUiDefaultsPatch())
          }}
        >
          Reset reader UI
        </Button>
      </div>
    </>
  )
}
