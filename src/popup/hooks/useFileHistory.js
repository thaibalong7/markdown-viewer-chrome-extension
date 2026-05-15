import { useCallback, useEffect, useState } from 'react'
import { MESSAGE_TYPES, sendMessage } from '../../messaging/index.js'

export function useFileHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyUrl, setBusyUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const response = await sendMessage({ type: MESSAGE_TYPES.GET_FILE_HISTORY })
      if (!response?.ok) throw new Error(response?.error || 'Could not load file history.')
      setHistory(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const openHistoryEntry = useCallback(async (url) => {
    if (!url) return
    setBusyUrl(url)
    setErrorMessage('')
    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.OPEN_FILE_FROM_HISTORY,
        payload: { url }
      })
      if (!response?.ok) throw new Error(response?.error || 'Could not open file.')
      window.close()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusyUrl('')
    }
  }, [])

  const clearHistory = useCallback(async () => {
    setErrorMessage('')
    try {
      const response = await sendMessage({ type: MESSAGE_TYPES.CLEAR_FILE_HISTORY })
      if (!response?.ok) throw new Error(response?.error || 'Could not clear file history.')
      setHistory([])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    }
  }, [])

  return {
    history,
    loading,
    busyUrl,
    errorMessage,
    reloadHistory: loadHistory,
    openHistoryEntry,
    clearHistory
  }
}
