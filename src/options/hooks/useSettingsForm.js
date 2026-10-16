import { useLanguageUpdates } from '../../i18n/react.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_SETTINGS } from '../../settings/default-settings.js'
import { getSettings, resetSettings, saveSettings } from '../../settings/settings-client.js'
import {
  SettingsValidationError,
  normalizeDocumentSettings,
  normalizeExplorerSettings,
  normalizeHistorySettings,
  normalizeThemeSettings,
  normalizeSettings
} from '../../settings/settings-schema.js'
import { clearRecentFiles, exportSettingsFile, readSettingsFile } from '../options-actions.js'
import { parseSettingsJson } from '../settings-import.js'
import { SCROLLBAR_VISIBILITY } from '../../shared/constants/scrollbar.js'
import { readImageFileAsDataUrl } from '../../shared/background-image.js'
import { logger } from '../../shared/logger.js'
import { createThemeAssetId } from '../../theme/index.js'
import { deleteThemeAsset, saveThemeAsset } from '../../theme/theme-asset-client.js'

function toExplorerDraft(explorer = DEFAULT_SETTINGS.explorer) {
  return {
    maxScanDepth: String(explorer.maxScanDepth),
    maxFiles: String(explorer.maxFiles),
    maxFolders: String(explorer.maxFolders)
  }
}

function toHistoryDraft(history = DEFAULT_SETTINGS.history) {
  return String(history.maxEntries)
}

function toDocumentDraft(documents = DEFAULT_SETTINGS.documents) {
  return String(documents.maxStandaloneTextFileSizeMiB)
}

function normalizeError(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function explorerFieldErrors(error) {
  if (!(error instanceof SettingsValidationError)) return {}
  return Object.fromEntries(
    Object.entries(error.fieldErrors)
      .filter(([key]) => key.startsWith('explorer.'))
      .map(([key, message]) => [key.slice('explorer.'.length), message])
  )
}

function historyFieldError(error) {
  if (!(error instanceof SettingsValidationError)) return ''
  return error.fieldErrors['history.maxEntries'] || error.fieldErrors.history || ''
}

function documentFieldError(error) {
  if (!(error instanceof SettingsValidationError)) return ''
  return error.fieldErrors['documents.maxStandaloneTextFileSizeMiB'] ||
    error.fieldErrors.documents || ''
}

export function useSettingsForm() {
  const [settings, setSettings] = useState(null)
  useLanguageUpdates(setSettings)
  const [explorerDraft, setExplorerDraft] = useState(() => toExplorerDraft())
  const [historyDraft, setHistoryDraft] = useState(() => toHistoryDraft())
  const [documentDraft, setDocumentDraft] = useState(() => toDocumentDraft())
  const [fieldErrors, setFieldErrors] = useState({})
  const [historyError, setHistoryError] = useState('')
  const [documentError, setDocumentError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [status, setStatus] = useState({ type: 'idle', message: 'options.notifications.loadingSettings' })

  const load = useCallback(async () => {
    setLoading(true)
    setStatus({ type: 'idle', message: 'options.notifications.loadingSettings' })
    try {
      const nextSettings = await getSettings()
      setSettings(nextSettings)
      setExplorerDraft(toExplorerDraft(nextSettings.explorer))
      setHistoryDraft(toHistoryDraft(nextSettings.history))
      setDocumentDraft(toDocumentDraft(nextSettings.documents))
      setFieldErrors({})
      setHistoryError('')
      setDocumentError('')
      setStatus({ type: 'success', message: 'options.notifications.settingsAreUpToDate' })
    } catch (error) {
      setStatus({ type: 'error', message: normalizeError(error, 'errors.options.notifications.loadSettings') })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const explorerDirty = useMemo(() => {
    if (!settings) return false
    const current = toExplorerDraft(settings.explorer)
    return Object.keys(current).some((field) => explorerDraft[field] !== current[field])
  }, [explorerDraft, settings])

  const historyDirty = useMemo(() => {
    if (!settings) return false
    return historyDraft !== toHistoryDraft(settings.history)
  }, [historyDraft, settings])

  const documentDirty = useMemo(() => {
    if (!settings) return false
    return documentDraft !== toDocumentDraft(settings.documents)
  }, [documentDraft, settings])

  const updateExplorerField = useCallback((field, value) => {
    setExplorerDraft((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
  }, [])

  const updateHistoryMaxEntries = useCallback((value) => {
    setHistoryDraft(value)
    setHistoryError('')
  }, [])

  const updateDocumentLimit = useCallback((value) => {
    setDocumentDraft(value)
    setDocumentError('')
  }, [])

  const persist = useCallback(async (action, successMessage, actionName = 'save') => {
    setBusyAction(actionName)
    setStatus({ type: 'idle', message: 'common.status.savingChanges' })
    try {
      const nextSettings = await action()
      setSettings(nextSettings)
      setStatus({ type: 'success', message: successMessage })
      return nextSettings
    } catch (error) {
      setStatus({ type: 'error', message: normalizeError(error, 'errors.options.notifications.saveSettings') })
      return null
    } finally {
      setBusyAction('')
    }
  }, [])

  const setEnabled = useCallback(
    (enabled) => persist(() => saveSettings({ enabled }), 'options.notifications.generalSettingsSaved', 'general'),
    [persist]
  )

  const setScrollbarAutoHide = useCallback(
    (enabled) =>
      persist(
        () => saveSettings({
          appearance: {
            scrollbarVisibility: enabled
              ? SCROLLBAR_VISIBILITY.AUTO
              : SCROLLBAR_VISIBILITY.ALWAYS
          }
        }),
        enabled ? 'options.notifications.documentScrollbarsWillAutoHide' : 'options.notifications.documentScrollbarsWillStayVisible',
        'scrollbarVisibility'
      ),
    [persist]
  )

  const setDocumentStatsVisible = useCallback(
    (showDocumentStats) =>
      persist(
        () => saveSettings({ appearance: { showDocumentStats } }),
        showDocumentStats
          ? 'options.notifications.documentStatisticsWillBeShown'
          : 'options.notifications.documentStatisticsWillBeHidden',
        'documentStats'
      ),
    [persist]
  )

  const setWatchMode = useCallback(
    (mode) => persist(() => saveSettings({ watch: { mode } }), 'options.notifications.watchModeUpdated', 'watchMode'),
    [persist]
  )

  const setLanguage = useCallback(
    (language) => persist(() => saveSettings({ language }), 'options.notifications.interfaceLanguageUpdated', 'language'),
    [persist]
  )

  const setActiveTheme = useCallback(
    (activeId) => persist(
      () => saveSettings({ theme: { activeId } }),
      'options.notifications.activeThemeUpdated',
      'themeSelect'
    ),
    [persist]
  )

  const saveCustomTheme = useCallback(async (draft, imageFile = null) => {
    if (!settings) return null
    const existingTheme = settings.theme.customThemes.find(({ id }) => id === draft.id)
    let uploadedAssetId = null
    const nextSettings = await persist(async () => {
      let nextTheme = { ...draft, colors: { ...draft.colors }, background: { ...draft.background } }
      if (imageFile) {
        uploadedAssetId = createThemeAssetId()
        const dataUrl = await readImageFileAsDataUrl(imageFile)
        await saveThemeAsset(uploadedAssetId, dataUrl)
        nextTheme = {
          ...nextTheme,
          background: {
            ...nextTheme.background,
            type: 'image',
            assetId: uploadedAssetId,
            assetRevision: Date.now()
          }
        }
      }
      const customThemes = existingTheme
        ? settings.theme.customThemes.map((theme) => theme.id === nextTheme.id ? nextTheme : theme)
        : [...settings.theme.customThemes, nextTheme]
      const theme = normalizeThemeSettings({ activeId: nextTheme.id, customThemes })
      return saveSettings({ theme })
    }, existingTheme ? 'options.notifications.customThemeSaved' : 'options.notifications.customThemeCreated', 'themeSave')

    if (!nextSettings && uploadedAssetId) {
      try {
        await deleteThemeAsset(uploadedAssetId)
      } catch (error) {
        logger.warn('Could not remove an unused theme asset after save failed.', error)
      }
    }
    const oldAssetId = existingTheme?.background?.assetId
    const savedTheme = nextSettings?.theme?.customThemes.find(({ id }) => id === draft.id)
    const nextAssetId = savedTheme?.background?.assetId
    if (nextSettings && oldAssetId && oldAssetId !== nextAssetId) {
      try {
        await deleteThemeAsset(oldAssetId)
      } catch (error) {
        logger.warn('Could not remove the replaced theme asset.', error)
      }
    }
    return nextSettings
  }, [persist, settings])

  const deleteCustomTheme = useCallback(async (themeId) => {
    if (!settings) return null
    const existingTheme = settings.theme.customThemes.find(({ id }) => id === themeId)
    if (!existingTheme) return settings
    const activeId = settings.theme.activeId === themeId ? existingTheme.baseId : settings.theme.activeId
    const customThemes = settings.theme.customThemes.filter(({ id }) => id !== themeId)
    const nextSettings = await persist(
      () => saveSettings({ theme: { activeId, customThemes } }),
      'options.notifications.customThemeDeleted',
      'themeDelete'
    )
    if (nextSettings && existingTheme.background?.assetId) {
      try {
        await deleteThemeAsset(existingTheme.background.assetId)
      } catch (error) {
        logger.warn('Could not remove the deleted theme asset.', error)
      }
    }
    return nextSettings
  }, [persist, settings])

  const saveExplorer = useCallback(async () => {
    let explorer
    try {
      explorer = normalizeExplorerSettings(explorerDraft)
      setFieldErrors({})
    } catch (error) {
      setFieldErrors(explorerFieldErrors(error))
      setStatus({ type: 'error', message: normalizeError(error, 'options.notifications.checkTheHighlightedFields') })
      return
    }

    const nextSettings = await persist(
      () => saveSettings({ explorer }),
      'options.notifications.filesWorkspaceSettingsSavedNewLimitsApplyTo',
      'explorer'
    )
    if (nextSettings) setExplorerDraft(toExplorerDraft(nextSettings.explorer))
  }, [explorerDraft, persist])

  const setExplorerBehavior = useCallback(
    (field, enabled) =>
      persist(
        () => saveSettings({ explorer: { [field]: enabled } }),
        field === 'showTreeIndentGuides'
          ? 'options.notifications.treeIndentGuidesSavedOpenViewersUpdateImmediately'
          : 'options.notifications.filesWorkspaceBehaviorSavedTheChangeAppliesTo',
        'explorerBehavior'
      ),
    [persist]
  )

  const resetExplorer = useCallback(async () => {
    setFieldErrors({})
    const nextSettings = await persist(
      () => saveSettings({ explorer: { ...DEFAULT_SETTINGS.explorer } }),
      'options.notifications.filesWorkspaceSettingsResetToDefaults',
      'explorerReset'
    )
    if (nextSettings) setExplorerDraft(toExplorerDraft(nextSettings.explorer))
  }, [persist])

  const setHistoryEnabled = useCallback(
    (enabled) =>
      persist(
        () => saveSettings({ history: { enabled } }),
        enabled
          ? 'options.notifications.recentFileHistoryEnabled'
          : 'options.notifications.recentFileHistoryDisabledExistingEntriesWereKept',
        'historyEnabled'
      ),
    [persist]
  )

  const saveHistoryLimit = useCallback(async () => {
    let history
    try {
      history = normalizeHistorySettings({ maxEntries: historyDraft })
      setHistoryError('')
    } catch (error) {
      setHistoryError(historyFieldError(error))
      setStatus({ type: 'error', message: normalizeError(error, 'options.notifications.checkTheHighlightedField') })
      return
    }

    const nextSettings = await persist(
      () => saveSettings({ history }),
      'options.notifications.recentFileRetentionSavedTheLimitAppliesOn',
      'historyLimit'
    )
    if (nextSettings) setHistoryDraft(toHistoryDraft(nextSettings.history))
  }, [historyDraft, persist])

  const clearHistory = useCallback(async () => {
    setBusyAction('historyClear')
    setStatus({ type: 'idle', message: 'options.notifications.clearingRecentFiles' })
    try {
      await clearRecentFiles()
      setStatus({ type: 'success', message: 'options.notifications.recentFileHistoryClearedFromThisDevice' })
    } catch (error) {
      setStatus({ type: 'error', message: normalizeError(error, 'errors.options.notifications.clearRecentFiles') })
    } finally {
      setBusyAction('')
    }
  }, [])

  const saveDocumentLimit = useCallback(async () => {
    let documents
    try {
      documents = normalizeDocumentSettings({ maxStandaloneTextFileSizeMiB: documentDraft })
      setDocumentError('')
    } catch (error) {
      setDocumentError(documentFieldError(error))
      setStatus({ type: 'error', message: normalizeError(error, 'options.notifications.checkTheHighlightedField') })
      return
    }

    const nextSettings = await persist(
      () => saveSettings({ documents }),
      'options.notifications.documentViewingLimitSavedTheChangeAppliesThe',
      'documentLimit'
    )
    if (nextSettings) setDocumentDraft(toDocumentDraft(nextSettings.documents))
  }, [documentDraft, persist])

  const resetDocumentLimit = useCallback(async () => {
    setDocumentError('')
    const nextSettings = await persist(
      () => saveSettings({ documents: { ...DEFAULT_SETTINGS.documents } }),
      'options.notifications.documentViewingLimitResetToTheDefault',
      'documentReset'
    )
    if (nextSettings) setDocumentDraft(toDocumentDraft(nextSettings.documents))
  }, [persist])

  const exportAll = useCallback(async () => {
    if (!settings) return
    setBusyAction('export')
    try {
      await exportSettingsFile(normalizeSettings(settings))
      setStatus({ type: 'success', message: 'options.notifications.settingsExported' })
    } catch (error) {
      setStatus({ type: 'error', message: normalizeError(error, 'errors.options.notifications.exportSettings') })
    } finally {
      setBusyAction('')
    }
  }, [settings])

  const importAll = useCallback(async (file) => {
    setBusyAction('import')
    setStatus({ type: 'idle', message: 'options.notifications.validatingSettingsFile' })
    try {
      const source = await readSettingsFile(file)
      const completeSettings = parseSettingsJson(source)
      const nextSettings = await saveSettings(completeSettings)
      setSettings(nextSettings)
      setExplorerDraft(toExplorerDraft(nextSettings.explorer))
      setHistoryDraft(toHistoryDraft(nextSettings.history))
      setDocumentDraft(toDocumentDraft(nextSettings.documents))
      setFieldErrors({})
      setHistoryError('')
      setDocumentError('')
      setStatus({ type: 'success', message: 'options.notifications.settingsImportedAndSaved' })
    } catch (error) {
      setStatus({ type: 'error', message: normalizeError(error, 'errors.options.notifications.importSettings') })
    } finally {
      setBusyAction('')
    }
  }, [])

  const resetAll = useCallback(async () => {
    const nextSettings = await persist(resetSettings, 'options.notifications.allSettingsResetToDefaults', 'resetAll')
    if (nextSettings) {
      setExplorerDraft(toExplorerDraft(nextSettings.explorer))
      setHistoryDraft(toHistoryDraft(nextSettings.history))
      setDocumentDraft(toDocumentDraft(nextSettings.documents))
      setFieldErrors({})
      setHistoryError('')
      setDocumentError('')
    }
  }, [persist])

  return {
    settings,
    explorerDraft,
    historyDraft,
    documentDraft,
    fieldErrors,
    historyFieldError: historyError,
    documentFieldError: documentError,
    explorerDirty,
    historyDirty,
    documentDirty,
    loading,
    busyAction,
    status,
    load,
    setEnabled,
    setScrollbarAutoHide,
    setDocumentStatsVisible,
    setWatchMode,
    setLanguage,
    setActiveTheme,
    saveCustomTheme,
    deleteCustomTheme,
    updateExplorerField,
    updateHistoryMaxEntries,
    updateDocumentLimit,
    setExplorerBehavior,
    setHistoryEnabled,
    saveExplorer,
    saveHistoryLimit,
    saveDocumentLimit,
    resetExplorer,
    clearHistory,
    resetDocumentLimit,
    exportAll,
    importAll,
    resetAll
  }
}
