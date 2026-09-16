import { useCallback, useEffect, useRef, useState } from 'react'
import { getSettings, saveSettings } from '../../settings/settings-client.js'
import { deepMerge } from '../../shared/deep-merge.js'

const DEBOUNCE_MS = 360

/**
 * Load settings from the background service worker and persist partial patches with debounce.
 */
export function useSettingsPersistence() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const persistTimerRef = useRef(null)
  const pendingPatchRef = useRef({})

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      setSettings(await getSettings())
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const persistPatchNow = useCallback(async (partial) => {
    setSaving(true)
    setErrorMessage('')
    try {
      setSettings(await saveSettings(partial))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }, [])

  const persistPatch = useCallback((partial) => {
    if (!partial) return
    setSettings((previous) => {
      if (!previous) return previous
      return deepMerge(previous, partial)
    })
    pendingPatchRef.current = deepMerge(pendingPatchRef.current, partial)
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
    }
    setSaving(true)
    persistTimerRef.current = setTimeout(() => {
      const patch = pendingPatchRef.current
      pendingPatchRef.current = {}
      persistTimerRef.current = null
      void persistPatchNow(patch)
    }, DEBOUNCE_MS)
  }, [persistPatchNow])

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current)
      }
    }
  }, [])

  return {
    settings,
    loading,
    saving,
    errorMessage,
    persistPatch,
    loadSettings
  }
}
