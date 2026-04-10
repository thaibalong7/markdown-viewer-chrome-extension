import React from 'react'

/**
 * @param {{ settings: object, onPatch: (partial: object) => void }} props
 */
export function GeneralPanel({ settings, onPatch }) {
  return (
    <label className="popup-field popup-field-inline">
      <input
        type="checkbox"
        checked={settings.enabled !== false}
        onChange={(event) => onPatch({ enabled: event.target.checked })}
      />
      <span className="popup-label">Enable Markdown Plus on local markdown files</span>
    </label>
  )
}
