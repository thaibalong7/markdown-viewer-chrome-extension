import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_SETTINGS } from '../../settings/default-settings.js'
import { getSettings, resetSettings, saveSettings } from '../../settings/settings-client.js'
import {
  SettingsValidationError,
  normalizeDocumentSettings,
  normalizeExplorerSettings,
  normalizeHistorySettings,
  normalizeSettings
} from '../../settings/settings-schema.js'
import { clearRecentFiles, exportSettingsFile, readSettingsFile } from '../options-actions.js'
import { parseSettingsJson } from '../settings-import.js'

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
  const [explorerDraft, setExplorerDraft] = useState(() => toExplorerDraft())
  const [historyDraft, setHistoryDraft] = useState(() => toHistoryDraft())
  const [documentDraft, setDocumentDraft] = useState(() => toDocumentDraft())
  const [fieldErrors, setFieldErrors] = useState({})
  const [historyError, setHistoryError] = useState('')
  const [documentError, setDocumentError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [status, setStatus] = useState({ type: 'idle', message: 'Loading settings…' })

  const load = useCallback(async () => {
    setLoading(true)
    setStatus({ type: 'idle', message: 'Loading settings…' })
    try {
      const nextSettings = await getSettings()
      setSettings(nextSettings)
      setExplorerDraft(toExplorerDraft(nextSettings.explorer))
      setHistoryDraft(toHistoryDraft(nextSettings.history))
      setDocumentDraft(toDocumentDraft(nextSettings.documents))
      setFieldErrors({})
      setHistoryError('')
      setDocumentError('')
      setStatus({ type: 'success', message: 'Settings are up to date.' })
    } catch (error) {
      setStatus({ type: 'error', message: normalizeError(error, 'Failed to load settings.') })
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
    setStatus({ type: 'idle', message: 'Saving changes…' })
    try {
      const nextSettings = await action()
      setSettings(nextSettings)
      setStatus({ type: 'success', message: successMessage })
      return nextSettings
    } catch (error) {
      setStatus({ type: 'error', message: normalizeError(error, 'Could not save settings.') })
      return null
    } finally {
      setBusyAction('')
    }
  }, [])

  const setEnabled = useCallback(
    (enabled) => persist(() => saveSettings({ enabled }), 'General settings saved.', 'general'),
    [persist]
  )

  const saveExplorer = useCallback(async () => {
    let explorer
    try {
      explorer = normalizeExplorerSettings(explorerDraft)
      setFieldErrors({})
    } catch (error) {
      setFieldErrors(explorerFieldErrors(error))
      setStatus({ type: 'error', message: normalizeError(error, 'Check the highlighted fields.') })
      return
    }

    const nextSettings = await persist(
      () => saveSettings({ explorer }),
      'Files & Workspace settings saved. New limits apply to the next scan or refresh.',
      'explorer'
    )
    if (nextSettings) setExplorerDraft(toExplorerDraft(nextSettings.explorer))
  }, [explorerDraft, persist])

  const setExplorerBehavior = useCallback(
    (field, enabled) =>
      persist(
        () => saveSettings({ explorer: { [field]: enabled } }),
        'Files & Workspace behavior saved. The change applies to the next scan or viewer open.',
        'explorerBehavior'
      ),
    [persist]
  )

  const resetExplorer = useCallback(async () => {
    setFieldErrors({})
    const nextSettings = await persist(
      () => saveSettings({ explorer: { ...DEFAULT_SETTINGS.explorer } }),
      'Files & Workspace settings reset to defaults.',
      'explorerReset'
    )
    if (nextSettings) setExplorerDraft(toExplorerDraft(nextSettings.explorer))
  }, [persist])

  const setHistoryEnabled = useCallback(
    (enabled) =>
      persist(
        () => saveSettings({ history: { enabled } }),
        enabled
          ? 'Recent file history enabled.'
          : 'Recent file history disabled. Existing entries were kept.',
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
      setStatus({ type: 'error', message: normalizeError(error, 'Check the highlighted field.') })
      return
    }

    const nextSettings = await persist(
      () => saveSettings({ history }),
      'Recent file retention saved. The limit applies on the next history access.',
      'historyLimit'
    )
    if (nextSettings) setHistoryDraft(toHistoryDraft(nextSettings.history))
  }, [historyDraft, persist])

  const clearHistory = useCallback(async () => {
    setBusyAction('historyClear')
    setStatus({ type: 'idle', message: 'Clearing recent files…' })
    try {
      await clearRecentFiles()
      setStatus({ type: 'success', message: 'Recent file history cleared from this device.' })
    } catch (error) {
      setStatus({ type: 'error', message: normalizeError(error, 'Failed to clear recent files.') })
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
      setStatus({ type: 'error', message: normalizeError(error, 'Check the highlighted field.') })
      return
    }

    const nextSettings = await persist(
      () => saveSettings({ documents }),
      'Document viewing limit saved. The change applies the next time a document is opened.',
      'documentLimit'
    )
    if (nextSettings) setDocumentDraft(toDocumentDraft(nextSettings.documents))
  }, [documentDraft, persist])

  const resetDocumentLimit = useCallback(async () => {
    setDocumentError('')
    const nextSettings = await persist(
      () => saveSettings({ documents: { ...DEFAULT_SETTINGS.documents } }),
      'Document viewing limit reset to the default.',
      'documentReset'
    )
    if (nextSettings) setDocumentDraft(toDocumentDraft(nextSettings.documents))
  }, [persist])

  const exportAll = useCallback(async () => {
    if (!settings) return
    setBusyAction('export')
    try {
      await exportSettingsFile(normalizeSettings(settings))
      setStatus({ type: 'success', message: 'Settings exported.' })
    } catch (error) {
      setStatus({ type: 'error', message: normalizeError(error, 'Failed to export settings.') })
    } finally {
      setBusyAction('')
    }
  }, [settings])

  const importAll = useCallback(async (file) => {
    setBusyAction('import')
    setStatus({ type: 'idle', message: 'Validating settings file…' })
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
      setStatus({ type: 'success', message: 'Settings imported and saved.' })
    } catch (error) {
      setStatus({ type: 'error', message: normalizeError(error, 'Failed to import settings.') })
    } finally {
      setBusyAction('')
    }
  }, [])

  const resetAll = useCallback(async () => {
    const nextSettings = await persist(resetSettings, 'All settings reset to defaults.', 'resetAll')
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
