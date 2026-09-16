import React, { useRef } from 'react'
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
  const helperId = `${inputId}-helper`
  const errorId = `${inputId}-error`

  return (
    <section className="settings-section" aria-labelledby="advanced-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">Resources & recovery</p>
        <h2 id="advanced-title">Advanced</h2>
        <p>Limit expensive document loads, move settings between browsers, or restore defaults.</p>
      </div>

      <form
        className="settings-card"
        onSubmit={(event) => {
          event.preventDefault()
          void onSaveDocumentLimit()
        }}
        noValidate
      >
        <div className="settings-fields">
          <div className="settings-number-field">
            <div className="settings-number-field__copy">
              <label htmlFor={inputId}>{definition.label}</label>
              <p id={helperId}>
                Maximum UTF-8 size for standalone .txt, .sql, and .mermaid files opened in the
                viewer. Markdown documents are not affected.
              </p>
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
                onChange={(event) => onFieldChange(event.target.value)}
              />
              <span className="settings-range">
                {definition.min}–{definition.max} MiB
              </span>
              {fieldError ? (
                <span className="settings-field-error" id={errorId}>
                  {fieldError}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="settings-notice">
          Larger files use more memory and may take longer to render. Changes apply on the next
          document open and do not reload the current document.
        </div>

        <div className="settings-card__actions">
          <button
            type="button"
            className="settings-button settings-button--quiet"
            onClick={onResetDocumentLimit}
            disabled={busy}
          >
            Reset to default
          </button>
          <button
            type="submit"
            className="settings-button settings-button--primary"
            disabled={!dirty || busy}
          >
            {busyAction === 'documentLimit' ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <div className="settings-card settings-card--secondary settings-card--advanced">
        <div className="settings-action-row">
          <div>
            <h3>Export settings</h3>
            <p>Download the complete, normalized settings object as JSON.</p>
          </div>
          <button type="button" className="settings-button" disabled={busy} onClick={() => void onExport()}>
            {busyAction === 'export' ? 'Exporting…' : 'Export JSON'}
          </button>
        </div>

        <div className="settings-divider" />

        <div className="settings-action-row">
          <div>
            <h3>Import settings</h3>
            <p>The file is fully parsed and validated before any settings are saved.</p>
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
          <button
            type="button"
            className="settings-button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {busyAction === 'import' ? 'Importing…' : 'Choose JSON'}
          </button>
        </div>

        <div className="settings-divider" />

        <div className="settings-action-row settings-action-row--danger">
          <div>
            <h3>Reset all settings</h3>
            <p>
              Restore General, Reader, Editor, Plugins, Files & Workspace, Privacy, and document
              resource preferences. Local recent-file data is cleared separately.
            </p>
          </div>
          <button
            type="button"
            className="settings-button settings-button--danger"
            disabled={busy}
            onClick={() => {
              if (confirmResetAllSettings()) void onResetAll()
            }}
          >
            {busyAction === 'resetAll' ? 'Resetting…' : 'Reset all settings'}
          </button>
        </div>
      </div>
    </section>
  )
}
