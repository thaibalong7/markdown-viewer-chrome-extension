import React, { useMemo, useState } from 'react'
import { mergePluginSettings } from '../plugins/plugin-types.js'
import { Button } from '../shared/react/Button.jsx'
import { SkeletonBlock } from '../shared/react/Skeleton.jsx'
import { SETTINGS_TAB_IDS, SETTINGS_TABS } from './settings-constants.js'
import { useSettingsPersistence } from './hooks/useSettingsPersistence.js'
import { useFileHistory } from './hooks/useFileHistory.js'
import { SettingsTabIcon } from './components/SettingsTabIcon.jsx'
import { ReaderPanel } from './panels/ReaderPanel.jsx'
import { EditorSettingsPanel } from './panels/EditorSettingsPanel.jsx'
import { PluginsPanel } from './panels/PluginsPanel.jsx'
import { FileHistoryPanel } from './panels/FileHistoryPanel.jsx'
import { openOptionsPage } from './actions/open-options-page.js'

export function PopupApp() {
  const { settings, loading, saving, errorMessage, persistPatch } = useSettingsPersistence()
  const fileHistory = useFileHistory()
  const [activeTab, setActiveTab] = useState(SETTINGS_TAB_IDS.READER)
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

  function handleTabKeyDown(event, tabId) {
    const currentIndex = SETTINGS_TABS.findIndex((tab) => tab.id === tabId)
    let nextIndex = currentIndex

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % SETTINGS_TABS.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = SETTINGS_TABS.length - 1
    if (nextIndex === currentIndex) return

    event.preventDefault()
    const nextTabId = SETTINGS_TABS[nextIndex].id
    setActiveTab(nextTabId)
    event.currentTarget.parentElement
      ?.querySelector(`#popup-tab-${nextTabId}`)
      ?.focus()
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
          <img
            className="popup-brand__mark"
            src="/icons/icon-32.png"
            width="32"
            height="32"
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <strong>Markdown Plus</strong>
        </div>
      </header>

      <div className="popup-settings-panel">
        <nav className="popup-settings-tabs" aria-label="Quick control sections" role="tablist">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              id={`popup-tab-${tab.id}`}
              type="button"
              role="tab"
              className={`popup-settings-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
            >
              <SettingsTabIcon name={tab.id} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="popup-settings-main">
          <div className="popup-settings-header">
            <h1 className="popup-settings-title">{activeTabMeta?.title || 'Settings'}</h1>
          </div>

          <div
            className="popup-settings-content"
            role="tabpanel"
            aria-labelledby={`popup-tab-${activeTab}`}
          >
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
            <Button
              variant="quiet"
              className="popup-open-settings"
              onClick={() => void handleOpenSettings()}
            >
              All settings
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path d="M7 4h9v9" />
                <path d="m16 4-9.5 9.5" />
                <path d="M13 10v6H4V7h6" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
