import { t, translateMessage } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React, { useState } from 'react'
import { Badge } from '../../shared/react/Badge.jsx'
import { Button } from '../../shared/react/Button.jsx'
import { Switch } from '../../shared/react/Switch.jsx'
import { openExtensionDetails } from '../../shared/file-scheme-access.js'
import { useFileSchemeAccess } from '../../shared/react/useFileSchemeAccess.js'
import { SCROLLBAR_VISIBILITY } from '../../shared/constants/scrollbar.js'
import { LANGUAGES } from '../../i18n/languages.js'

export function GeneralSettings({
  settings,
  saving,
  onEnabledChange,
  onScrollbarAutoHideChange,
  onDocumentStatsVisibleChange,
  onWatchModeChange,
  onLanguageChange
}) {
  useLocale()
  const fileAccess = useFileSchemeAccess()
  const [detailsError, setDetailsError] = useState('')

  async function handleOpenDetails() {
    setDetailsError('')
    try {
      await openExtensionDetails()
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : 'errors.options.general.openExtensionDetails')
    }
  }

  const badgeVariant = fileAccess.state === 'allowed'
    ? 'success'
    : fileAccess.state === 'blocked'
      ? 'danger'
      : 'default'

  return (
    <section className="settings-section" aria-labelledby="general-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">{t('options.general.behavior')}</p>
        <h2 id="general-title">{t('options.general.title')}</h2>
        <p>{t('options.general.controlMarkdownPlusActivationAndViewerBehavior')}</p>
      </div>

      <div className="mdp-ui-card">
        <div className="mdp-ui-setting-row settings-row--select">
          <div>
            <label htmlFor="general-language" className="mdp-ui-setting-row__title">{t('options.general.language.label')}</label>
            <p id="general-language-description" className="mdp-ui-setting-row__description">{t('options.general.language.description')}</p>
          </div>
          <select id="general-language" className="mdp-ui-select" aria-describedby="general-language-description"
            value={settings.language || 'auto'} disabled={saving}
            onChange={event => void onLanguageChange(event.target.value)}>
            {LANGUAGES.map(({ value, label }) => <option key={value} value={value}>{t(label)}</option>)}
          </select>
        </div>
        <div className="mdp-ui-divider" />
        <div className="mdp-ui-setting-row settings-row--toggle">
          <div>
            <h3 className="mdp-ui-setting-row__title">{t('options.general.enabled.label')}</h3>
            <p className="mdp-ui-setting-row__description">{t('options.general.enabled.description')}</p>
          </div>
          <Switch
            id="general-enabled"
            label={t('options.general.enabled.label')}
            checked={settings.enabled !== false}
            disabled={saving}
            onChange={(event) => void onEnabledChange(event.target.checked)}
          />
        </div>

        <div className="mdp-ui-divider" />

        <div className="mdp-ui-setting-row settings-row--toggle">
          <div>
            <h3 className="mdp-ui-setting-row__title">{t('options.general.scrollbars.label')}</h3>
            <p className="mdp-ui-setting-row__description">{t('options.general.scrollbars.description')}</p>
          </div>
          <Switch
            id="general-scrollbar-auto-hide"
            label={t('options.general.scrollbars.label')}
            checked={settings.appearance?.scrollbarVisibility !== SCROLLBAR_VISIBILITY.ALWAYS}
            disabled={saving}
            onChange={(event) => void onScrollbarAutoHideChange(event.target.checked)}
          />
        </div>

        <div className="mdp-ui-divider" />

        <div className="mdp-ui-setting-row settings-row--toggle">
          <div>
            <h3 className="mdp-ui-setting-row__title">{t('options.general.statistics.label')}</h3>
            <p className="mdp-ui-setting-row__description">{t('options.general.statistics.description')}</p>
          </div>
          <Switch
            id="general-document-stats"
            label={t('options.general.statistics.label')}
            checked={settings.appearance?.showDocumentStats !== false}
            disabled={saving}
            onChange={(event) => void onDocumentStatsVisibleChange(event.target.checked)}
          />
        </div>

        <div className="mdp-ui-divider" />

        <div className="mdp-ui-setting-row settings-row--select">
          <div>
            <label htmlFor="general-watch-mode" className="mdp-ui-setting-row__title">{t('viewer.updates.title')}</label>
            <p id="general-watch-description" className="mdp-ui-setting-row__description">{t('options.general.chooseHowToHandleChangesToTheOpen')}</p>
          </div>
          <select
            id="general-watch-mode"
            className="mdp-ui-select"
            aria-describedby="general-watch-description"
            value={settings.watch?.mode || 'ask'}
            disabled={saving}
            onChange={(event) => void onWatchModeChange(event.target.value)}
          >
            <option value="ask">{t('common.watchModes.ask')}</option>
            <option value="auto">{t('common.watchModes.auto')}</option>
            <option value="off">{t('common.watchModes.off')}</option>
          </select>
        </div>
        <div className="mdp-ui-divider" />

        <div className="mdp-ui-setting-row settings-row--access">
          <div>
            <h3 className="mdp-ui-setting-row__title">{t('options.general.fileAccess.label')}</h3>
            <p className="mdp-ui-setting-row__description">{t('options.general.chromeControlsThisPermissionIfAccessIsBlocked')}<strong>{' '}{t('options.general.chromeExtensions')}</strong>{t('options.general.chooseMarkdownPlusDetailsThenEnableAllowAccess')}</p>
            {detailsError ? <p className="settings-inline-error" role="alert">{translateMessage(detailsError)}</p> : null}
          </div>
          <div className="settings-access-actions">
            <Badge variant={badgeVariant}>{t(fileAccess.message)}</Badge>
            {fileAccess.state === 'blocked' || fileAccess.state === 'unavailable' ? <Button variant="secondary" onClick={() => void handleOpenDetails()}>{t('common.actions.openExtensionDetails')}</Button> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
