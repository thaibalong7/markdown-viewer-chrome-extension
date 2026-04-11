import React from 'react'
import { Tooltip } from '../components/Tooltip.jsx'
import { PLUGIN_HINTS, PLUGIN_LABELS } from '../settings-constants.js'

/**
 * @param {{ pluginsSnapshot: Record<string, { enabled?: boolean }>, onPatch: (partial: object) => void }} props
 */
export function PluginsPanel({ pluginsSnapshot, onPatch }) {
  return (
    <>
      {Object.keys(pluginsSnapshot).map((pluginId) => (
        <label key={pluginId} className="popup-field popup-field-inline">
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
          <Tooltip content={PLUGIN_HINTS[pluginId] || ''}>
            <span className="popup-label">{PLUGIN_LABELS[pluginId] || pluginId}</span>
          </Tooltip>
        </label>
      ))}
    </>
  )
}
