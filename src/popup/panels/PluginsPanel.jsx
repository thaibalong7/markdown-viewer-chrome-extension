import React from 'react'
import { PLUGIN_IDS, MERMAID_RENDERERS } from '../../plugins/plugin-types.js'
import { Switch } from '../../shared/react/Switch.jsx'
import {
  MERMAID_RENDERER_DESCRIPTIONS,
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
        return (
          <div key={pluginId} className="mdp-ui-field popup-plugin-item">
            <div className="popup-setting-row popup-plugin-heading">
              <span className="popup-setting-row__label">{PLUGIN_LABELS[pluginId] || pluginId}</span>
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
            {hint ? <p className="popup-plugin-note">{hint}</p> : null}
            {isMermaid ? (
              <label className="mdp-ui-field popup-plugin-subfield">
                <span className="mdp-ui-field__label">Renderer</span>
                <select
                  className="mdp-ui-select"
                  value={mermaidRenderer}
                  disabled={!mermaidEnabled}
                  onChange={(event) =>
                    onPatch({
                      plugins: {
                        [pluginId]: {
                          renderer: event.target.value
                        }
                      }
                    })
                  }
                >
                  {MERMAID_RENDERER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="popup-plugin-subfield__hint">
                  {MERMAID_RENDERER_DESCRIPTIONS[mermaidRenderer]}
                </span>
              </label>
            ) : null}
            {versionNote ? (
              <p className="popup-plugin-note popup-plugin-version-note">{versionNote}</p>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
