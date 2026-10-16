import { t } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
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
  useLocale()
  const fileInputRef = useRef(null)
  const busy = Boolean(busyAction)
  const definition = DOCUMENT_FIELDS.maxStandaloneTextFileSizeMiB
  const inputId = 'documents-maxStandaloneTextFileSizeMiB'

  return (
    <section className="settings-section" aria-labelledby="advanced-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">{t('options.advanced.resourcesRecovery')}</p>
        <h2 id="advanced-title">{t('options.advanced.title')}</h2>
        <p>{t('options.advanced.limitExpensiveDocumentLoadsMoveSettingsBetweenBrowsers')}</p>
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
            label={t(definition.labelKey)}
            helper='options.advanced.maximumUTF8SizeForStandaloneTxtSql'
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

        <Notice variant="warning" title={t('options.advanced.largeDocumentLoads')} className="settings-notice">{t('options.advanced.largerFilesUseMoreMemoryAndMayTake')}</Notice>

        <div className="mdp-ui-action-footer">
          <Button
            type="submit"
            variant="primary"
            busy={busyAction === 'documentLimit'}
            busyLabel={t('common.status.saving')}
            disabled={!dirty || busy}
          >{t('common.actions.saveChanges')}</Button>
          <Button
            variant="quiet"
            onClick={onResetDocumentLimit}
            disabled={busy}
          >{t('options.advanced.resetToDefault')}</Button>
        </div>
      </form>

      <div className="mdp-ui-card settings-card--secondary">
        <div className="mdp-ui-setting-row settings-action-row">
          <div>
            <h3 className="mdp-ui-setting-row__title">{t('options.advanced.exportSettings')}</h3>
            <p className="mdp-ui-setting-row__description">{t('options.advanced.downloadTheCompleteNormalizedSettingsObjectAsJSON')}</p>
          </div>
          <Button
            busy={busyAction === 'export'}
            busyLabel={t('options.advanced.exporting')}
            disabled={busy && busyAction !== 'export'}
            onClick={() => void onExport()}
          >{t('options.advanced.exportJSON')}</Button>
        </div>

        <div className="mdp-ui-divider" />

        <div className="mdp-ui-setting-row settings-action-row">
          <div>
            <h3 className="mdp-ui-setting-row__title">{t('options.advanced.importSettings')}</h3>
            <p className="mdp-ui-setting-row__description">{t('options.advanced.fileIsFullyParsedAndValidatedBeforeAny')}</p>
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
            busyLabel={t('options.advanced.importing')}
            disabled={busy && busyAction !== 'import'}
            onClick={() => fileInputRef.current?.click()}
          >{t('options.advanced.chooseJSON')}</Button>
        </div>

        <div className="mdp-ui-divider" />

        <div className="mdp-ui-setting-row settings-action-row settings-action-row--danger">
          <div>
            <h3 className="mdp-ui-setting-row__title">{t('options.advanced.resetAllSettings')}</h3>
            <p className="mdp-ui-setting-row__description">{t('options.advanced.restoreGeneralReaderEditorPluginsFilesWorkspacePrivacy')}</p>
          </div>
          <Button
            variant="danger"
            busy={busyAction === 'resetAll'}
            busyLabel={t('options.advanced.resetting')}
            disabled={busy && busyAction !== 'resetAll'}
            onClick={() => {
              if (confirmResetAllSettings()) void onResetAll()
            }}
          >{t('options.advanced.resetAllSettings')}</Button>
        </div>
      </div>
    </section>
  )
}
