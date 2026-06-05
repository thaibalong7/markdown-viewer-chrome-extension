import React from 'react'
import { PLUGIN_IDS, MERMAID_RENDERERS } from '../../plugins/plugin-types.js'
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
          <div key={pluginId} className="popup-field popup-plugin-item">
            <label className="popup-field-inline">
              <input
                type="checkbox"
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
              <span className="popup-label">{PLUGIN_LABELS[pluginId] || pluginId}</span>
            </label>
            {hint ? <p className="popup-plugin-note">{hint}</p> : null}
            {isMermaid ? (
              <label className="popup-plugin-subfield">
                <span className="popup-plugin-subfield__label">Renderer</span>
                <select
                  className="popup-input"
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
