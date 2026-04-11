import { attachTooltip } from './tooltip.js'
import { getSidebarWidthPx, setSidebarWidthPx } from './explorer/explorer-state.js'
import { SIDEBAR_MAX_WIDTH_PX, SIDEBAR_MIN_WIDTH_PX } from '../shared/constants/viewer.js'

/**
 * Sidebar drag + keyboard resize for the viewer shell.
 * @param {object} options
 * @param {() => import('./shell/viewer-shell.js').ShellParts | null | undefined} options.getParts
 * @param {() => object} options.getSettings
 */
export function createSidebarResize({ getParts, getSettings } = {}) {
  let resizeHandleTooltipDestroy = null
  /** @type {((e: PointerEvent) => void) | null} */
  let pointerDown = null
  /** @type {((e: PointerEvent) => void) | null} */
  let pointerMove = null
  /** @type {(() => void) | null} */
  let pointerUp = null
  /** @type {((e: KeyboardEvent) => void) | null} */
  let keyDown = null

  function clampSidebarWidth(widthPx) {
    const width = Number(widthPx)
    if (!Number.isFinite(width)) return SIDEBAR_MIN_WIDTH_PX
    return Math.max(SIDEBAR_MIN_WIDTH_PX, Math.min(SIDEBAR_MAX_WIDTH_PX, Math.round(width)))
  }

  function resolveSidebarWidth() {
    const layoutWidth = Number(getSettings()?.layout?.tocWidth)
    const storedWidth = getSidebarWidthPx()
    const base = Number.isFinite(storedWidth) ? storedWidth : layoutWidth
    const fallback = 280
    return clampSidebarWidth(Number.isFinite(base) ? base : fallback)
  }

  function setSidebarWidth(widthPx, { persist = false } = {}) {
    const parts = getParts()
    const root = parts?.root
    if (!root) return
    const clamped = clampSidebarWidth(widthPx)
    root.style.setProperty('--mdp-toc-width', `${clamped}px`)
    const handle = parts?.resizeHandle
    if (handle) handle.setAttribute('aria-valuenow', String(clamped))
    if (persist) setSidebarWidthPx(clamped)
  }

  function applySidebarWidth() {
    setSidebarWidth(resolveSidebarWidth(), { persist: false })
  }

  function init() {
    const parts = getParts()
    const { resizeHandle, root, sidebar } = parts || {}
    if (!resizeHandle || !root || !sidebar) return

    pointerDown = (event) => {
      if (event.button !== 0) return
      event.preventDefault()

      const startX = event.clientX
      const startWidth = sidebar.getBoundingClientRect().width
      root.classList.add('is-resizing-sidebar')

      pointerMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX
        setSidebarWidth(startWidth + deltaX, { persist: false })
      }

      pointerUp = () => {
        const width = sidebar.getBoundingClientRect().width
        setSidebarWidth(width, { persist: true })
        root.classList.remove('is-resizing-sidebar')
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

    keyDown = (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
      event.preventDefault()
      const currentWidth = sidebar.getBoundingClientRect().width
      const delta = event.key === 'ArrowRight' ? 16 : -16
      setSidebarWidth(currentWidth + delta, { persist: true })
    }

    resizeHandle.addEventListener('pointerdown', pointerDown)
    resizeHandle.addEventListener('keydown', keyDown)
    resizeHandleTooltipDestroy?.()
    resizeHandleTooltipDestroy = attachTooltip(resizeHandle, {
      text: 'Drag to resize the sidebar. When focused, use Left/Right Arrow keys (16px per step).'
    }).destroy
    applySidebarWidth()
  }

  function destroy() {
    resizeHandleTooltipDestroy?.()
    resizeHandleTooltipDestroy = null
    const parts = getParts()
    const { resizeHandle, root } = parts || {}
    root?.classList.remove('is-resizing-sidebar')
    if (pointerMove) {
      window.removeEventListener('pointermove', pointerMove)
    }
    if (pointerUp) {
      window.removeEventListener('pointerup', pointerUp)
    }
    if (resizeHandle && pointerDown) {
      resizeHandle.removeEventListener('pointerdown', pointerDown)
    }
    if (resizeHandle && keyDown) {
      resizeHandle.removeEventListener('keydown', keyDown)
    }
    pointerDown = null
    pointerMove = null
    pointerUp = null
    keyDown = null
  }

  return { init, applySidebarWidth, destroy, setSidebarWidth, resolveSidebarWidth }
}
