import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'
import { BUILT_IN_THEMES, EDITABLE_THEME_COLOR_FIELDS } from '../../theme/index.js'

function colorPickerValue(value, fallback = '#000000') {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback
}

export function ThemeColorFields({ draft, disabled, onChange }) {
  useLocale()
  return (
    <div className="settings-theme-color-grid">
      {EDITABLE_THEME_COLOR_FIELDS.map((field) => (
        <label key={field.key} className="settings-theme-color-field">
          <span>{t(field.labelKey)}</span>
          <span className="settings-theme-color-field__control">
            <input
              type="color"
              aria-label={t('options.themes.colors.valueColorPicker', { 0: t(field.labelKey) })}
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
              aria-label={t('options.themes.colors.valueHexValue', { 0: t(field.labelKey) })}
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
