import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  normalizeScrollbarVisibility,
  SCROLLBAR_VISIBILITY
} from '../../../shared/constants/scrollbar.js'

const MIN_THUMB_SIZE = 48
const TRACK_INSET = 4
const TRACK_WIDTH = 12
const TRACK_EDGE_INSET = 2
const AUTO_HIDE_DELAY_MS = 1000
const INITIAL_REVEAL_MS = 1400

export function getViewerScrollbarMetrics({
  scrollTop = 0,
  scrollHeight = 0,
  clientHeight = 0,
  trackHeight = Math.max(0, clientHeight - TRACK_INSET)
} = {}) {
  const viewport = Math.max(0, Number(clientHeight) || 0)
  const content = Math.max(viewport, Number(scrollHeight) || 0)
  const track = Math.max(0, Number(trackHeight) || 0)
  const maxScrollTop = Math.max(0, content - viewport)

  if (!viewport || !track || maxScrollTop <= 1) {
    return { visible: false, thumbHeight: track, thumbOffset: 0, maxScrollTop, maxThumbOffset: 0 }
  }

  const thumbHeight = Math.min(track, Math.max(MIN_THUMB_SIZE, track * (viewport / content)))
  const maxThumbOffset = Math.max(0, track - thumbHeight)
  const clampedScrollTop = Math.min(maxScrollTop, Math.max(0, Number(scrollTop) || 0))
  const thumbOffset = maxScrollTop ? (clampedScrollTop / maxScrollTop) * maxThumbOffset : 0

  return { visible: true, thumbHeight, thumbOffset, maxScrollTop, maxThumbOffset }
}

export function getScrollTopForThumbOffset({ thumbOffset, maxThumbOffset, maxScrollTop }) {
  if (maxThumbOffset <= 0 || maxScrollTop <= 0) return 0
  const clampedOffset = Math.min(maxThumbOffset, Math.max(0, Number(thumbOffset) || 0))
  return (clampedOffset / maxThumbOffset) * maxScrollTop
}

export function ViewerScrollbar({
  scrollElement,
  visibility = SCROLLBAR_VISIBILITY.AUTO,
  label = 'Document scrollbar',
  variant = 'document',
  contentSelector = '.mdp-body, .mdp-markdown-body, .cm-content',
  contentVersion
}) {
  const trackRef = useRef(null)
  const dragRef = useRef(null)
  const frameRef = useRef(0)
  const hideTimerRef = useRef(0)
  const interactionRef = useRef({ hovered: false, focused: false })
  const [metrics, setMetrics] = useState(() => getViewerScrollbarMetrics())
  const [trackStyle, setTrackStyle] = useState(null)
  const [activityVisible, setActivityVisible] = useState(true)
  const visibilityMode = normalizeScrollbarVisibility(visibility)

  const clearHideTimer = useCallback(() => {
    if (!hideTimerRef.current) return
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = 0
  }, [])

  const scheduleHide = useCallback((delay = AUTO_HIDE_DELAY_MS) => {
    clearHideTimer()
    if (visibilityMode === SCROLLBAR_VISIBILITY.ALWAYS) return
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = 0
      const interaction = interactionRef.current
      if (!interaction.hovered && !interaction.focused && !dragRef.current) {
        setActivityVisible(false)
      }
    }, delay)
  }, [clearHideTimer, visibilityMode])

  const reveal = useCallback((delay = AUTO_HIDE_DELAY_MS) => {
    setActivityVisible(true)
    scheduleHide(delay)
  }, [scheduleHide])

  const measure = useCallback(() => {
    if (!scrollElement) return
    const trackHeight = Math.max(0, scrollElement.clientHeight - TRACK_INSET)
    const bounds = scrollElement.getBoundingClientRect()
    const viewportWidth = Math.max(0, globalThis.window?.innerWidth || bounds.right)
    const sidebar = variant === 'sidebar'
    const rightEdge = Math.min(viewportWidth, bounds.right) - (sidebar ? 0 : TRACK_EDGE_INSET)
    setTrackStyle({
      top: `${bounds.top + TRACK_EDGE_INSET}px`,
      left: `${Math.max(bounds.left, rightEdge - (sidebar ? 8 : TRACK_WIDTH))}px`,
      height: `${trackHeight}px`
    })
    setMetrics(getViewerScrollbarMetrics({
      scrollTop: scrollElement.scrollTop,
      scrollHeight: scrollElement.scrollHeight,
      clientHeight: scrollElement.clientHeight,
      trackHeight
    }))
  }, [scrollElement, variant])

  const scheduleMeasure = useCallback(() => {
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0
      measure()
    })
  }, [measure])

  useEffect(() => {
    if (!scrollElement) return undefined

    const handleScroll = () => {
      scheduleMeasure()
      reveal()
    }

    measure()
    reveal(INITIAL_REVEAL_MS)
    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', scheduleMeasure)

    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(scheduleMeasure)
      : null
    resizeObserver?.observe(scrollElement)
    for (const content of scrollElement.querySelectorAll(contentSelector)) {
      resizeObserver?.observe(content)
    }

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', scheduleMeasure)
      resizeObserver?.disconnect()
      clearHideTimer()
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
    }
  }, [clearHideTimer, contentSelector, contentVersion, measure, reveal, scheduleMeasure, scrollElement])

  useEffect(() => {
    if (visibilityMode === SCROLLBAR_VISIBILITY.ALWAYS) {
      clearHideTimer()
      setActivityVisible(true)
      return undefined
    }
    reveal(INITIAL_REVEAL_MS)
    return clearHideTimer
  }, [clearHideTimer, reveal, visibilityMode])

  const updateScrollFromThumbOffset = useCallback((thumbOffset) => {
    if (!scrollElement) return
    scrollElement.scrollTop = getScrollTopForThumbOffset({
      thumbOffset,
      maxThumbOffset: metrics.maxThumbOffset,
      maxScrollTop: metrics.maxScrollTop
    })
  }, [metrics.maxScrollTop, metrics.maxThumbOffset, scrollElement])

  const handleThumbPointerDown = useCallback((event) => {
    if (!scrollElement || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffset: metrics.thumbOffset
    }
    clearHideTimer()
    setActivityVisible(true)
  }, [clearHideTimer, metrics.thumbOffset, scrollElement])

  const handleThumbPointerMove = useCallback((event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    updateScrollFromThumbOffset(drag.startOffset + event.clientY - drag.startY)
  }, [updateScrollFromThumbOffset])

  const handleThumbPointerUp = useCallback((event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    scheduleHide()
  }, [scheduleHide])

  const handleTrackPointerDown = useCallback((event) => {
    if (!scrollElement || event.button !== 0 || event.target !== event.currentTarget) return
    const bounds = trackRef.current?.getBoundingClientRect()
    if (!bounds) return
    updateScrollFromThumbOffset(event.clientY - bounds.top - (metrics.thumbHeight / 2))
  }, [metrics.thumbHeight, scrollElement, updateScrollFromThumbOffset])

  const handleKeyDown = useCallback((event) => {
    if (!scrollElement) return
    const pageStep = Math.max(48, scrollElement.clientHeight * 0.85)
    const nextScrollTop = (() => {
      if (event.key === 'ArrowUp') return scrollElement.scrollTop - 48
      if (event.key === 'ArrowDown') return scrollElement.scrollTop + 48
      if (event.key === 'PageUp') return scrollElement.scrollTop - pageStep
      if (event.key === 'PageDown') return scrollElement.scrollTop + pageStep
      if (event.key === 'Home') return 0
      if (event.key === 'End') return metrics.maxScrollTop
      return null
    })()
    if (nextScrollTop == null) return
    event.preventDefault()
    scrollElement.scrollTop = nextScrollTop
    reveal()
  }, [metrics.maxScrollTop, reveal, scrollElement])

  const handlePointerEnter = useCallback(() => {
    interactionRef.current.hovered = true
    clearHideTimer()
    setActivityVisible(true)
  }, [clearHideTimer])

  const handlePointerLeave = useCallback(() => {
    interactionRef.current.hovered = false
    scheduleHide()
  }, [scheduleHide])

  const handleFocus = useCallback(() => {
    interactionRef.current.focused = true
    clearHideTimer()
    setActivityVisible(true)
  }, [clearHideTimer])

  const handleBlur = useCallback(() => {
    interactionRef.current.focused = false
    scheduleHide()
  }, [scheduleHide])

  if (!scrollElement || !metrics.visible || !trackStyle) return null

  const isActive = visibilityMode === SCROLLBAR_VISIBILITY.ALWAYS || activityVisible

  const scrollbar = (
    <div
      ref={trackRef}
      className={`mdp-viewer-scrollbar${variant === 'sidebar' ? ' mdp-viewer-scrollbar--sidebar' : ''}${isActive ? ' is-active' : ''}`}
      style={trackStyle}
      role="scrollbar"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={Math.round(metrics.maxScrollTop)}
      aria-valuenow={Math.round(scrollElement?.scrollTop || 0)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handleTrackPointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div
        className="mdp-viewer-scrollbar__thumb"
        style={{
          height: `${metrics.thumbHeight}px`,
          transform: `translateY(${metrics.thumbOffset}px)`
        }}
        onPointerDown={handleThumbPointerDown}
        onPointerMove={handleThumbPointerMove}
        onPointerUp={handleThumbPointerUp}
        onPointerCancel={handleThumbPointerUp}
      />
    </div>
  )
  // Rails can establish fixed-position containing blocks through backdrop-filter.
  // Keep viewport coordinates in the Viewer root, outside those filtered layers.
  const portalRoot = variant === 'sidebar' ? scrollElement.closest('.mdp-root') : null
  return portalRoot ? createPortal(scrollbar, portalRoot) : scrollbar
}
