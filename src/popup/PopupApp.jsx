import React, { useMemo, useState } from 'react'
import { mergePluginSettings } from '../plugins/plugin-types.js'
import { Button } from '../shared/react/Button.jsx'
import { SkeletonBlock } from '../shared/react/Skeleton.jsx'
import { SETTINGS_TAB_IDS, SETTINGS_TABS } from './settings-constants.js'
import { useSettingsPersistence } from './hooks/useSettingsPersistence.js'
import { useFileHistory } from './hooks/useFileHistory.js'
import { Tooltip } from './components/Tooltip.jsx'
import { SettingsTabIcon } from './components/SettingsTabIcon.jsx'
import { ReaderPanel } from './panels/ReaderPanel.jsx'
import { EditorSettingsPanel } from './panels/EditorSettingsPanel.jsx'
import { PluginsPanel } from './panels/PluginsPanel.jsx'
import { FileHistoryPanel } from './panels/FileHistoryPanel.jsx'
import { openOptionsPage } from './actions/open-options-page.js'

export function PopupApp() {
  const { settings, loading, saving, errorMessage, persistPatch } = useSettingsPersistence()
  const fileHistory = useFileHistory()
  const [activeTab, setActiveTab] = useState(SETTINGS_TAB_IDS.HISTORY)
  const [optionsError, setOptionsError] = useState('')

  const pluginsSnapshot = useMemo(() => {
    return mergePluginSettings(settings?.plugins)
  }, [settings])

  const activeTabMeta = SETTINGS_TABS.find((tab) => tab.id === activeTab)

  async function handleOpenSettings() {
    setOptionsError('')
    try {
      await openOptionsPage()
      window.close()
    } catch (error) {
      setOptionsError(error instanceof Error ? error.message : 'Could not open Settings.')
    }
  }

  if (loading) {
    return (
      <div className="popup-root">
        <div className="mdp-ui-card popup-loading" aria-label="Loading quick settings" aria-busy="true">
          <SkeletonBlock lines={1} widths={['58%']} lineHeight={18} gap={0} />
          <SkeletonBlock
            lines={4}
            widths={['100%', '94%', '88%', '82%']}
            lineHeight={12}
            gap={12}
            className="popup-loading__fields"
          />
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="popup-root">
        <div className="mdp-ui-state mdp-ui-state--error popup-error">
          <strong className="mdp-ui-state__title">Quick settings could not be loaded</strong>
          <p className="mdp-ui-state__message">{errorMessage || 'Could not load settings.'}</p>
          {optionsError ? <p className="mdp-ui-state__message">{optionsError}</p> : null}
          <Button className="mdp-ui-state__action" onClick={() => void handleOpenSettings()}>
            Open Settings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="popup-root">
      <header className="popup-app-header">
        <div className="popup-brand">
          <span className="popup-brand__mark" aria-hidden="true">M+</span>
          <div>
            <strong>Markdown Plus</strong>
            <span>Quick controls</span>
          </div>
        </div>
        <Button
          variant="quiet"
          className="popup-open-settings"
          onClick={() => void handleOpenSettings()}
        >
          Open Settings
        </Button>
      </header>

      <div className="popup-settings-panel">
        <nav className="popup-settings-rail" aria-label="Settings sections">
          {SETTINGS_TABS.map((tab) => (
            <Tooltip key={tab.id} content={`${tab.title}. Switch section.`}>
              <button
                type="button"
                className={`popup-settings-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                aria-label={tab.label}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                onClick={() => setActiveTab(tab.id)}
              >
                <SettingsTabIcon name={tab.id} />
              </button>
            </Tooltip>
          ))}
        </nav>

        <div className="popup-settings-main">
          <div className="popup-settings-header">
            <div>
              <p className="popup-settings-eyebrow">{activeTabMeta?.label || 'Settings'}</p>
              <h1 className="popup-settings-title">{activeTabMeta?.title || 'Settings'}</h1>
            </div>
          </div>

          <div className="popup-settings-content">
            {activeTab === SETTINGS_TAB_IDS.HISTORY && (
              <FileHistoryPanel
                history={fileHistory.history}
                loading={fileHistory.loading}
                busyUrl={fileHistory.busyUrl}
                errorMessage={fileHistory.errorMessage}
                onOpen={fileHistory.openHistoryEntry}
                onClear={fileHistory.clearHistory}
              />
            )}

            {activeTab === SETTINGS_TAB_IDS.READER && (
              <ReaderPanel settings={settings} onPatch={persistPatch} />
            )}

            {activeTab === SETTINGS_TAB_IDS.EDITOR && (
              <EditorSettingsPanel settings={settings} onPatch={persistPatch} />
            )}

            {activeTab === SETTINGS_TAB_IDS.PLUGINS && (
              <PluginsPanel pluginsSnapshot={pluginsSnapshot} onPatch={persistPatch} />
            )}
          </div>

          <div className="popup-footer">
            <span
              className={`mdp-ui-status ${errorMessage || optionsError ? 'mdp-ui-status--error' : saving ? 'mdp-ui-status--info' : 'mdp-ui-status--success'}`}
              role="status"
            >
              <span className="mdp-ui-status__dot" aria-hidden="true" />
              {errorMessage || optionsError || (saving ? 'Saving changes…' : 'Settings saved')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
