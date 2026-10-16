import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React, { useMemo, useState } from 'react'
import { Button } from '../../shared/react/Button.jsx'
import {
  BUILT_IN_THEME_LABEL_KEYS,
  createCustomThemeDraft,
  getThemeOptions,
  MAX_CUSTOM_THEMES,
  resolveActiveTheme,
  resolveThemeById
} from '../../theme/index.js'
import { ThemeEditor } from './ThemeEditor.jsx'

function backgroundLabel(background = {}) {
  if (background.type === 'solid') return 'options.themes.library.solidBackground'
  if (background.type === 'gradient') return 'options.themes.library.gradientBackground'
  if (background.type === 'image') return 'options.themes.library.localImageBackground'
  return 'options.themes.library.themeColorBackground'
}

function ThemeSwatches({ colors }) {
  const swatches = [colors.background, colors.surface, colors.link, colors.accent]
  return (
    <span className="settings-theme-card__swatches" aria-hidden="true">
      {swatches.map((color, index) => (
        <i key={`${color}-${index}`} style={{ backgroundColor: color }} />
      ))}
    </span>
  )
}

function ThemeCard({ theme, settings, disabled, onActivate, onDelete, onEdit }) {
  useLocale()
  const resolved = resolveThemeById(settings, theme.id)
  const active = settings.theme.activeId === theme.id
  return (
    <article className={`settings-theme-card${active ? ' is-active' : ''}`}>
      <div className="settings-theme-card__visual">
        <ThemeSwatches colors={resolved.colors} />
      </div>
      <div className="settings-theme-card__content">
        <div className="settings-theme-card__title-row">
          <h3>{theme.name}</h3>
          {active ? <span className="settings-theme-card__active">{t('common.status.active')}</span> : null}
        </div>
        <p>{t('options.themes.preview.base')}{' '}{t(BUILT_IN_THEME_LABEL_KEYS[theme.baseId] || theme.baseId)}
          <span aria-hidden="true"> · </span>
          {t(backgroundLabel(theme.background))}
        </p>
      </div>
      <div className="settings-theme-card__actions">
        {!active ? <Button variant="quiet" disabled={disabled} onClick={() => onActivate(theme.id)}>{t('options.themes.library.useTheme')}</Button> : null}
        <Button disabled={disabled} onClick={() => onEdit(theme)}>{t('common.actions.edit')}</Button>
        <Button variant="danger" disabled={disabled} onClick={() => onDelete(theme)}>{t('common.actions.delete')}</Button>
      </div>
    </article>
  )
}

export function ThemeSettings({
  settings,
  busyAction,
  onActiveThemeChange,
  onSaveTheme,
  onDeleteTheme
}) {
  useLocale()
  const options = useMemo(() => getThemeOptions(settings), [settings])
  const [editorTheme, setEditorTheme] = useState(null)
  const saving = busyAction !== ''
  const customThemes = settings.theme.customThemes
  const atThemeLimit = customThemes.length >= MAX_CUSTOM_THEMES

  function createTheme() {
    if (atThemeLimit) return
    const activeTheme = resolveActiveTheme(settings)
    setEditorTheme(createCustomThemeDraft(activeTheme.baseId, t('options.themes.library.myTheme')))
  }

  async function deleteTheme(theme) {
    const activeMessage = settings.theme.activeId === theme.id
      ? t('options.themes.library.itIsActiveSoValueWillBecomeActive', { 0: t(BUILT_IN_THEME_LABEL_KEYS[theme.baseId] || theme.baseId) })
      : ''
    if (!window.confirm(t('options.themes.library.deleteValueThisCannotBeUndoneValue', { 0: theme.name, 1: activeMessage }))) return
    await onDeleteTheme(theme.id)
  }

  if (editorTheme) {
    return (
      <ThemeEditor
        key={editorTheme.id}
        settings={settings}
        initialTheme={editorTheme}
        busyAction={busyAction}
        onCancel={() => setEditorTheme(null)}
        onSave={onSaveTheme}
      />
    )
  }

  return (
    <section className="settings-section settings-section--themes" aria-labelledby="themes-title">
      <div className="settings-section__heading settings-theme-library__heading">
        <div>
          <p className="settings-eyebrow">{t('options.themes.library.appearance')}</p>
          <h2 id="themes-title">{t('options.themes.title')}</h2>
          <p>{t('options.themes.library.chooseTheReaderThemeInUseThenManage')}</p>
        </div>
        <Button variant="primary" disabled={saving || atThemeLimit} onClick={createTheme}>{t('options.themes.library.addCustomTheme')}</Button>
      </div>

      <div className="mdp-ui-card settings-theme-active-card">
        <div className="settings-theme-active-card__copy">
          <strong>{t('options.themes.library.activeReaderTheme')}</strong>
          <span>{t('options.themes.library.selectionIsAlsoShownInTheExtensionPopup')}</span>
        </div>
        <div className="mdp-ui-field">
          <label className="mdp-ui-visually-hidden" htmlFor="settings-active-theme">{t('options.themes.library.activeTheme')}</label>
          <select
            id="settings-active-theme"
            className="mdp-ui-select"
            value={settings.theme.activeId}
            disabled={saving}
            onChange={(event) => void onActiveThemeChange(event.target.value)}
          >
            <optgroup label={t('options.themes.library.builtInThemes')}>
              {options.builtIn.map((theme) => (
                <option key={theme.id} value={theme.id}>{t(theme.nameKey || theme.name)}</option>
              ))}
            </optgroup>
            {options.custom.length ? <optgroup label={t('options.themes.library.myThemes')}>
                {options.custom.map((theme) => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </optgroup> : null}
          </select>
        </div>
      </div>

      <div className="settings-theme-library">
        <div className="settings-theme-library__summary">
          <div>
            <h3>{t('options.themes.library.myThemes')}</h3>
            <p>{t('options.themes.library.customThemesCanBeSelectedInBothSettings')}</p>
          </div>
          <span>{customThemes.length} / {MAX_CUSTOM_THEMES}</span>
        </div>

        {customThemes.length ? <div className="settings-theme-list">
            {customThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                settings={settings}
                disabled={saving}
                onActivate={(themeId) => void onActiveThemeChange(themeId)}
                onEdit={setEditorTheme}
                onDelete={(selectedTheme) => void deleteTheme(selectedTheme)}
              />
            ))}
          </div> : <div className="mdp-ui-card settings-theme-library__empty">
            <div className="settings-theme-library__empty-visual" aria-hidden="true">
              <i /><i /><i />
            </div>
            <div>
              <strong>{t('options.themes.library.noCustomThemesYet')}</strong>
              <p>{t('options.themes.library.createOneFromYourActiveThemeThenAdjust')}</p>
            </div>
            <Button variant="primary" disabled={saving} onClick={createTheme}>{t('options.themes.library.createYourFirstTheme')}</Button>
          </div>}

        {atThemeLimit ? <p className="settings-theme-library__limit" role="status">{t('options.themes.library.youHaveReachedTheLimitOf')}{' '}{MAX_CUSTOM_THEMES}{' '}{t('options.themes.library.customThemesDeleteOneBeforeCreatingAnother')}</p> : null}
      </div>
    </section>
  )
}
