import { useCallback, useEffect } from 'react'
import {
  getFilesWidthPx,
  getSidebarWidthPx,
  setFilesWidthPx,
  setSidebarWidthPx
} from '../../explorer/explorer-state.js'
import { SIDEBAR_MAX_WIDTH_PX, SIDEBAR_MIN_WIDTH_PX } from '../../../shared/constants/viewer.js'

export function clampSidebarWidth(widthPx) {
  const width = Number(widthPx)
  if (!Number.isFinite(width)) return SIDEBAR_MIN_WIDTH_PX
  return Math.max(SIDEBAR_MIN_WIDTH_PX, Math.min(SIDEBAR_MAX_WIDTH_PX, Math.round(width)))
}

export function useSidebarResize({
  rootEl,
  sidebarEl,
  handleEl,
  settings,
  side = 'left',
  panel = 'outline'
}) {
  const isFilesPanel = panel === 'files'

  const resolveSidebarWidth = useCallback(() => {
    const configuredWidth = isFilesPanel ? Number.NaN : Number(settings?.layout?.tocWidth)
    const storedWidth = isFilesPanel ? getFilesWidthPx() : getSidebarWidthPx()
    const base = Number.isFinite(storedWidth) ? storedWidth : configuredWidth
    const fallback = isFilesPanel ? 264 : 280
    return clampSidebarWidth(Number.isFinite(base) ? base : fallback)
  }, [isFilesPanel, settings])

  const setSidebarWidth = useCallback(
    (widthPx, { persist = false } = {}) => {
      if (!rootEl) return
      const clamped = clampSidebarWidth(widthPx)
      rootEl.style.setProperty(isFilesPanel ? '--mdp-files-width' : '--mdp-toc-width', `${clamped}px`)
      if (handleEl) {
        handleEl.setAttribute('aria-valuenow', String(clamped))
      }
      if (persist) {
        if (isFilesPanel) setFilesWidthPx(clamped)
        else setSidebarWidthPx(clamped)
      }
    },
    [rootEl, handleEl, isFilesPanel]
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
      handleEl.classList.add('is-dragging')

      pointerMove = (moveEvent) => {
        const deltaX = side === 'right'
          ? startX - moveEvent.clientX
          : moveEvent.clientX - startX
        setSidebarWidth(startWidth + deltaX, { persist: false })
      }

      pointerUp = () => {
        const width = sidebarEl.getBoundingClientRect().width
        setSidebarWidth(width, { persist: true })
        rootEl.classList.remove('is-resizing-sidebar')
        handleEl.classList.remove('is-dragging')
        if (pointerMove) {
          window.removeEventListener('pointermove', pointerMove)
        }
        if (pointerUp) {
          window.removeEventListener('pointerup', pointerUp)
          window.removeEventListener('pointercancel', pointerUp)
        }
        pointerMove = null
        pointerUp = null
      }

      window.addEventListener('pointermove', pointerMove)
      window.addEventListener('pointerup', pointerUp)
      window.addEventListener('pointercancel', pointerUp)
    }

    const keyDown = (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
      event.preventDefault()
      const currentWidth = sidebarEl.getBoundingClientRect().width
      const delta = side === 'right'
        ? (event.key === 'ArrowLeft' ? 16 : -16)
        : (event.key === 'ArrowRight' ? 16 : -16)
      setSidebarWidth(currentWidth + delta, { persist: true })
    }

    handleEl.addEventListener('pointerdown', pointerDown)
    handleEl.addEventListener('keydown', keyDown)

    return () => {
      rootEl.classList.remove('is-resizing-sidebar')
      handleEl.classList.remove('is-dragging')
      if (pointerMove) {
        window.removeEventListener('pointermove', pointerMove)
      }
      if (pointerUp) {
        window.removeEventListener('pointerup', pointerUp)
        window.removeEventListener('pointercancel', pointerUp)
      }
      handleEl.removeEventListener('pointerdown', pointerDown)
      handleEl.removeEventListener('keydown', keyDown)
    }
  }, [rootEl, sidebarEl, handleEl, setSidebarWidth, side])

  return { applySidebarWidth, resolveSidebarWidth, setSidebarWidth }
}
