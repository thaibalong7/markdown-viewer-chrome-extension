import { t, translateMessage } from '../i18n/index.js'
import { useLocale } from '../i18n/react.js'
import React, { useEffect, useState } from 'react'
import { Button } from '../shared/react/Button.jsx'
import { SkeletonBlock } from '../shared/react/Skeleton.jsx'
import { useSettingsForm } from './hooks/useSettingsForm.js'
import { AboutSettings } from './sections/AboutSettings.jsx'
import { AdvancedSettings } from './sections/AdvancedSettings.jsx'
import { ExplorerSettings } from './sections/ExplorerSettings.jsx'
import { GeneralSettings } from './sections/GeneralSettings.jsx'
import { PrivacySettings } from './sections/PrivacySettings.jsx'
import { ThemeSettings } from './sections/ThemeSettings.jsx'

const SECTIONS = [
  { id: 'general', label: 'options.general.title', description: 'options.navigation.activationAndAccess' },
  { id: 'themes', label: 'options.themes.title', description: 'options.navigation.colorsAndBackgrounds' },
  { id: 'explorer', label: 'options.explorer.title', description: 'options.navigation.folderAppearanceAndScanLimits' },
  { id: 'privacy', label: 'options.privacy.title', description: 'options.navigation.recentLocalFiles' },
  { id: 'advanced', label: 'options.advanced.title', description: 'options.navigation.limitsBackupAndReset' },
  { id: 'about', label: 'options.about.title', description: 'options.navigation.versionPrivacyAndSupport', meta: true }
]

export function resolveSettingsSection(hash) {
  const sectionId = String(hash || '').replace(/^#/, '')
  return SECTIONS.some(({ id }) => id === sectionId) ? sectionId : SECTIONS[0].id
}

export function OptionsApp() {
  const locale = useLocale()
  const [activeSection, setActiveSection] = useState(() =>
    resolveSettingsSection(globalThis.location?.hash)
  )
  const form = useSettingsForm()
  const statusVariant = form.status.type === 'idle' ? 'info' : form.status.type

  useEffect(() => {
    function handleHashChange() {
      setActiveSection(resolveSettingsSection(globalThis.location?.hash))
    }

    globalThis.addEventListener?.('hashchange', handleHashChange)
    return () => globalThis.removeEventListener?.('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (globalThis.document) {
      globalThis.document.documentElement.lang = locale
      globalThis.document.title = activeSection === 'about'
        ? t('options.about.heading')
        : t('options.documentTitle')
    }
  }, [activeSection, locale])

  function navigateToSection(sectionId) {
    const nextSection = resolveSettingsSection(`#${sectionId}`)
    const nextHash = `#${nextSection}`
    if (globalThis.location?.hash === nextHash) {
      setActiveSection(nextSection)
      return
    }
    if (globalThis.location) globalThis.location.hash = nextSection
  }

  return (
    <div className="settings-app">
      <header className="settings-header">
        <div className="settings-header__inner">
          <div className="settings-brand">
            <img
              className="settings-brand__mark"
              src="/icons/icon-128.png"
              width="48"
              height="48"
              alt=""
              aria-hidden="true"
              draggable="false"
            />
            <div>
              <span className="settings-brand__name">{t('common.productName')}</span>
              <span className="settings-brand__page">{t('options.title')}</span>
            </div>
          </div>
          {activeSection !== 'about' ? <div
              className={`mdp-ui-status mdp-ui-status--${statusVariant} settings-status`}
              role="status"
              aria-live="polite"
            >
              <span className="mdp-ui-status__dot" aria-hidden="true" />
              {translateMessage(form.status.message)}
            </div> : null}
        </div>
      </header>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <label className="settings-mobile-nav" htmlFor="settings-section-select">
            <span>{t('options.navigation.section')}</span>
            <select
              id="settings-section-select"
              className="mdp-ui-select"
              value={activeSection}
              onChange={(event) => navigateToSection(event.target.value)}
            >
              {SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>{t(section.label)}</option>
              ))}
            </select>
          </label>

          <nav className="mdp-ui-side-nav settings-nav" aria-label={t('options.navigation.settingsSections')}>
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`mdp-ui-side-nav__item${section.meta ? ' settings-nav__item--meta' : ''}${activeSection === section.id ? ' is-active' : ''}`}
                aria-current={activeSection === section.id ? 'page' : undefined}
                onClick={() => navigateToSection(section.id)}
              >
                <strong>{t(section.label)}</strong>
                <small>{t(section.description)}</small>
              </button>
            ))}
          </nav>
        </aside>

        <main className="settings-main">
          {activeSection === 'about' ? <AboutSettings /> : form.loading ? <div className="mdp-ui-card settings-loading" aria-label={t('options.navigation.loadingSettings')} aria-busy="true">
              <SkeletonBlock
                lines={5}
                gap={16}
                lineHeight={18}
                widths={['34%', '72%', '100%', '88%', '56%']}
              />
            </div> : !form.settings ? <div className="mdp-ui-state mdp-ui-state--error settings-error-state">
              <strong className="mdp-ui-state__title">{t('options.navigation.settingsCouldNotBeLoaded')}</strong>
              <p className="mdp-ui-state__message">{translateMessage(form.status.message)}</p>
              <Button className="mdp-ui-state__action" onClick={() => void form.load()}>{t('common.actions.retry')}</Button>
            </div> : <>
              {activeSection === 'general' ? <GeneralSettings
                  settings={form.settings}
                  saving={form.busyAction !== ''}
                  onEnabledChange={form.setEnabled}
                  onScrollbarAutoHideChange={form.setScrollbarAutoHide}
                  onDocumentStatsVisibleChange={form.setDocumentStatsVisible}
                  onWatchModeChange={form.setWatchMode}
                  onLanguageChange={form.setLanguage}
                /> : null}
              {activeSection === 'explorer' ? <ExplorerSettings
                  settings={form.settings.explorer}
                  draft={form.explorerDraft}
                  fieldErrors={form.fieldErrors}
                  dirty={form.explorerDirty}
                  saving={form.busyAction !== ''}
                  onFieldChange={form.updateExplorerField}
                  onBehaviorChange={form.setExplorerBehavior}
                  onSave={form.saveExplorer}
                  onReset={form.resetExplorer}
                /> : null}
              {activeSection === 'themes' ? <ThemeSettings
                  settings={form.settings}
                  busyAction={form.busyAction}
                  onActiveThemeChange={form.setActiveTheme}
                  onSaveTheme={form.saveCustomTheme}
                  onDeleteTheme={form.deleteCustomTheme}
                /> : null}
              {activeSection === 'privacy' ? <PrivacySettings
                  settings={form.settings.history}
                  draft={form.historyDraft}
                  fieldError={form.historyFieldError}
                  dirty={form.historyDirty}
                  busyAction={form.busyAction}
                  onEnabledChange={form.setHistoryEnabled}
                  onMaxEntriesChange={form.updateHistoryMaxEntries}
                  onSave={form.saveHistoryLimit}
                  onClear={form.clearHistory}
                /> : null}
              {activeSection === 'advanced' ? <AdvancedSettings
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
                /> : null}
            </>}
        </main>
      </div>
    </div>
  )
}
