import React, { useState } from 'react'
import { Button } from '../shared/react/Button.jsx'
import { SkeletonBlock } from '../shared/react/Skeleton.jsx'
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
  const statusVariant = form.status.type === 'idle' ? 'info' : form.status.type

  return (
    <div className="settings-app">
      <header className="settings-header">
        <div className="settings-brand">
          <img
            className="settings-brand__mark"
            src="/icons/icon-48.png"
            width="48"
            height="48"
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <div>
            <span className="settings-brand__name">Markdown Plus</span>
            <span className="settings-brand__page">Settings</span>
          </div>
        </div>
        <div
          className={`mdp-ui-status mdp-ui-status--${statusVariant} settings-status`}
          role="status"
          aria-live="polite"
        >
          <span className="mdp-ui-status__dot" aria-hidden="true" />
          {form.status.message}
        </div>
      </header>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <label className="settings-mobile-nav" htmlFor="settings-section-select">
            <span>Section</span>
            <select
              id="settings-section-select"
              className="mdp-ui-select"
              value={activeSection}
              onChange={(event) => setActiveSection(event.target.value)}
            >
              {SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>{section.label}</option>
              ))}
            </select>
          </label>

          <nav className="mdp-ui-side-nav settings-nav" aria-label="Settings sections">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`mdp-ui-side-nav__item${activeSection === section.id ? ' is-active' : ''}`}
                aria-current={activeSection === section.id ? 'page' : undefined}
                onClick={() => setActiveSection(section.id)}
              >
                <strong>{section.label}</strong>
                <small>{section.description}</small>
              </button>
            ))}
          </nav>
        </aside>

        <main className="settings-main">
          {form.loading ? (
            <div className="mdp-ui-card settings-loading" aria-label="Loading settings" aria-busy="true">
              <SkeletonBlock
                lines={5}
                gap={16}
                lineHeight={18}
                widths={['34%', '72%', '100%', '88%', '56%']}
              />
            </div>
          ) : !form.settings ? (
            <div className="mdp-ui-state mdp-ui-state--error settings-error-state">
              <strong className="mdp-ui-state__title">Settings could not be loaded</strong>
              <p className="mdp-ui-state__message">{form.status.message}</p>
              <Button className="mdp-ui-state__action" onClick={() => void form.load()}>
                Try again
              </Button>
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
