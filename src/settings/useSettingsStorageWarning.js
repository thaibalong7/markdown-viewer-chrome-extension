import { useEffect, useSyncExternalStore } from 'react'
import { MESSAGE_TYPES } from '../messaging/index.js'
import { getSettingsStorageWarning, setSettingsStorageWarning, subscribeSettingsStorageWarning } from './settings-storage-status.js'

export function useSettingsStorageWarning() {
  useEffect(() => {
    const runtime = globalThis.chrome?.runtime
    const receive = message => {
      if (message?.type === MESSAGE_TYPES.SETTINGS_UPDATED) {
        setSettingsStorageWarning(message.storageWarning || null)
      }
    }
    runtime?.onMessage?.addListener(receive)
    return () => runtime?.onMessage?.removeListener(receive)
  }, [])
  return useSyncExternalStore(subscribeSettingsStorageWarning, getSettingsStorageWarning, getSettingsStorageWarning)
}
