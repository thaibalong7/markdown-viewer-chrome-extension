import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_TOAST_DURATION_MS = 2200

const ToastContext = createContext(null)

export function ToastProvider({ children, onShowToastReady }) {
  const [toastMessage, setToastMessage] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const hideTimerRef = useRef(0)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = 0
    }
  }, [])

  const showToast = useCallback(
    (message, durationMs = DEFAULT_TOAST_DURATION_MS) => {
      if (typeof message !== 'string' || !message.trim()) return
      const nextDuration =
        typeof durationMs === 'number' && durationMs > 0 ? durationMs : DEFAULT_TOAST_DURATION_MS

      clearHideTimer()
      setToastMessage(message)
      setIsVisible(true)
      hideTimerRef.current = window.setTimeout(() => {
        setIsVisible(false)
        hideTimerRef.current = 0
      }, nextDuration)
    },
    [clearHideTimer]
  )

  useEffect(() => {
    onShowToastReady?.(showToast)
    return () => {
      onShowToastReady?.(null)
    }
  }, [onShowToastReady, showToast])

  useEffect(() => () => clearHideTimer(), [clearHideTimer])

  const value = useMemo(
    () => ({
      toastMessage,
      isVisible,
      showToast
    }),
    [isVisible, showToast, toastMessage]
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider.')
  }
  return context
}
