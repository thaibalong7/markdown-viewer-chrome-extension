import { MESSAGE_TYPES } from '../messaging/index.js'
import { useEffect, useSyncExternalStore } from 'react'
import { getLocale, subscribeLocale, getLanguagePreference, setLanguage } from './index.js'

/** Subscribe each translated component, including independently mounted content portals. */
export function useLocale() {
  return useSyncExternalStore(subscribeLocale, getLocale, getLocale)
}

/** Extension pages receive the same settings notification as content scripts. */
export function useLanguageUpdates(onSettings) {
  useEffect(() => {
    const runtime = globalThis.chrome?.runtime
    const receive = message => {
      if (message?.type !== MESSAGE_TYPES.SETTINGS_UPDATED || !message.payload) return
      setLanguage(message.payload.language)
      onSettings?.(message.payload)
    }
    const languageChanged = () => setLanguage(getLanguagePreference())
    runtime?.onMessage?.addListener(receive)
    globalThis.addEventListener?.('languagechange', languageChanged)
    return () => {
      runtime?.onMessage?.removeListener(receive)
      globalThis.removeEventListener?.('languagechange', languageChanged)
    }
  }, [onSettings])
}
