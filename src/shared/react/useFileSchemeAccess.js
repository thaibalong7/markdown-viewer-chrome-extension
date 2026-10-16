import { useEffect, useState } from 'react'
import { getFileSchemeAccess } from '../file-scheme-access.js'

const INITIAL_STATE = Object.freeze({ state: 'checking', message: 'common.status.checking' })

export function toFileSchemeAccessState(allowed) {
  if (allowed === true) return { state: 'allowed', message: 'common.fileAccess.allowed' }
  if (allowed === false) return { state: 'blocked', message: 'common.fileAccess.blocked' }
  return { state: 'unavailable', message: 'common.status.unavailable' }
}

export function useFileSchemeAccess() {
  const [fileAccess, setFileAccess] = useState(INITIAL_STATE)

  useEffect(() => {
    let active = true
    const refreshWhileActive = async () => {
      try {
        const allowed = await getFileSchemeAccess()
        if (active) setFileAccess(toFileSchemeAccessState(allowed))
      } catch {
        if (active) setFileAccess(toFileSchemeAccessState(null))
      }
    }
    const handleVisibilityChange = () => {
      if (globalThis.document?.visibilityState === 'visible') void refreshWhileActive()
    }

    void refreshWhileActive()
    globalThis.window?.addEventListener('focus', refreshWhileActive)
    globalThis.document?.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      globalThis.window?.removeEventListener('focus', refreshWhileActive)
      globalThis.document?.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return fileAccess
}
