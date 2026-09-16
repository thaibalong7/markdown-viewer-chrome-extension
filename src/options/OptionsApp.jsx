import React, { useState } from 'react'
import { useSettingsForm } from './hooks/useSettingsForm.js'
import { AdvancedSettings } from './sections/AdvancedSettings.jsx'
import { ExplorerSettings } from './sections/ExplorerSettings.jsx'
import { GeneralSettings } from './sections/GeneralSettings.jsx'
import { PrivacySettings } from './sections/PrivacySettings.jsx'

const SECTIONS = [
  { id: 'general', label: 'General', description: 'Activation and access' },
  { id: 'explorer', label: 'Files & Workspace', description: 'Folder scan limits' },
  { id: 'privacy', label: 'Privacy & Data', description: 'Recent local files' },
  { id: 'advanced', label: 'Advanced', description: 'Limits, backup, and reset' }
]

export function OptionsApp() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  const form = useSettingsForm()

  return (
    <div className="settings-app">
      <header className="settings-header">
        <div className="settings-brand">
          <span className="settings-brand__mark" aria-hidden="true">M+</span>
          <div>
            <span className="settings-brand__name">Markdown Plus</span>
            <span className="settings-brand__page">Settings</span>
          </div>
        </div>
        <div
          className={`settings-status settings-status--${form.status.type}`}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true" />
          {form.status.message}
        </div>
      </header>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <label className="settings-mobile-nav" htmlFor="settings-section-select">
            <span>Section</span>
            <select
              id="settings-section-select"
              value={activeSection}
              onChange={(event) => setActiveSection(event.target.value)}
            >
              {SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>{section.label}</option>
              ))}
            </select>
          </label>

          <nav className="settings-nav" aria-label="Settings sections">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? 'is-active' : ''}
                aria-current={activeSection === section.id ? 'page' : undefined}
                onClick={() => setActiveSection(section.id)}
              >
                <span>{section.label}</span>
                <small>{section.description}</small>
              </button>
            ))}
          </nav>
        </aside>

        <main className="settings-main">
          {form.loading ? (
            <div className="settings-loading" aria-label="Loading settings">
              <div />
              <div />
              <div />
            </div>
          ) : !form.settings ? (
            <div className="settings-error-state">
              <h2>Settings could not be loaded</h2>
              <p>{form.status.message}</p>
              <button type="button" className="settings-button" onClick={() => void form.load()}>
                Try again
              </button>
            </div>
          ) : (
            <>
              {activeSection === 'general' ? (
                <GeneralSettings
                  settings={form.settings}
                  saving={form.busyAction !== ''}
                  onEnabledChange={form.setEnabled}
                />
              ) : null}
              {activeSection === 'explorer' ? (
                <ExplorerSettings
                  settings={form.settings.explorer}
                  draft={form.explorerDraft}
                  fieldErrors={form.fieldErrors}
                  dirty={form.explorerDirty}
                  saving={form.busyAction !== ''}
                  onFieldChange={form.updateExplorerField}
                  onBehaviorChange={form.setExplorerBehavior}
                  onSave={form.saveExplorer}
                  onReset={form.resetExplorer}
                />
              ) : null}
              {activeSection === 'privacy' ? (
                <PrivacySettings
                  settings={form.settings.history}
                  draft={form.historyDraft}
                  fieldError={form.historyFieldError}
                  dirty={form.historyDirty}
                  busyAction={form.busyAction}
                  onEnabledChange={form.setHistoryEnabled}
                  onMaxEntriesChange={form.updateHistoryMaxEntries}
                  onSave={form.saveHistoryLimit}
                  onClear={form.clearHistory}
                />
              ) : null}
              {activeSection === 'advanced' ? (
                <AdvancedSettings
                  draft={form.documentDraft}
                  fieldError={form.documentFieldError}
                  dirty={form.documentDirty}
                  busyAction={form.busyAction}
                  onFieldChange={form.updateDocumentLimit}
                  onSaveDocumentLimit={form.saveDocumentLimit}
                  onResetDocumentLimit={form.resetDocumentLimit}
                  onExport={form.exportAll}
                  onImport={form.importAll}
                  onResetAll={form.resetAll}
                />
              ) : null}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
