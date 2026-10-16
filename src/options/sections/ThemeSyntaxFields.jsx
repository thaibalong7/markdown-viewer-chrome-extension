import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'
import {
  SYNTAX_THEME_DEFINITIONS,
  getSyntaxThemeDefinition,
  getSyntaxThemeIdForBaseTheme
} from '../../theme/index.js'

const COLOR_SCHEMES = Object.freeze([
  Object.freeze({ id: 'light', label: 'options.themes.syntax.lightThemes' }),
  Object.freeze({ id: 'dark', label: 'options.themes.syntax.darkThemes' })
])

export function ThemeSyntaxFields({ draft, disabled, onChange }) {
  useLocale()
  const inheritedThemeId = getSyntaxThemeIdForBaseTheme(draft.baseId)
  const inheritedTheme = getSyntaxThemeDefinition(inheritedThemeId)

  return (
    <label className="mdp-ui-field settings-theme-syntax-field">
      <span className="mdp-ui-field__label">{t('options.themes.syntax.renderedCodeTheme')}</span>
      <select
        className="mdp-ui-select"
        value={draft.syntaxThemeId || ''}
        disabled={disabled}
        aria-describedby="theme-syntax-helper"
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">{t('options.themes.syntax.followBaseTheme')}{inheritedTheme?.name || inheritedThemeId})</option>
        {COLOR_SCHEMES.map(({ id, label }) => (
          <optgroup key={id} label={t(label)}>
            {SYNTAX_THEME_DEFINITIONS
              .filter(({ colorScheme }) => colorScheme === id)
              .map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
          </optgroup>
        ))}
      </select>
      <span id="theme-syntax-helper" className="mdp-ui-field__helper">{t('options.themes.syntax.appliesToRenderedFencedCodeAndSQLDocuments')}</span>
    </label>
  )
}
