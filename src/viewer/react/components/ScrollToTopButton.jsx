import React, { useCallback, useEffect, useRef, useState } from 'react'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../shared/constants/tooltip.js'
import { cancelViewerAnchorLock } from '../../scroll-utils.js'
import { AppIcon } from '../../../shared/react/AppIcon.jsx'
import { IconButton } from './common/IconButton.jsx'

const MIN_REVEAL_DISTANCE_PX = 320
const VIEWPORT_REVEAL_RATIO = 0.6

export function shouldShowScrollToTop({
  scrollTop = 0,
  scrollHeight = 0,
  clientHeight = 0
} = {}) {
  const viewport = Math.max(0, Number(clientHeight) || 0)
  const maxScrollTop = Math.max(0, (Number(scrollHeight) || 0) - viewport)
  if (maxScrollTop <= 1) return false

  const revealAt = Math.max(MIN_REVEAL_DISTANCE_PX, viewport * VIEWPORT_REVEAL_RATIO)
  return Number(scrollTop) >= revealAt
}

function prefersReducedMotion() {
  return globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
}

export function ScrollToTopButton({ scrollElement }) {
  const frameRef = useRef(0)
  const [visible, setVisible] = useState(false)

  const measure = useCallback(() => {
    if (!scrollElement) {
      setVisible(false)
      return
    }
    setVisible(shouldShowScrollToTop(scrollElement))
  }, [scrollElement])

  const scheduleMeasure = useCallback(() => {
    if (frameRef.current) return
    frameRef.current = globalThis.requestAnimationFrame(() => {
      frameRef.current = 0
      measure()
    })
  }, [measure])

  useEffect(() => {
    if (!scrollElement) {
      setVisible(false)
      return undefined
    }

    measure()
    scrollElement.addEventListener('scroll', scheduleMeasure, { passive: true })
    globalThis.window?.addEventListener('resize', scheduleMeasure)

    const resizeObserver = typeof globalThis.ResizeObserver === 'function'
      ? new globalThis.ResizeObserver(scheduleMeasure)
      : null
    resizeObserver?.observe(scrollElement)
    const content = scrollElement.querySelector?.('.mdp-markdown-body')
    if (content) resizeObserver?.observe(content)

    return () => {
      scrollElement.removeEventListener('scroll', scheduleMeasure)
      globalThis.window?.removeEventListener('resize', scheduleMeasure)
      resizeObserver?.disconnect()
      if (frameRef.current) globalThis.cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
    }
  }, [measure, scheduleMeasure, scrollElement])

  const handleClick = useCallback((event) => {
    if (!scrollElement) return
    event.currentTarget.blur()
    cancelViewerAnchorLock(scrollElement)
    scrollElement.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    })
  }, [scrollElement])

  return (
    <IconButton
      tooltip="Back to top"
      showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS}
      className={`mdp-scroll-to-top${visible ? ' is-visible' : ''}`}
      aria-label="Back to top"
      aria-hidden={visible ? 'false' : 'true'}
      tabIndex={visible ? 0 : -1}
      onClick={handleClick}
    >
      <AppIcon name="arrow-up" className="mdp-scroll-to-top__icon" />
    </IconButton>
  )
}
