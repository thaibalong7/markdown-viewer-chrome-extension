import React from 'react'
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
  const helperId = `${inputId}-helper`
  const errorId = `${inputId}-error`

  return (
    <section className="settings-section" aria-labelledby="privacy-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">Local data</p>
        <h2 id="privacy-title">Privacy & Data</h2>
        <p>Control whether Markdown Plus remembers local documents and how long that list can be.</p>
      </div>

      <form
        className="settings-card"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave()
        }}
        noValidate
      >
        <div className="settings-row settings-row--toggle">
          <div>
            <h3>Save recent files</h3>
            <p>
              Remember local Markdown files so they can be reopened from the Popup. Turning this
              off stops new entries; it does not delete entries already stored.
            </p>
          </div>
          <label className="settings-switch">
            <input
              type="checkbox"
              checked={settings.enabled !== false}
              disabled={busy}
              onChange={(event) => void onEnabledChange(event.target.checked)}
            />
            <span aria-hidden="true" />
            <span className="settings-sr-only">Save recent files</span>
          </label>
        </div>

        <div className="settings-divider" />

        <div className="settings-fields">
          <div className="settings-number-field">
            <div className="settings-number-field__copy">
              <label htmlFor={inputId}>{definition.label}</label>
              <p id={helperId}>Keep only the newest entries after the next history access.</p>
            </div>
            <div className="settings-number-field__control">
              <input
                id={inputId}
                type="number"
                inputMode="numeric"
                min={definition.min}
                max={definition.max}
                step="1"
                value={draft}
                disabled={busy}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={`${helperId}${fieldError ? ` ${errorId}` : ''}`}
                onChange={(event) => onMaxEntriesChange(event.target.value)}
              />
              <span className="settings-range">
                {definition.min}–{definition.max}
              </span>
              {fieldError ? (
                <span className="settings-field-error" id={errorId}>
                  {fieldError}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="settings-card__actions settings-card__actions--end">
          <button
            type="submit"
            className="settings-button settings-button--primary"
            disabled={!dirty || busy}
          >
            {busyAction === 'historyLimit' ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <div className="settings-card settings-card--secondary">
        <div className="settings-action-row settings-action-row--danger">
          <div>
            <h3>Clear recent files now</h3>
            <p>
              Recent file URLs contain local paths. They are stored only in extension-local
              storage on this device, separately from synced preferences.
            </p>
          </div>
          <button
            type="button"
            className="settings-button settings-button--danger"
            disabled={busy}
            onClick={() => {
              if (confirmClearRecentFiles()) void onClear()
            }}
          >
            {busyAction === 'historyClear' ? 'Clearing…' : 'Clear recent files'}
          </button>
        </div>
      </div>
    </section>
  )
}
