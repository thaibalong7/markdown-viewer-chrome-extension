import React from 'react'
import {
  SYNTAX_THEME_DEFINITIONS,
  getSyntaxThemeDefinition,
  getSyntaxThemeIdForBaseTheme
} from '../../theme/index.js'

const COLOR_SCHEMES = Object.freeze([
  Object.freeze({ id: 'light', label: 'Light themes' }),
  Object.freeze({ id: 'dark', label: 'Dark themes' })
])

export function ThemeSyntaxFields({ draft, disabled, onChange }) {
  const inheritedThemeId = getSyntaxThemeIdForBaseTheme(draft.baseId)
  const inheritedTheme = getSyntaxThemeDefinition(inheritedThemeId)

  return (
    <label className="mdp-ui-field settings-theme-syntax-field">
      <span className="mdp-ui-field__label">Rendered code theme</span>
      <select
        className="mdp-ui-select"
        value={draft.syntaxThemeId || ''}
        disabled={disabled}
        aria-describedby="theme-syntax-helper"
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Follow base theme ({inheritedTheme?.name || inheritedThemeId})</option>
        {COLOR_SCHEMES.map(({ id, label }) => (
          <optgroup key={id} label={label}>
            {SYNTAX_THEME_DEFINITIONS
              .filter(({ colorScheme }) => colorScheme === id)
              .map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
          </optgroup>
        ))}
      </select>
      <span id="theme-syntax-helper" className="mdp-ui-field__helper">
        Applies to rendered fenced code and SQL documents. The Markdown editor keeps its own highlighting.
      </span>
    </label>
  )
}
