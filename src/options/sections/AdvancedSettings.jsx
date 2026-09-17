import React, { useRef } from 'react'
import { Button } from '../../shared/react/Button.jsx'
import { Notice } from '../../shared/react/Notice.jsx'
import { NumberField } from '../../shared/react/NumberField.jsx'
import { DOCUMENT_FIELDS } from '../../settings/settings-schema.js'
import { confirmResetAllSettings } from '../options-actions.js'

export function AdvancedSettings({
  draft,
  fieldError,
  dirty,
  busyAction,
  onFieldChange,
  onSaveDocumentLimit,
  onResetDocumentLimit,
  onExport,
  onImport,
  onResetAll
}) {
  const fileInputRef = useRef(null)
  const busy = Boolean(busyAction)
  const definition = DOCUMENT_FIELDS.maxStandaloneTextFileSizeMiB
  const inputId = 'documents-maxStandaloneTextFileSizeMiB'

  return (
    <section className="settings-section" aria-labelledby="advanced-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">Resources & recovery</p>
        <h2 id="advanced-title">Advanced</h2>
        <p>Limit expensive document loads, move settings between browsers, or restore defaults.</p>
      </div>

      <form
        className="mdp-ui-card"
        onSubmit={(event) => {
          event.preventDefault()
          void onSaveDocumentLimit()
        }}
        noValidate
      >
        <div className="settings-fields">
          <NumberField
            id={inputId}
            label={definition.label}
            helper="Maximum UTF-8 size for standalone .txt, .sql, and .mermaid files opened in the viewer. Markdown documents are not affected."
            error={fieldError}
            rangeLabel={`${definition.min}–${definition.max} MiB`}
            min={definition.min}
            max={definition.max}
            step="1"
            value={draft}
            disabled={busy}
            onChange={(event) => onFieldChange(event.target.value)}
          />
        </div>

        <Notice variant="warning" title="Large document loads" className="settings-notice">
          Larger files use more memory and may take longer to render. Changes apply on the next
          document open and do not reload the current document.
        </Notice>

        <div className="mdp-ui-action-footer">
          <Button
            type="submit"
            variant="primary"
            busy={busyAction === 'documentLimit'}
            busyLabel="Saving…"
            disabled={!dirty || busy}
          >
            Save changes
          </Button>
          <Button
            variant="quiet"
            onClick={onResetDocumentLimit}
            disabled={busy}
          >
            Reset to default
          </Button>
        </div>
      </form>

      <div className="mdp-ui-card settings-card--secondary">
        <div className="mdp-ui-setting-row settings-action-row">
          <div>
            <h3 className="mdp-ui-setting-row__title">Export settings</h3>
            <p className="mdp-ui-setting-row__description">Download the complete, normalized settings object as JSON.</p>
          </div>
          <Button
            busy={busyAction === 'export'}
            busyLabel="Exporting…"
            disabled={busy && busyAction !== 'export'}
            onClick={() => void onExport()}
          >
            Export JSON
          </Button>
        </div>

        <div className="mdp-ui-divider" />

        <div className="mdp-ui-setting-row settings-action-row">
          <div>
            <h3 className="mdp-ui-setting-row__title">Import settings</h3>
            <p className="mdp-ui-setting-row__description">The file is fully parsed and validated before any settings are saved.</p>
          </div>
          <input
            ref={fileInputRef}
            className="settings-file-input"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void onImport(file)
            }}
          />
          <Button
            busy={busyAction === 'import'}
            busyLabel="Importing…"
            disabled={busy && busyAction !== 'import'}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose JSON
          </Button>
        </div>

        <div className="mdp-ui-divider" />

        <div className="mdp-ui-setting-row settings-action-row settings-action-row--danger">
          <div>
            <h3 className="mdp-ui-setting-row__title">Reset all settings</h3>
            <p className="mdp-ui-setting-row__description">
              Restore General, Reader, Editor, Plugins, Files & Workspace, Privacy, and document
              resource preferences. Local recent-file data is cleared separately.
            </p>
          </div>
          <Button
            variant="danger"
            busy={busyAction === 'resetAll'}
            busyLabel="Resetting…"
            disabled={busy && busyAction !== 'resetAll'}
            onClick={() => {
              if (confirmResetAllSettings()) void onResetAll()
            }}
          >
            Reset all settings
          </Button>
        </div>
      </div>
    </section>
  )
}
