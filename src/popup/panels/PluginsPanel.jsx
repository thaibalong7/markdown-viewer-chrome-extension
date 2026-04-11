import React from 'react'
import { PLUGIN_HINTS, PLUGIN_LABELS } from '../settings-constants.js'

/**
 * @param {{ pluginsSnapshot: Record<string, { enabled?: boolean }>, onPatch: (partial: object) => void }} props
 */
export function PluginsPanel({ pluginsSnapshot, onPatch }) {
  return (
    <>
      {Object.keys(pluginsSnapshot).map((pluginId) => {
        const hint = PLUGIN_HINTS[pluginId]
        return (
          <div key={pluginId} className="popup-field popup-plugin-item">
            <label className="popup-field-inline">
              <input
                type="checkbox"
                checked={pluginsSnapshot?.[pluginId]?.enabled !== false}
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
          </div>
        )
      })}
    </>
  )
}
