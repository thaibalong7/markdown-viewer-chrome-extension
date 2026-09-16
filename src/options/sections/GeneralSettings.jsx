import React, { useEffect, useState } from 'react'
import { getFileSchemeAccess } from '../options-actions.js'

export function GeneralSettings({ settings, saving, onEnabledChange }) {
  const [fileAccess, setFileAccess] = useState({ state: 'loading', message: 'Checking…' })

  useEffect(() => {
    let active = true
    getFileSchemeAccess()
      .then((allowed) => {
        if (!active) return
        if (allowed === null) {
          setFileAccess({ state: 'unknown', message: 'Unavailable' })
        } else {
          setFileAccess({
            state: allowed ? 'allowed' : 'blocked',
            message: allowed ? 'Allowed' : 'Not allowed'
          })
        }
      })
      .catch((error) => {
        if (!active) return
        setFileAccess({
          state: 'unknown',
          message: error instanceof Error ? error.message : 'Could not check access'
        })
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="settings-section" aria-labelledby="general-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">Behavior</p>
        <h2 id="general-title">General</h2>
        <p>Control whether Markdown Plus activates for supported local Markdown files.</p>
      </div>

      <div className="settings-card">
        <div className="settings-row settings-row--toggle">
          <div>
            <h3>Enable Markdown Plus</h3>
            <p>Automatically open supported local Markdown files in the Markdown Plus viewer.</p>
          </div>
          <label className="settings-switch">
            <input
              type="checkbox"
              checked={settings.enabled !== false}
              disabled={saving}
              onChange={(event) => void onEnabledChange(event.target.checked)}
            />
            <span aria-hidden="true" />
            <span className="settings-sr-only">Enable Markdown Plus</span>
          </label>
        </div>

        <div className="settings-divider" />

        <div className="settings-row settings-row--access">
          <div>
            <h3>File URL access</h3>
            <p>
              Chrome controls this permission. If access is blocked, open
              <strong> chrome://extensions</strong>, choose Markdown Plus → Details, then enable
              “Allow access to file URLs”.
            </p>
          </div>
          <span className={`settings-badge settings-badge--${fileAccess.state}`}>
            {fileAccess.message}
          </span>
        </div>
      </div>
    </section>
  )
}
