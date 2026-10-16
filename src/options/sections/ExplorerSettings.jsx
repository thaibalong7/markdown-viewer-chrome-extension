import { formatNumber, t, translateMessage } from '../../i18n/index.js'
import { useLocale } from '../../i18n/react.js'
import React from 'react'
import { Button } from '../../shared/react/Button.jsx'
import { Notice } from '../../shared/react/Notice.jsx'
import { NumberField } from '../../shared/react/NumberField.jsx'
import { Switch } from '../../shared/react/Switch.jsx'
import { EXPLORER_LIMIT_FIELDS } from '../../settings/settings-schema.js'

const FIELD_COPY = {
  maxScanDepth: {
    helper: 'options.explorer.howManyFolderLevelsToScanBelowThe'
  },
  maxFiles: {
    helper: 'options.explorer.stopIndexingAfterThisManySupportedDocumentsHave'
  },
  maxFolders: {
    helper: 'options.explorer.stopTheScanAfterThisManyFoldersHave'
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
  useLocale()
  return (
    <section className="settings-section" aria-labelledby="explorer-title">
      <div className="settings-section__heading">
        <p className="settings-eyebrow">{t('options.explorer.navigationScanning')}</p>
        <h2 id="explorer-title">{t('options.explorer.title')}</h2>
        <p>{t('options.explorer.customizeTheFileTreeAndWorkspaceBehaviorScan')}</p>
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
              <h3 className="mdp-ui-setting-row__title">{t('options.explorer.showTreeIndentGuides')}</h3>
              <p className="mdp-ui-setting-row__description">{t('options.explorer.connectFoldersAndFilesWithHierarchyLinesChanges')}</p>
            </div>
            <Switch
              id="explorer-show-tree-indent-guides"
              label={t('options.explorer.showTreeIndentGuides')}
              checked={settings.showTreeIndentGuides !== false}
              disabled={saving}
              onChange={(event) =>
                void onBehaviorChange('showTreeIndentGuides', event.target.checked)
              }
            />
          </div>

          <div className="mdp-ui-divider" />

          <div className="mdp-ui-setting-row settings-row--toggle">
            <div>
              <h3 className="mdp-ui-setting-row__title">{t('options.explorer.respectGitignoreFiles')}</h3>
              <p className="mdp-ui-setting-row__description">{t('options.explorer.excludeFilesAndFoldersIgnoredByNestedGitignore')}</p>
            </div>
            <Switch
              id="explorer-respect-gitignore"
              label={t('options.explorer.respectGitignoreFiles')}
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
              <h3 className="mdp-ui-setting-row__title">{t('options.explorer.restoreLastWorkspace')}</h3>
              <p className="mdp-ui-setting-row__description">{t('options.explorer.reopenTheLastFileBackedWorkspaceWhenA')}</p>
            </div>
            <Switch
              id="explorer-restore-workspace"
              label={t('options.explorer.restoreLastWorkspace')}
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
                label={t(definition.labelKey)}
                helper={FIELD_COPY[field].helper}
                error={translateMessage(error)}
                rangeLabel={`${formatNumber(definition.min)}–${formatNumber(definition.max)}`}
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

        <Notice variant="warning" title={t('options.explorer.largeWorkspaceScans')} className="settings-notice">{t('options.explorer.higherLimitsCanMakeLargeWorkspaceScansSlower')}</Notice>

        <div className="mdp-ui-action-footer">
          <Button
            type="submit"
            variant="primary"
            disabled={!dirty || saving}
          >
            {saving ? t('common.status.saving') : t('common.actions.saveChanges')}
          </Button>
          <Button
            variant="quiet"
            onClick={onReset}
            disabled={saving}
          >{t('options.explorer.resetSectionToDefaults')}</Button>
        </div>
      </form>
    </section>
  )
}
