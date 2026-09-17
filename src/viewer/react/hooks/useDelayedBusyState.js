import { useEffect, useRef, useState } from 'react'

export const BUSY_INDICATOR_DELAY_MS = 160
export const BUSY_INDICATOR_MIN_VISIBLE_MS = 260

export function createDelayedBusyStateController({
  onVisibleChange,
  delayMs = BUSY_INDICATOR_DELAY_MS,
  minVisibleMs = BUSY_INDICATOR_MIN_VISIBLE_MS,
  now = () => Date.now(),
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancel = (timer) => clearTimeout(timer)
} = {}) {
  let busy = false
  let visible = false
  let visibleSince = 0
  let showTimer = null
  let hideTimer = null

  const clearShowTimer = () => {
    if (showTimer == null) return
    cancel(showTimer)
    showTimer = null
  }

  const clearHideTimer = () => {
    if (hideTimer == null) return
    cancel(hideTimer)
    hideTimer = null
  }

  const setVisible = (nextVisible) => {
    if (visible === nextVisible) return
    visible = nextVisible
    if (visible) visibleSince = now()
    onVisibleChange?.(visible)
  }

  const update = (nextBusy) => {
    const normalizedBusy = Boolean(nextBusy)
    if (normalizedBusy === busy) return
    busy = normalizedBusy

    if (busy) {
      clearHideTimer()
      if (visible) return
      clearShowTimer()
      showTimer = schedule(() => {
        showTimer = null
        if (busy) setVisible(true)
      }, Math.max(0, delayMs))
      return
    }

    clearShowTimer()
    if (!visible) return
    const remainingMs = Math.max(0, minVisibleMs - (now() - visibleSince))
    if (remainingMs === 0) {
      setVisible(false)
      return
    }
    clearHideTimer()
    hideTimer = schedule(() => {
      hideTimer = null
      if (!busy) setVisible(false)
    }, remainingMs)
  }

  const destroy = () => {
    clearShowTimer()
    clearHideTimer()
  }

  return {
    update,
    destroy,
    isVisible: () => visible
  }
}

export function useDelayedBusyState(
  isBusy,
  {
    delayMs = BUSY_INDICATOR_DELAY_MS,
    minVisibleMs = BUSY_INDICATOR_MIN_VISIBLE_MS
  } = {}
) {
  const [visible, setVisible] = useState(false)
  const controllerRef = useRef(null)

  useEffect(() => {
    const controller = createDelayedBusyStateController({
      delayMs,
      minVisibleMs,
      onVisibleChange: setVisible
    })
    controllerRef.current = controller

    return () => {
      controller.destroy()
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [delayMs, minVisibleMs])

  useEffect(() => {
    controllerRef.current?.update(isBusy)
  }, [delayMs, isBusy, minVisibleMs])

  return visible
}
