import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'
import { DEFAULT_SETTINGS } from '../settings/index.js'
import { BUILT_IN_THEMES } from '../theme/index.js'
import { getDefaultPluginSettings } from '../plugins/plugin-types.js'
import { deepMerge } from '../shared/deep-merge.js'
import { FONT_FAMILY_PRESETS, SETTINGS_TAB_IDS, SETTINGS_TABS } from './settings-constants.js'

const THEME_LABELS = {
  light: 'Light',
  dark: 'Dark'
}

function createReaderUiDefaultsPatch() {
  return {
    theme: { ...DEFAULT_SETTINGS.theme },
    typography: { ...DEFAULT_SETTINGS.typography },
    layout: { ...DEFAULT_SETTINGS.layout }
  }
}

export function PopupApp() {
  const [settings, setSettings] = useState(null)
  const [activeTab, setActiveTab] = useState(SETTINGS_TAB_IDS.SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const persistTimerRef = useRef(null)
  const pendingPatchRef = useRef({})

  async function loadSettings() {
    setLoading(true)
    setErrorMessage('')
    try {
      const response = await sendMessage({ type: MESSAGE_TYPES.GET_SETTINGS })
      if (!response?.ok) throw new Error(response?.error || 'Failed to load settings.')
      setSettings(response.data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  async function persistPatchNow(partial) {
    setSaving(true)
    setErrorMessage('')
    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.SAVE_SETTINGS,
        payload: partial
      })
      if (!response?.ok) throw new Error(response?.error || 'Failed to save settings.')
      setSettings(response.data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  function persistPatch(partial) {
    if (!partial) return
    setSettings((previous) => {
      if (!previous) return previous
      return deepMerge(previous, partial)
    })
    pendingPatchRef.current = deepMerge(pendingPatchRef.current, partial)
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
    }
    setSaving(true)
    persistTimerRef.current = setTimeout(() => {
      const patch = pendingPatchRef.current
      pendingPatchRef.current = {}
      persistTimerRef.current = null
      void persistPatchNow(patch)
    }, 220)
  }

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current)
      }
    }
  }, [])

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
              <label className="popup-field popup-field-inline">
                <input
                  type="checkbox"
                  checked={settings.enabled !== false}
                  onChange={(event) => persistPatch({ enabled: event.target.checked })}
                />
                <span className="popup-label">Enable Markdown Plus on local markdown files</span>
              </label>
            )}

            {activeTab === SETTINGS_TAB_IDS.READER && (
              <>
                <label className="popup-field">
                  <span className="popup-label">Theme</span>
                  <select
                    className="popup-input"
                    value={settings.theme?.preset || 'light'}
                    onChange={(event) =>
                      persistPatch({
                        theme: { preset: event.target.value }
                      })
                    }
                  >
                    {Object.keys(BUILT_IN_THEMES).map((preset) => (
                      <option key={preset} value={preset}>
                        {THEME_LABELS[preset] || preset}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="popup-field">
                  <span className="popup-label">Font family</span>
                  <select
                    className="popup-input"
                    value={settings.typography?.fontFamily || FONT_FAMILY_PRESETS[0].value}
                    onChange={(event) =>
                      persistPatch({
                        typography: {
                          fontFamily: event.target.value
                        }
                      })
                    }
                  >
                    {FONT_FAMILY_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="popup-field">
                  <span className="popup-label">Font size (px)</span>
                  <input
                    className="popup-input"
                    type="number"
                    min="12"
                    max="28"
                    step="1"
                    value={Number(settings.typography?.fontSize || 16)}
                    onChange={(event) =>
                      persistPatch({
                        typography: {
                          fontSize: Number(event.target.value) || 16
                        }
                      })
                    }
                  />
                </label>

                <label className="popup-field">
                  <span className="popup-label">Line height</span>
                  <input
                    className="popup-input"
                    type="number"
                    min="1.2"
                    max="2.2"
                    step="0.1"
                    value={Number(settings.typography?.lineHeight || 1.7)}
                    onChange={(event) =>
                      persistPatch({
                        typography: {
                          lineHeight: Number(event.target.value) || 1.7
                        }
                      })
                    }
                  />
                </label>

                <label className="popup-field">
                  <span className="popup-label">Content width (px)</span>
                  <input
                    className="popup-input"
                    type="number"
                    min="640"
                    max="1400"
                    step="10"
                    value={Number(settings.layout?.contentMaxWidth || 980)}
                    onChange={(event) =>
                      persistPatch({
                        layout: {
                          contentMaxWidth: Number(event.target.value) || 980
                        }
                      })
                    }
                  />
                </label>

                <label className="popup-field popup-field-inline">
                  <input
                    type="checkbox"
                    checked={settings.layout?.showToc !== false}
                    onChange={(event) =>
                      persistPatch({
                        layout: {
                          showToc: event.target.checked
                        }
                      })
                    }
                  />
                  <span className="popup-label">Show table of contents</span>
                </label>

                <div className="popup-actions">
                  <button
                    type="button"
                    className="popup-button popup-button-danger"
                    onClick={() => {
                      const ok = window.confirm('Reset reader UI settings to default values?')
                      if (!ok) return
                      void persistPatch(createReaderUiDefaultsPatch())
                    }}
                  >
                    Reset reader UI
                  </button>
                </div>
              </>
            )}

            {activeTab === SETTINGS_TAB_IDS.PLUGINS && (
              <>
                {Object.keys(pluginsSnapshot).map((pluginId) => (
                  <label key={pluginId} className="popup-field popup-field-inline">
                    <input
                      type="checkbox"
                      checked={pluginsSnapshot?.[pluginId]?.enabled !== false}
                      onChange={(event) =>
                        persistPatch({
                          plugins: {
                            [pluginId]: {
                              enabled: event.target.checked
                            }
                          }
                        })
                      }
                    />
                    <span className="popup-label">{PLUGIN_LABELS[pluginId] || pluginId}</span>
                  </label>
                ))}
              </>
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

const PLUGIN_LABELS = {
  codeHighlight: 'Code highlight',
  taskList: 'Task list',
  anchorHeading: 'Anchor heading',
  tableEnhance: 'Table enhance',
  emoji: 'Emoji',
  footnote: 'Footnotes',
  math: 'Math (KaTeX)',
  mermaid: 'Mermaid diagrams'
}
