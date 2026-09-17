import React from 'react'
import { Button } from '../../shared/react/Button.jsx'
import { Notice } from '../../shared/react/Notice.jsx'
import { NumberField } from '../../shared/react/NumberField.jsx'
import { Switch } from '../../shared/react/Switch.jsx'
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
        className="mdp-ui-card"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave()
        }}
        noValidate
      >
        <div className="settings-policy-fields">
          <div className="mdp-ui-setting-row settings-row--toggle">
            <div>
              <h3 className="mdp-ui-setting-row__title">Respect .gitignore files</h3>
              <p className="mdp-ui-setting-row__description">Exclude files and folders ignored by nested .gitignore rules during workspace scans.</p>
            </div>
            <Switch
              id="explorer-respect-gitignore"
              label="Respect .gitignore files"
              checked={settings.respectGitignore !== false}
              disabled={saving}
              onChange={(event) =>
                void onBehaviorChange('respectGitignore', event.target.checked)
              }
            />
          </div>

          <div className="mdp-ui-divider" />

          <div className="mdp-ui-setting-row settings-row--toggle">
            <div>
              <h3 className="mdp-ui-setting-row__title">Restore last workspace</h3>
              <p className="mdp-ui-setting-row__description">
                Reopen the last file-backed workspace when a new viewer starts. Turning this off
                does not close the workspace currently in use.
              </p>
            </div>
            <Switch
              id="explorer-restore-workspace"
              label="Restore last workspace"
              checked={settings.restoreLastWorkspace !== false}
              disabled={saving}
              onChange={(event) =>
                void onBehaviorChange('restoreLastWorkspace', event.target.checked)
              }
            />
          </div>
        </div>

        <div className="mdp-ui-divider" />

        <div className="settings-fields">
          {Object.entries(EXPLORER_LIMIT_FIELDS).map(([field, definition]) => {
            const inputId = `explorer-${field}`
            const error = fieldErrors[field]
            return (
              <NumberField
                key={field}
                id={inputId}
                label={definition.label}
                helper={FIELD_COPY[field].helper}
                error={error}
                rangeLabel={`${definition.min.toLocaleString()}–${definition.max.toLocaleString()}`}
                min={definition.min}
                max={definition.max}
                step="1"
                value={draft[field]}
                disabled={saving}
                onChange={(event) => onFieldChange(field, event.target.value)}
              />
            )
          })}
        </div>

        <Notice variant="warning" title="Large workspace scans" className="settings-notice">
          Higher limits can make large workspace scans slower and use more memory. An active scan is
          never restarted automatically when these values change.
        </Notice>

        <div className="mdp-ui-action-footer">
          <Button
            type="submit"
            variant="primary"
            disabled={!dirty || saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button
            variant="quiet"
            onClick={onReset}
            disabled={saving}
          >
            Reset section to defaults
          </Button>
        </div>
      </form>
    </section>
  )
}
