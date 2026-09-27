import React, { useMemo, useState } from 'react'
import { Button } from '../../shared/react/Button.jsx'
import {
  BUILT_IN_THEMES,
  BUILT_IN_THEME_LABELS,
  rebaseCustomThemeDraft
} from '../../theme/index.js'
import { BACKGROUND_TYPES } from '../../theme/backgrounds.js'
import { ThemeBackgroundFields } from './ThemeBackgroundFields.jsx'
import { ThemeColorFields } from './ThemeColorFields.jsx'
import { ThemePreview } from './ThemePreview.jsx'

function cloneTheme(theme) {
  return {
    ...theme,
    colors: { ...theme.colors },
    background: { ...theme.background }
  }
}

function sameTheme(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function EditorSection({ number, title, description, children }) {
  return (
    <div className="settings-theme-editor__section">
      <div className="settings-theme-editor__section-heading">
        <span>{number}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export function ThemeEditor({ settings, initialTheme, busyAction, onCancel, onSave }) {
  const [draft, setDraft] = useState(() => cloneTheme(initialTheme))
  const [imageFile, setImageFile] = useState(null)
  const saving = busyAction !== ''
  const baseTheme = BUILT_IN_THEMES[draft.baseId]
  const isNew = !settings.theme.customThemes.some(({ id }) => id === draft.id)
  const dirty = useMemo(
    () => Boolean(imageFile) || !sameTheme(draft, initialTheme),
    [draft, imageFile, initialTheme]
  )
  const imageReady = draft.background.type !== BACKGROUND_TYPES.IMAGE ||
    Boolean(imageFile || draft.background.assetId)

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function cancel() {
    if (dirty && !window.confirm('Discard your unsaved theme changes?')) return
    onCancel()
  }

  async function saveTheme() {
    const nextSettings = await onSave(draft, imageFile)
    if (nextSettings) onCancel()
  }

  return (
    <section className="settings-section settings-section--themes" aria-labelledby="theme-editor-title">
      <div className="settings-theme-editor-page__nav">
        <Button variant="quiet" disabled={saving} onClick={cancel}>← Back to themes</Button>
        <span>{dirty ? 'Unsaved changes' : isNew ? 'New draft' : 'No changes'}</span>
      </div>

      <div className="settings-section__heading settings-theme-editor-page__heading">
        <p className="settings-eyebrow">Theme studio</p>
        <h2 id="theme-editor-title">{isNew ? 'Create custom theme' : `Edit ${initialTheme.name}`}</h2>
        <p>Build a reusable reader theme. Changes stay in this draft until you save.</p>
      </div>

      <form
        className="settings-theme-workbench"
        onSubmit={(event) => {
          event.preventDefault()
          void saveTheme()
        }}
      >
        <div className="mdp-ui-card settings-theme-editor">
          <EditorSection
            number="01"
            title="Identity"
            description="Name the theme and choose the built-in foundation it starts from."
          >
            <div className="settings-theme-identity-grid">
              <label className="mdp-ui-field settings-theme-identity-field">
                <span className="mdp-ui-field__label-row">
                  <span className="mdp-ui-field__label">Theme name</span>
                  <span className="mdp-ui-field__meta">{draft.name.length} / 48</span>
                </span>
                <input
                  className="mdp-ui-input"
                  value={draft.name}
                  maxLength="48"
                  disabled={saving}
                  autoFocus
                  placeholder="e.g. Midnight Paper"
                  aria-describedby="theme-name-helper"
                  onChange={(event) => updateDraft({ name: event.target.value })}
                />
                <span id="theme-name-helper" className="mdp-ui-field__helper">
                  Shown in the theme picker and popup.
                </span>
              </label>
              <div className="mdp-ui-field settings-theme-identity-field">
                <span className="mdp-ui-field__label-row">
                  <label className="mdp-ui-field__label" htmlFor="theme-base-select">Base theme</label>
                  <span className="settings-theme-identity-field__badge">Resets colors</span>
                </span>
                <div className="settings-theme-base-control">
                  <span className="settings-theme-base-control__palette" aria-hidden="true">
                    <i style={{ backgroundColor: baseTheme.background }} />
                    <i style={{ backgroundColor: baseTheme.surface }} />
                    <i style={{ backgroundColor: baseTheme.link }} />
                    <i style={{ backgroundColor: baseTheme.accent }} />
                  </span>
                  <select
                    id="theme-base-select"
                    className="mdp-ui-select"
                    value={draft.baseId}
                    disabled={saving}
                    aria-describedby="theme-base-helper"
                    onChange={(event) => setDraft((current) =>
                      rebaseCustomThemeDraft(current, event.target.value)
                    )}
                  >
                    {Object.keys(BUILT_IN_THEMES).map((id) => (
                      <option key={id} value={id}>{BUILT_IN_THEME_LABELS[id] || id}</option>
                    ))}
                  </select>
                </div>
                <span id="theme-base-helper" className="mdp-ui-field__helper">
                  Replaces the colors in section 02 and updates code highlighting.
                </span>
              </div>
            </div>
          </EditorSection>

          <EditorSection
            number="02"
            title="Colors"
            description="Tune semantic colors so the Viewer stays visually consistent."
          >
            <ThemeColorFields
              draft={draft}
              disabled={saving}
              onChange={(colors) => updateDraft({ colors })}
            />
          </EditorSection>

          <EditorSection
            number="03"
            title="Background"
            description="Build the scene behind the Viewer and tune its readability."
          >
            <ThemeBackgroundFields
              draft={draft}
              disabled={saving}
              imageFile={imageFile}
              onBackgroundChange={(background) => updateDraft({ background })}
              onImageFileChange={setImageFile}
            />
          </EditorSection>

          <div className="mdp-ui-action-footer settings-theme-editor__footer">
            <Button disabled={saving} onClick={cancel}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              busy={busyAction === 'themeSave'}
              busyLabel="Saving theme…"
              disabled={!draft.name.trim() || !imageReady || saving || (!isNew && !dirty)}
            >
              {isNew ? 'Create theme' : 'Save changes'}
            </Button>
          </div>
        </div>

        <ThemePreview settings={settings} theme={draft} imageFile={imageFile} />
      </form>
    </section>
  )
}
