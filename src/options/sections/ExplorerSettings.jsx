import React from 'react'
import { EXPLORER_LIMIT_FIELDS } from '../../settings/settings-schema.js'

const FIELD_COPY = {
  maxScanDepth: {
    helper: 'How many folder levels to scan below the selected root. Use 0 for the root only.'
  },
  maxFiles: {
    helper: 'Stop indexing after this many supported documents have been found.'
  },
  maxFolders: {
    helper: 'Stop the scan after this many folders have been visited.'
  }
}

export function ExplorerSettings({
  settings,
  draft,
  fieldErrors,
  dirty,
  saving,
  onFieldChange,
  onBehaviorChange,
  onSave,
  onReset
}) {
  return (
    <section className="settings-section" aria-labelledby="explorer-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">Scan policy</p>
        <h2 id="explorer-title">Files & Workspace</h2>
        <p>Set hard resource limits for folder scans. Changes apply on the next scan or refresh.</p>
      </div>

      <form
        className="settings-card"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave()
        }}
        noValidate
      >
        <div className="settings-policy-fields">
          <div className="settings-row settings-row--toggle">
            <div>
              <h3>Respect .gitignore files</h3>
              <p>Exclude files and folders ignored by nested .gitignore rules during workspace scans.</p>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={settings.respectGitignore !== false}
                disabled={saving}
                onChange={(event) =>
                  void onBehaviorChange('respectGitignore', event.target.checked)
                }
              />
              <span aria-hidden="true" />
              <span className="settings-sr-only">Respect .gitignore files</span>
            </label>
          </div>

          <div className="settings-divider" />

          <div className="settings-row settings-row--toggle">
            <div>
              <h3>Restore last workspace</h3>
              <p>
                Reopen the last file-backed workspace when a new viewer starts. Turning this off
                does not close the workspace currently in use.
              </p>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={settings.restoreLastWorkspace !== false}
                disabled={saving}
                onChange={(event) =>
                  void onBehaviorChange('restoreLastWorkspace', event.target.checked)
                }
              />
              <span aria-hidden="true" />
              <span className="settings-sr-only">Restore last workspace</span>
            </label>
          </div>
        </div>

        <div className="settings-divider" />

        <div className="settings-fields">
          {Object.entries(EXPLORER_LIMIT_FIELDS).map(([field, definition]) => {
            const inputId = `explorer-${field}`
            const errorId = `${inputId}-error`
            const helperId = `${inputId}-helper`
            const error = fieldErrors[field]
            return (
              <div className="settings-number-field" key={field}>
                <div className="settings-number-field__copy">
                  <label htmlFor={inputId}>{definition.label}</label>
                  <p id={helperId}>{FIELD_COPY[field].helper}</p>
                </div>
                <div className="settings-number-field__control">
                  <input
                    id={inputId}
                    type="number"
                    inputMode="numeric"
                    min={definition.min}
                    max={definition.max}
                    step="1"
                    value={draft[field]}
                    aria-invalid={Boolean(error)}
                    aria-describedby={`${helperId}${error ? ` ${errorId}` : ''}`}
                    onChange={(event) => onFieldChange(field, event.target.value)}
                  />
                  <span className="settings-range">
                    {definition.min.toLocaleString()}–{definition.max.toLocaleString()}
                  </span>
                  {error ? (
                    <span className="settings-field-error" id={errorId}>
                      {error}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        <div className="settings-notice">
          Higher limits can make large workspace scans slower and use more memory. An active scan is
          never restarted automatically when these values change.
        </div>

        <div className="settings-card__actions">
          <button
            type="button"
            className="settings-button settings-button--quiet"
            onClick={onReset}
            disabled={saving}
          >
            Reset section to defaults
          </button>
          <button
            type="submit"
            className="settings-button settings-button--primary"
            disabled={!dirty || saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  )
}
