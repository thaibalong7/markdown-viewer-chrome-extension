import React, { useMemo, useState } from 'react'
import { mergePluginSettings } from '../plugins/plugin-types.js'
import { SkeletonBlock } from '../shared/react/Skeleton.jsx'
import { SETTINGS_TAB_IDS, SETTINGS_TABS } from './settings-constants.js'
import { useSettingsPersistence } from './hooks/useSettingsPersistence.js'
import { useFileHistory } from './hooks/useFileHistory.js'
import { Tooltip } from './components/Tooltip.jsx'
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
        <div className="popup-loading popup-skeleton">
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
        <div className="popup-error">
          <p>{errorMessage || 'Could not load settings.'}</p>
          {optionsError ? <p>{optionsError}</p> : null}
          <button type="button" className="popup-button" onClick={() => void handleOpenSettings()}>
            Open Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="popup-root">
      <div className="popup-settings-panel">
        <nav className="popup-settings-rail" aria-label="Settings sections">
          {SETTINGS_TABS.map((tab) => (
            <Tooltip key={tab.id} content={`${tab.title}. Switch section.`}>
              <button
                type="button"
                className={`popup-settings-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                aria-label={tab.label}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
              </button>
            </Tooltip>
          ))}
        </nav>

        <div className="popup-settings-main">
          <div className="popup-settings-header">
            <h2 className="popup-settings-title">{activeTabMeta?.title || 'Settings'}</h2>
            <div className="popup-header-actions">
              <button
                type="button"
                className="popup-button popup-button-settings"
                onClick={() => void handleOpenSettings()}
              >
                Open Settings
              </button>
              <button type="button" className="popup-button" onClick={() => window.close()}>
                Close
              </button>
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
            {saving ? 'Saving...' : 'Saved'}
            {errorMessage || optionsError ? ` - ${errorMessage || optionsError}` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
