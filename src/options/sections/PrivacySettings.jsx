import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'
import { Button } from '../../shared/react/Button.jsx'
import { NumberField } from '../../shared/react/NumberField.jsx'
import { Switch } from '../../shared/react/Switch.jsx'
import { HISTORY_FIELDS } from '../../settings/settings-schema.js'
import { confirmClearRecentFiles } from '../options-actions.js'

export function PrivacySettings({
  settings,
  draft,
  fieldError,
  dirty,
  busyAction,
  onEnabledChange,
  onMaxEntriesChange,
  onSave,
  onClear
}) {
  useLocale()
  const busy = Boolean(busyAction)
  const definition = HISTORY_FIELDS.maxEntries
  const inputId = 'history-maxEntries'

  return (
    <section className="settings-section" aria-labelledby="privacy-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">{t('options.privacy.localData')}</p>
        <h2 id="privacy-title">{t('options.privacy.title')}</h2>
        <p>{t('options.privacy.controlWhetherMarkdownPlusRemembersLocalDocumentsAnd')}</p>
      </div>

      <form
        className="mdp-ui-card"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave()
        }}
        noValidate
      >
        <div className="mdp-ui-setting-row settings-row--toggle">
          <div>
            <h3 className="mdp-ui-setting-row__title">{t('options.privacy.saveRecentFiles')}</h3>
            <p className="mdp-ui-setting-row__description">{t('options.privacy.rememberLocalMarkdownFilesSoTheyCanBe')}</p>
          </div>
          <Switch
            id="history-enabled"
            label={t('options.privacy.saveRecentFiles')}
            checked={settings.enabled !== false}
            disabled={busy}
            onChange={(event) => void onEnabledChange(event.target.checked)}
          />
        </div>

        <div className="mdp-ui-divider" />

        <div className="settings-fields">
          <NumberField
            id={inputId}
            label={t(definition.labelKey)}
            helper='options.privacy.keepOnlyTheNewestEntriesAfterTheNext'
            error={fieldError}
            rangeLabel={`${definition.min}–${definition.max}`}
            min={definition.min}
            max={definition.max}
            step="1"
            value={draft}
            disabled={busy}
            onChange={(event) => onMaxEntriesChange(event.target.value)}
          />
        </div>

        <div className="mdp-ui-action-footer mdp-ui-action-footer--end">
          <Button
            type="submit"
            variant="primary"
            busy={busyAction === 'historyLimit'}
            busyLabel={t('common.status.saving')}
            disabled={!dirty || busy}
          >{t('common.actions.saveChanges')}</Button>
        </div>
      </form>

      <div className="mdp-ui-card settings-card--secondary">
        <div className="mdp-ui-setting-row settings-action-row settings-action-row--danger">
          <div>
            <h3 className="mdp-ui-setting-row__title">{t('options.privacy.clearRecentFilesNow')}</h3>
            <p className="mdp-ui-setting-row__description">{t('options.privacy.recentFileURLsContainLocalPathsTheyAre')}</p>
          </div>
          <Button
            variant="danger"
            busy={busyAction === 'historyClear'}
            busyLabel={t('options.privacy.clearing')}
            disabled={busy && busyAction !== 'historyClear'}
            onClick={() => {
              if (confirmClearRecentFiles()) void onClear()
            }}
          >{t('options.privacy.clearRecentFiles')}</Button>
        </div>
      </div>
    </section>
  )
}
