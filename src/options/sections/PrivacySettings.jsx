import React from 'react'
import { Button } from '../../shared/react/Button.jsx'
import { NumberField } from '../../shared/react/NumberField.jsx'
import { Switch } from '../../shared/react/Switch.jsx'
import { HISTORY_FIELDS } from '../../settings/settings-schema.js'
import { confirmClearRecentFiles } from '../options-actions.js'

export function PrivacySettings({
  settings,
  draft,
  fieldError,
  dirty,
  busyAction,
  onEnabledChange,
  onMaxEntriesChange,
  onSave,
  onClear
}) {
  const busy = Boolean(busyAction)
  const definition = HISTORY_FIELDS.maxEntries
  const inputId = 'history-maxEntries'

  return (
    <section className="settings-section" aria-labelledby="privacy-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">Local data</p>
        <h2 id="privacy-title">Privacy & Data</h2>
        <p>Control whether Markdown Plus remembers local documents and how long that list can be.</p>
      </div>

      <form
        className="mdp-ui-card"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave()
        }}
        noValidate
      >
        <div className="mdp-ui-setting-row settings-row--toggle">
          <div>
            <h3 className="mdp-ui-setting-row__title">Save recent files</h3>
            <p className="mdp-ui-setting-row__description">
              Remember local Markdown files so they can be reopened from the Popup. Turning this
              off stops new entries; it does not delete entries already stored.
            </p>
          </div>
          <Switch
            id="history-enabled"
            label="Save recent files"
            checked={settings.enabled !== false}
            disabled={busy}
            onChange={(event) => void onEnabledChange(event.target.checked)}
          />
        </div>

        <div className="mdp-ui-divider" />

        <div className="settings-fields">
          <NumberField
            id={inputId}
            label={definition.label}
            helper="Keep only the newest entries after the next history access."
            error={fieldError}
            rangeLabel={`${definition.min}–${definition.max}`}
            min={definition.min}
            max={definition.max}
            step="1"
            value={draft}
            disabled={busy}
            onChange={(event) => onMaxEntriesChange(event.target.value)}
          />
        </div>

        <div className="mdp-ui-action-footer mdp-ui-action-footer--end">
          <Button
            type="submit"
            variant="primary"
            busy={busyAction === 'historyLimit'}
            busyLabel="Saving…"
            disabled={!dirty || busy}
          >
            Save changes
          </Button>
        </div>
      </form>

      <div className="mdp-ui-card settings-card--secondary">
        <div className="mdp-ui-setting-row settings-action-row settings-action-row--danger">
          <div>
            <h3 className="mdp-ui-setting-row__title">Clear recent files now</h3>
            <p className="mdp-ui-setting-row__description">
              Recent file URLs contain local paths. They are stored only in extension-local
              storage on this device, separately from synced preferences.
            </p>
          </div>
          <Button
            variant="danger"
            busy={busyAction === 'historyClear'}
            busyLabel="Clearing…"
            disabled={busy && busyAction !== 'historyClear'}
            onClick={() => {
              if (confirmClearRecentFiles()) void onClear()
            }}
          >
            Clear recent files
          </Button>
        </div>
      </div>
    </section>
  )
}
