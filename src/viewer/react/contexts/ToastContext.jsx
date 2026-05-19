import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_TOAST_DURATION_MS = 2200
const DEFAULT_TOAST_VARIANT = 'info'
const TOAST_VARIANTS = new Set(['info', 'success', 'warning', 'error'])

const ToastContext = createContext(null)

function normalizeToastOptions(optionsOrDuration) {
  if (typeof optionsOrDuration === 'number') {
    return {
      durationMs: optionsOrDuration,
      variant: DEFAULT_TOAST_VARIANT
    }
  }

  if (!optionsOrDuration || typeof optionsOrDuration !== 'object') {
    return {
      durationMs: DEFAULT_TOAST_DURATION_MS,
      variant: DEFAULT_TOAST_VARIANT
    }
  }

  const variant = TOAST_VARIANTS.has(optionsOrDuration.variant)
    ? optionsOrDuration.variant
    : DEFAULT_TOAST_VARIANT

  return {
    durationMs: optionsOrDuration.durationMs,
    variant
  }
}

export function ToastProvider({ children, onShowToastReady }) {
  const [toastMessage, setToastMessage] = useState('')
  const [toastVariant, setToastVariant] = useState(DEFAULT_TOAST_VARIANT)
  const [isVisible, setIsVisible] = useState(false)
  const hideTimerRef = useRef(0)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = 0
    }
  }, [])

  const showToast = useCallback(
    (message, optionsOrDuration = {}) => {
      if (typeof message !== 'string' || !message.trim()) return
      const { durationMs, variant } = normalizeToastOptions(optionsOrDuration)
      const nextDuration =
        typeof durationMs === 'number' && durationMs > 0 ? durationMs : DEFAULT_TOAST_DURATION_MS

      clearHideTimer()
      setToastMessage(message)
      setToastVariant(variant)
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
      toastVariant,
      isVisible,
      showToast
    }),
    [isVisible, showToast, toastMessage, toastVariant]
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
