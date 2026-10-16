import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React, { useMemo, useState } from 'react'
import { Button } from '../../shared/react/Button.jsx'
import {
  BUILT_IN_THEMES,
  BUILT_IN_THEME_LABEL_KEYS,
  rebaseCustomThemeDraft
} from '../../theme/index.js'
import { BACKGROUND_TYPES } from '../../theme/backgrounds.js'
import { ThemeBackgroundFields } from './ThemeBackgroundFields.jsx'
import { ThemeColorFields } from './ThemeColorFields.jsx'
import { ThemePreview } from './ThemePreview.jsx'
import { ThemeSyntaxFields } from './ThemeSyntaxFields.jsx'

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
  useLocale()
  return (
    <div className="settings-theme-editor__section">
      <div className="settings-theme-editor__section-heading">
        <span>{number}</span>
        <div>
          <h3>{t(title)}</h3>
          <p>{t(description)}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export function ThemeEditor({ settings, initialTheme, busyAction, onCancel, onSave }) {
  useLocale()
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
    if (dirty && !window.confirm(t('options.themes.editor.discardYourUnsavedThemeChanges'))) return
    onCancel()
  }

  async function saveTheme() {
    const nextSettings = await onSave(draft, imageFile)
    if (nextSettings) onCancel()
  }

  return (
    <section className="settings-section settings-section--themes" aria-labelledby="theme-editor-title">
      <div className="settings-theme-editor-page__nav">
        <Button variant="quiet" disabled={saving} onClick={cancel}>{t('options.themes.editor.backToThemes')}</Button>
        <span>{dirty ? t('options.themes.editor.unsavedChanges') : isNew ? t('options.themes.editor.newDraft') : t('options.themes.editor.noChanges')}</span>
      </div>

      <div className="settings-section__heading settings-theme-editor-page__heading">
        <p className="settings-eyebrow">{t('options.themes.editor.themeStudio')}</p>
        <h2 id="theme-editor-title">{isNew ? t('options.themes.editor.createCustomTheme') : t('options.themes.editor.editValue', { 0: initialTheme.name })}</h2>
        <p>{t('options.themes.editor.buildAReusableReaderThemeChangesStayIn')}</p>
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
            title={t('options.themes.editor.identity')}
            description={t('options.themes.editor.nameTheThemeAndChooseTheBuiltIn')}
          >
            <div className="settings-theme-identity-grid">
              <label className="mdp-ui-field settings-theme-identity-field">
                <span className="mdp-ui-field__label-row">
                  <span className="mdp-ui-field__label">{t('options.themes.editor.themeName')}</span>
                  <span className="mdp-ui-field__meta">{draft.name.length} / 48</span>
                </span>
                <input
                  className="mdp-ui-input"
                  value={draft.name}
                  maxLength="48"
                  disabled={saving}
                  autoFocus
                  placeholder={t('options.themes.editor.eGMidnightPaper')}
                  aria-describedby="theme-name-helper"
                  onChange={(event) => updateDraft({ name: event.target.value })}
                />
                <span id="theme-name-helper" className="mdp-ui-field__helper">{t('options.themes.editor.shownInTheThemePickerAndPopup')}</span>
              </label>
              <div className="mdp-ui-field settings-theme-identity-field">
                <span className="mdp-ui-field__label-row">
                  <label className="mdp-ui-field__label" htmlFor="theme-base-select">{t('options.themes.editor.baseTheme')}</label>
                  <span className="settings-theme-identity-field__badge">{t('options.themes.editor.resetsColors')}</span>
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
                      <option key={id} value={id}>{t(BUILT_IN_THEME_LABEL_KEYS[id] || id)}</option>
                    ))}
                  </select>
                </div>
                <span id="theme-base-helper" className="mdp-ui-field__helper">{t('options.themes.editor.replacesTheColorsInSection02CodeHighlighting')}</span>
              </div>
            </div>
          </EditorSection>

          <EditorSection
            number="02"
            title={t('options.themes.editor.colors')}
            description={t('options.themes.editor.tuneSemanticColorsSoTheViewerStaysVisually')}
          >
            <ThemeColorFields
              draft={draft}
              disabled={saving}
              onChange={(colors) => updateDraft({ colors })}
            />
          </EditorSection>

          <EditorSection
            number="03"
            title={t('options.themes.editor.codeHighlighting')}
            description={t('options.themes.editor.chooseTheSyntaxColorsUsedForRenderedCode')}
          >
            <ThemeSyntaxFields
              draft={draft}
              disabled={saving}
              onChange={(syntaxThemeId) => updateDraft({ syntaxThemeId })}
            />
          </EditorSection>

          <EditorSection
            number="04"
            title={t('options.themes.editor.background')}
            description={t('options.themes.editor.buildTheSceneBehindTheViewerAndTune')}
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
            <Button disabled={saving} onClick={cancel}>{t('common.actions.cancel')}</Button>
            <Button
              type="submit"
              variant="primary"
              busy={busyAction === 'themeSave'}
              busyLabel={t('options.themes.editor.savingTheme')}
              disabled={!draft.name.trim() || !imageReady || saving || (!isNew && !dirty)}
            >
              {isNew ? t('options.themes.editor.createTheme') : t('common.actions.saveChanges')}
            </Button>
          </div>
        </div>

        <ThemePreview settings={settings} theme={draft} imageFile={imageFile} />
      </form>
    </section>
  )
}
