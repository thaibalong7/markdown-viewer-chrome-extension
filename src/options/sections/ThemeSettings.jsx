import React, { useMemo, useState } from 'react'
import { Button } from '../../shared/react/Button.jsx'
import {
  BUILT_IN_THEME_LABELS,
  createCustomThemeDraft,
  getThemeOptions,
  MAX_CUSTOM_THEMES,
  resolveActiveTheme,
  resolveThemeById
} from '../../theme/index.js'
import { ThemeEditor } from './ThemeEditor.jsx'

function backgroundLabel(background = {}) {
  if (background.type === 'solid') return 'Solid background'
  if (background.type === 'gradient') return 'Gradient background'
  if (background.type === 'image') return 'Local image background'
  return 'Theme color background'
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
          {active ? <span className="settings-theme-card__active">Active</span> : null}
        </div>
        <p>
          Base: {BUILT_IN_THEME_LABELS[theme.baseId] || theme.baseId}
          <span aria-hidden="true"> · </span>
          {backgroundLabel(theme.background)}
        </p>
      </div>
      <div className="settings-theme-card__actions">
        {!active ? (
          <Button variant="quiet" disabled={disabled} onClick={() => onActivate(theme.id)}>
            Use theme
          </Button>
        ) : null}
        <Button disabled={disabled} onClick={() => onEdit(theme)}>Edit</Button>
        <Button variant="danger" disabled={disabled} onClick={() => onDelete(theme)}>Delete</Button>
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
  const options = useMemo(() => getThemeOptions(settings), [settings])
  const [editorTheme, setEditorTheme] = useState(null)
  const saving = busyAction !== ''
  const customThemes = settings.theme.customThemes
  const atThemeLimit = customThemes.length >= MAX_CUSTOM_THEMES

  function createTheme() {
    if (atThemeLimit) return
    const activeTheme = resolveActiveTheme(settings)
    setEditorTheme(createCustomThemeDraft(activeTheme.baseId))
  }

  async function deleteTheme(theme) {
    const activeMessage = settings.theme.activeId === theme.id
      ? ` It is active, so ${BUILT_IN_THEME_LABELS[theme.baseId] || theme.baseId} will become active instead.`
      : ''
    if (!window.confirm(`Delete “${theme.name}”? This cannot be undone.${activeMessage}`)) return
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
          <p className="settings-eyebrow">Appearance</p>
          <h2 id="themes-title">Themes</h2>
          <p>Choose the reader theme in use, then manage your reusable custom themes.</p>
        </div>
        <Button variant="primary" disabled={saving || atThemeLimit} onClick={createTheme}>
          Add custom theme
        </Button>
      </div>

      <div className="mdp-ui-card settings-theme-active-card">
        <div className="settings-theme-active-card__copy">
          <strong>Active reader theme</strong>
          <span>This selection is also shown in the extension Popup.</span>
        </div>
        <div className="mdp-ui-field">
          <label className="mdp-ui-visually-hidden" htmlFor="settings-active-theme">Active theme</label>
          <select
            id="settings-active-theme"
            className="mdp-ui-select"
            value={settings.theme.activeId}
            disabled={saving}
            onChange={(event) => void onActiveThemeChange(event.target.value)}
          >
            <optgroup label="Built-in themes">
              {options.builtIn.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
            </optgroup>
            {options.custom.length ? (
              <optgroup label="My themes">
                {options.custom.map((theme) => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </div>
      </div>

      <div className="settings-theme-library">
        <div className="settings-theme-library__summary">
          <div>
            <h3>My themes</h3>
            <p>Custom themes can be selected in both Settings and the Popup.</p>
          </div>
          <span>{customThemes.length} / {MAX_CUSTOM_THEMES}</span>
        </div>

        {customThemes.length ? (
          <div className="settings-theme-list">
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
          </div>
        ) : (
          <div className="mdp-ui-card settings-theme-library__empty">
            <div className="settings-theme-library__empty-visual" aria-hidden="true">
              <i /><i /><i />
            </div>
            <div>
              <strong>No custom themes yet</strong>
              <p>Create one from your active theme, then adjust its colors and background in Theme Studio.</p>
            </div>
            <Button variant="primary" disabled={saving} onClick={createTheme}>Create your first theme</Button>
          </div>
        )}

        {atThemeLimit ? (
          <p className="settings-theme-library__limit" role="status">
            You have reached the limit of {MAX_CUSTOM_THEMES} custom themes. Delete one before creating another.
          </p>
        ) : null}
      </div>
    </section>
  )
}
