import React from 'react'
import { PLUGIN_IDS, MERMAID_RENDERERS } from '../../plugins/plugin-types.js'
import { Switch } from '../../shared/react/Switch.jsx'
import { Tooltip } from '../components/Tooltip.jsx'
import {
  MERMAID_RENDERER_OPTIONS,
  PLUGIN_HINTS,
  PLUGIN_LABELS,
  PLUGIN_VERSION_NOTES
} from '../settings-constants.js'

/**
 * @param {{ pluginsSnapshot: Record<string, { enabled?: boolean }>, onPatch: (partial: object) => void }} props
 */
export function PluginsPanel({ pluginsSnapshot, onPatch }) {
  return (
    <>
      {Object.keys(pluginsSnapshot).map((pluginId) => {
        const hint = PLUGIN_HINTS[pluginId]
        const versionNote = PLUGIN_VERSION_NOTES[pluginId]
        const isMermaid = pluginId === PLUGIN_IDS.MERMAID
        const mermaidEnabled = pluginsSnapshot?.[pluginId]?.enabled !== false
        const mermaidRenderer =
          pluginsSnapshot?.[pluginId]?.renderer || MERMAID_RENDERERS.OFFICIAL
        const selectedMermaidOption =
          MERMAID_RENDERER_OPTIONS.find((option) => option.value === mermaidRenderer) ||
          MERMAID_RENDERER_OPTIONS[0]
        return (
          <div
            key={pluginId}
            className={`popup-plugin-item ${isMermaid ? 'popup-plugin-item--mermaid' : ''}`}
          >
            <div className="popup-plugin-heading">
              <div className="popup-plugin-copy">
                <div className="popup-plugin-title">
                  <span className="popup-setting-row__label">
                    {PLUGIN_LABELS[pluginId] || pluginId}
                  </span>
                  {versionNote ? (
                    <Tooltip content={versionNote}>
                      <button
                        type="button"
                        className="popup-info-button popup-plugin-info"
                        aria-label={`${PLUGIN_LABELS[pluginId] || pluginId}: ${versionNote}`}
                      >
                        i
                      </button>
                    </Tooltip>
                  ) : null}
                </div>
                {hint ? <p className="popup-plugin-note">{hint}</p> : null}
              </div>
              <Switch
                id={`popup-plugin-${pluginId}`}
                label={PLUGIN_LABELS[pluginId] || pluginId}
                checked={mermaidEnabled}
                onChange={(event) =>
                  onPatch({
                    plugins: {
                      [pluginId]: {
                        enabled: event.target.checked
                      }
                    }
                  })
                }
              />
            </div>
            {isMermaid && mermaidEnabled ? (
              <fieldset className="popup-mermaid-renderers">
                <legend>Renderer</legend>
                <div className="popup-mermaid-renderers__options">
                  {MERMAID_RENDERER_OPTIONS.map((option) => {
                    const selected = mermaidRenderer === option.value
                    return (
                      <label
                        key={option.value}
                        className={`popup-mermaid-renderer ${selected ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="popup-mermaid-renderer"
                          value={option.value}
                          checked={selected}
                          onChange={(event) =>
                            onPatch({
                              plugins: {
                                [pluginId]: {
                                  renderer: event.target.value
                                }
                              }
                            })
                          }
                        />
                        <span className="popup-mermaid-renderer__label">{option.shortLabel}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="popup-mermaid-renderers__hint">
                  {selectedMermaidOption.description}
                </p>
              </fieldset>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
