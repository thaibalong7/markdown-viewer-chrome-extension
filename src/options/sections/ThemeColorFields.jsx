import React from 'react'
import { BUILT_IN_THEMES, EDITABLE_THEME_COLOR_FIELDS } from '../../theme/index.js'

function colorPickerValue(value, fallback = '#000000') {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback
}

export function ThemeColorFields({ draft, disabled, onChange }) {
  return (
    <div className="settings-theme-color-grid">
      {EDITABLE_THEME_COLOR_FIELDS.map((field) => (
        <label key={field.key} className="settings-theme-color-field">
          <span>{field.label}</span>
          <span className="settings-theme-color-field__control">
            <input
              type="color"
              aria-label={`${field.label} color picker`}
              value={colorPickerValue(
                draft.colors[field.key],
                BUILT_IN_THEMES[draft.baseId]?.[field.key]
              )}
              disabled={disabled}
              onChange={(event) => onChange({
                ...draft.colors,
                [field.key]: event.target.value
              })}
            />
            <input
              className="mdp-ui-input mdp-ui-input--technical"
              aria-label={`${field.label} hex value`}
              value={draft.colors[field.key]}
              maxLength="7"
              disabled={disabled}
              onChange={(event) => onChange({
                ...draft.colors,
                [field.key]: event.target.value
              })}
            />
          </span>
        </label>
      ))}
    </div>
  )
}
