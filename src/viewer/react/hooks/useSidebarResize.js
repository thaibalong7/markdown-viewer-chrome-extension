import { useCallback, useEffect } from 'react'
import { getSidebarWidthPx, setSidebarWidthPx } from '../../explorer/explorer-state.js'
import { SIDEBAR_MAX_WIDTH_PX, SIDEBAR_MIN_WIDTH_PX } from '../../../shared/constants/viewer.js'

function clampSidebarWidth(widthPx) {
  const width = Number(widthPx)
  if (!Number.isFinite(width)) return SIDEBAR_MIN_WIDTH_PX
  return Math.max(SIDEBAR_MIN_WIDTH_PX, Math.min(SIDEBAR_MAX_WIDTH_PX, Math.round(width)))
}

export function useSidebarResize({ rootEl, sidebarEl, handleEl, settings }) {
  const resolveSidebarWidth = useCallback(() => {
    const layoutWidth = Number(settings?.layout?.tocWidth)
    const storedWidth = getSidebarWidthPx()
    const base = Number.isFinite(storedWidth) ? storedWidth : layoutWidth
    const fallback = 280
    return clampSidebarWidth(Number.isFinite(base) ? base : fallback)
  }, [settings])

  const setSidebarWidth = useCallback(
    (widthPx, { persist = false } = {}) => {
      if (!rootEl) return
      const clamped = clampSidebarWidth(widthPx)
      rootEl.style.setProperty('--mdp-toc-width', `${clamped}px`)
      if (handleEl) {
        handleEl.setAttribute('aria-valuenow', String(clamped))
      }
      if (persist) setSidebarWidthPx(clamped)
    },
    [rootEl, handleEl]
  )

  const applySidebarWidth = useCallback(() => {
    setSidebarWidth(resolveSidebarWidth(), { persist: false })
  }, [resolveSidebarWidth, setSidebarWidth])

  useEffect(() => {
    applySidebarWidth()
  }, [applySidebarWidth])

  useEffect(() => {
    if (!rootEl || !sidebarEl || !handleEl) return undefined

    let pointerMove = null
    let pointerUp = null

    const pointerDown = (event) => {
      if (event.button !== 0) return
      event.preventDefault()

      const startX = event.clientX
      const startWidth = sidebarEl.getBoundingClientRect().width
      rootEl.classList.add('is-resizing-sidebar')

      pointerMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX
        setSidebarWidth(startWidth + deltaX, { persist: false })
      }

      pointerUp = () => {
        const width = sidebarEl.getBoundingClientRect().width
        setSidebarWidth(width, { persist: true })
        rootEl.classList.remove('is-resizing-sidebar')
        if (pointerMove) {
          window.removeEventListener('pointermove', pointerMove)
        }
        if (pointerUp) {
          window.removeEventListener('pointerup', pointerUp)
        }
        pointerMove = null
        pointerUp = null
      }

      window.addEventListener('pointermove', pointerMove)
      window.addEventListener('pointerup', pointerUp)
    }

    const keyDown = (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
      event.preventDefault()
      const currentWidth = sidebarEl.getBoundingClientRect().width
      const delta = event.key === 'ArrowRight' ? 16 : -16
      setSidebarWidth(currentWidth + delta, { persist: true })
    }

    handleEl.addEventListener('pointerdown', pointerDown)
    handleEl.addEventListener('keydown', keyDown)

    return () => {
      rootEl.classList.remove('is-resizing-sidebar')
      if (pointerMove) {
        window.removeEventListener('pointermove', pointerMove)
      }
      if (pointerUp) {
        window.removeEventListener('pointerup', pointerUp)
      }
      handleEl.removeEventListener('pointerdown', pointerDown)
      handleEl.removeEventListener('keydown', keyDown)
    }
  }, [rootEl, sidebarEl, handleEl, setSidebarWidth])

  return { applySidebarWidth, resolveSidebarWidth, setSidebarWidth }
}
