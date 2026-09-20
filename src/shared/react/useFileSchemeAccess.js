import { useEffect, useState } from 'react'
import { getFileSchemeAccess } from '../file-scheme-access.js'

const INITIAL_STATE = Object.freeze({ state: 'checking', message: 'Checking…' })

export function toFileSchemeAccessState(allowed) {
  if (allowed === true) return { state: 'allowed', message: 'Allowed' }
  if (allowed === false) return { state: 'blocked', message: 'Not allowed' }
  return { state: 'unavailable', message: 'Unavailable' }
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
