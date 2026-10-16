import { formatNumber, t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'
import { Button } from '../../shared/react/Button.jsx'
import { NumberField } from '../../shared/react/NumberField.jsx'
import { Switch } from '../../shared/react/Switch.jsx'
import { BUILT_IN_THEMES, getThemeOptions, resolveThemeById } from '../../theme/index.js'
import { Tooltip } from '../components/Tooltip.jsx'
import {
  createReaderUiDefaultsPatch,
  FONT_FAMILY_PRESETS
} from '../settings-constants.js'

function InfoTooltip({ label, content }) {
  useLocale()
  return (
    <Tooltip content={content}>
      <button type="button" className="popup-info-button" aria-label={t(label)}>{t('popup.plugins.i')}</button>
    </Tooltip>
  )
}

/**
 * @param {{ settings: object, onPatch: (partial: object) => void }} props
 */
export function ReaderPanel({ settings, onPatch }) {
  useLocale()
  const themeOptions = getThemeOptions(settings)
  const builtInThemeGroups = [
    {
      label: 'options.themes.syntax.lightThemes',
      themes: themeOptions.builtIn.filter(({ id }) => BUILT_IN_THEMES[id]?.colorScheme !== 'dark')
    },
    {
      label: 'options.themes.syntax.darkThemes',
      themes: themeOptions.builtIn.filter(({ id }) => BUILT_IN_THEMES[id]?.colorScheme === 'dark')
    }
  ]
  const selectedTheme = resolveThemeById(settings, settings.theme?.activeId)
  const selectedColors = selectedTheme.colors
  return (
    <>
      <div className="mdp-ui-field">
        <label className="mdp-ui-field__label" htmlFor="popup-reader-theme">{t('popup.reader.theme')}</label>
        <div className="popup-theme-select-wrap">
          <span
            className="popup-theme-preview"
            aria-hidden="true"
            style={{
              '--popup-theme-paper': selectedColors.surface || selectedColors.background,
              '--popup-theme-ink': selectedColors.text,
              '--popup-theme-accent': selectedColors.link
            }}
          >
            <span />
          </span>
          <select
            id="popup-reader-theme"
            className="mdp-ui-select popup-theme-select"
            value={selectedTheme.id}
            onChange={(event) =>
              onPatch({
                theme: { activeId: event.target.value }
              })
            }
          >
            {builtInThemeGroups.map((group) => (
              <optgroup key={group.label} label={t(group.label)}>
                {group.themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>{t(theme.nameKey || theme.name)}</option>
                ))}
              </optgroup>
            ))}
            {themeOptions.custom.length ? <optgroup label={t('options.themes.library.myThemes')}>
                {themeOptions.custom.map((theme) => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </optgroup> : null}
          </select>
        </div>
      </div>

      <div className="mdp-ui-field">
        <div className="mdp-ui-field__label-row">
          <label className="mdp-ui-field__label" htmlFor="reader-font-family">{t('popup.reader.fontFamily.label')}</label>
          <InfoTooltip
            label={t('popup.reader.aboutFontFamily')}
            content={t('popup.reader.usesFontsInstalledOnYourSystemPresetsList')}
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
              {t(preset.label)}
            </option>
          ))}
        </select>
      </div>

      <NumberField
        id="popup-reader-font-size"
        label={t('popup.reader.fontSize.label')}
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
        label={t('popup.reader.lineHeight.label')}
        labelAction={(
          <InfoTooltip
            label={t('popup.reader.aboutLineHeight')}
            content={t('popup.reader.unitlessLineSpacingMultiplierEG17')}
          />
        )}
        rangeLabel={`${formatNumber(1.2)}–${formatNumber(2.2)}`}
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
        label={t('popup.reader.contentWidth.label')}
        rangeLabel={`${formatNumber(640)}–${formatNumber(1400)} px`}
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
        <span className="popup-setting-row__label">{t('popup.reader.outline.label')}</span>
        <Switch
          id="popup-reader-show-toc"
          label={t('popup.reader.outline.label')}
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
            const ok = window.confirm(t('popup.reader.resetReaderUISettingsToDefaultValues'))
            if (!ok) return
            void onPatch(createReaderUiDefaultsPatch())
          }}
        >{t('popup.reader.resetReaderUI')}</Button>
      </div>
    </>
  )
}
