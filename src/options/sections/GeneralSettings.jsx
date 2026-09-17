import React, { useEffect, useState } from 'react'
import { Badge } from '../../shared/react/Badge.jsx'
import { Switch } from '../../shared/react/Switch.jsx'
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

  const badgeVariant = fileAccess.state === 'allowed'
    ? 'success'
    : fileAccess.state === 'blocked'
      ? 'danger'
      : 'default'

  return (
    <section className="settings-section" aria-labelledby="general-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">Behavior</p>
        <h2 id="general-title">General</h2>
        <p>Control whether Markdown Plus activates for supported local Markdown files.</p>
      </div>

      <div className="mdp-ui-card">
        <div className="mdp-ui-setting-row settings-row--toggle">
          <div>
            <h3 className="mdp-ui-setting-row__title">Enable Markdown Plus</h3>
            <p className="mdp-ui-setting-row__description">Automatically open supported local Markdown files in the Markdown Plus viewer.</p>
          </div>
          <Switch
            id="general-enabled"
            label="Enable Markdown Plus"
            checked={settings.enabled !== false}
            disabled={saving}
            onChange={(event) => void onEnabledChange(event.target.checked)}
          />
        </div>

        <div className="mdp-ui-divider" />

        <div className="mdp-ui-setting-row settings-row--access">
          <div>
            <h3 className="mdp-ui-setting-row__title">File URL access</h3>
            <p className="mdp-ui-setting-row__description">
              Chrome controls this permission. If access is blocked, open
              <strong> chrome://extensions</strong>, choose Markdown Plus → Details, then enable
              “Allow access to file URLs”.
            </p>
          </div>
          <Badge variant={badgeVariant}>{fileAccess.message}</Badge>
        </div>
      </div>
    </section>
  )
}
