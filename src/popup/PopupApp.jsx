import React, { useMemo, useState } from 'react'
import { getDefaultPluginSettings } from '../plugins/plugin-types.js'
import { SETTINGS_TAB_IDS, SETTINGS_TABS } from './settings-constants.js'
import { useSettingsPersistence } from './hooks/useSettingsPersistence.js'
import { GeneralPanel } from './panels/GeneralPanel.jsx'
import { ReaderPanel } from './panels/ReaderPanel.jsx'
import { PluginsPanel } from './panels/PluginsPanel.jsx'

export function PopupApp() {
  const { settings, loading, saving, errorMessage, persistPatch } = useSettingsPersistence()
  const [activeTab, setActiveTab] = useState(SETTINGS_TAB_IDS.SETTINGS)

  const pluginsSnapshot = useMemo(() => {
    const defaults = getDefaultPluginSettings()
    return {
      ...defaults,
      ...(settings?.plugins || {})
    }
  }, [settings])

  const activeTabMeta = SETTINGS_TABS.find((tab) => tab.id === activeTab)

  if (loading) {
    return (
      <div className="popup-root">
        <div className="popup-loading">Loading settings...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="popup-root">
        <div className="popup-error">{errorMessage || 'Could not load settings.'}</div>
      </div>
    )
  }

  return (
    <div className="popup-root">
      <div className="popup-settings-panel">
        <nav className="popup-settings-rail" aria-label="Settings sections">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`popup-settings-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              aria-label={tab.label}
              title={tab.title}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
            </button>
          ))}
        </nav>

        <div className="popup-settings-main">
          <div className="popup-settings-header">
            <h2 className="popup-settings-title">{activeTabMeta?.title || 'Settings'}</h2>
            <button type="button" className="popup-button" onClick={() => window.close()}>
              Close
            </button>
          </div>

          <div className="popup-settings-content">
            {activeTab === SETTINGS_TAB_IDS.SETTINGS && (
              <GeneralPanel settings={settings} onPatch={persistPatch} />
            )}

            {activeTab === SETTINGS_TAB_IDS.READER && (
              <ReaderPanel settings={settings} onPatch={persistPatch} />
            )}

            {activeTab === SETTINGS_TAB_IDS.PLUGINS && (
              <PluginsPanel pluginsSnapshot={pluginsSnapshot} onPatch={persistPatch} />
            )}
          </div>

          <div className="popup-footer">
            {saving ? 'Saving...' : 'Saved'}
            {errorMessage ? ` - ${errorMessage}` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
