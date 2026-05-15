import { useCallback, useEffect } from 'react'
import { EDITOR_SPLIT_MIN_PANE_WIDTH_PX } from '../../../shared/constants/viewer.js'
import {
  getEditorSplitWidthPx,
  setEditorSplitWidthPx
} from '../../explorer/explorer-state.js'

function clampNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * @param {number} widthPx
 * @param {number} totalPaneWidthPx
 * @param {number} [minPaneWidthPx]
 * @returns {number}
 */
export function clampEditorSplitWidth(
  widthPx,
  totalPaneWidthPx,
  minPaneWidthPx = EDITOR_SPLIT_MIN_PANE_WIDTH_PX
) {
  const requestedMin = Math.max(
    1,
    Math.round(clampNumber(minPaneWidthPx, EDITOR_SPLIT_MIN_PANE_WIDTH_PX))
  )
  const total = Math.max(2, Math.round(clampNumber(totalPaneWidthPx, requestedMin * 2)))
  const min = Math.max(1, Math.min(requestedMin, Math.floor(total / 2)))
  const max = Math.max(min, total - min)
  const width = Math.round(clampNumber(widthPx, total / 2))
  return Math.max(min, Math.min(max, width))
}

function getTotalPaneWidth(editorEl, previewEl) {
  const editorWidth = editorEl?.getBoundingClientRect?.().width ?? 0
  const previewWidth = previewEl?.getBoundingClientRect?.().width ?? 0
  return Math.max(0, editorWidth + previewWidth)
}

export function useEditorSplitResize({ rootEl, editorEl, previewEl, handleEl }) {
  const getCurrentTotalPaneWidth = useCallback(
    () => getTotalPaneWidth(editorEl, previewEl),
    [editorEl, previewEl]
  )

  const setEditorWidth = useCallback(
    (widthPx, { persist = false } = {}) => {
      if (!rootEl || !handleEl) return
      const total = getCurrentTotalPaneWidth()
      if (total <= 0) return

      const clamped = clampEditorSplitWidth(widthPx, total)
      rootEl.style.setProperty('--mdp-editor-pane-width', `${clamped}px`)
      handleEl.setAttribute('aria-valuenow', String(clamped))
      handleEl.setAttribute(
        'aria-valuemax',
        String(total - Math.min(EDITOR_SPLIT_MIN_PANE_WIDTH_PX, Math.floor(total / 2)))
      )
      if (persist) setEditorSplitWidthPx(clamped)
    },
    [getCurrentTotalPaneWidth, handleEl, rootEl]
  )

  const applyStoredEditorWidth = useCallback(() => {
    if (!handleEl) return
    const total = getCurrentTotalPaneWidth()
    if (total <= 0) return

    const storedWidth = getEditorSplitWidthPx()
    const currentWidth = editorEl?.getBoundingClientRect?.().width ?? 0
    const width = Number.isFinite(storedWidth) ? storedWidth : currentWidth
    const clamped = clampEditorSplitWidth(width, total)

    handleEl.setAttribute('aria-valuenow', String(clamped))
    handleEl.setAttribute(
      'aria-valuemax',
      String(total - Math.min(EDITOR_SPLIT_MIN_PANE_WIDTH_PX, Math.floor(total / 2)))
    )
    if (Number.isFinite(storedWidth)) {
      setEditorWidth(clamped, { persist: false })
    }
  }, [editorEl, getCurrentTotalPaneWidth, handleEl, setEditorWidth])

  useEffect(() => {
    applyStoredEditorWidth()
  }, [applyStoredEditorWidth])

  useEffect(() => {
    if (!rootEl || !editorEl || !previewEl || !handleEl) return undefined

    let pointerMove = null
    let pointerUp = null
    let resizeRaf = 0

    const scheduleClamp = () => {
      if (resizeRaf) return
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0
        const currentWidth = editorEl.getBoundingClientRect().width
        setEditorWidth(currentWidth, { persist: true })
      })
    }

    const pointerDown = (event) => {
      if (event.button !== 0) return
      event.preventDefault()

      const startX = event.clientX
      const startWidth = editorEl.getBoundingClientRect().width
      rootEl.classList.add('is-resizing-editor-split')

      pointerMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX
        setEditorWidth(startWidth + deltaX, { persist: false })
      }

      pointerUp = () => {
        const width = editorEl.getBoundingClientRect().width
        setEditorWidth(width, { persist: true })
        rootEl.classList.remove('is-resizing-editor-split')
        if (pointerMove) window.removeEventListener('pointermove', pointerMove)
        if (pointerUp) window.removeEventListener('pointerup', pointerUp)
        pointerMove = null
        pointerUp = null
      }

      window.addEventListener('pointermove', pointerMove)
      window.addEventListener('pointerup', pointerUp)
    }

    const keyDown = (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
      event.preventDefault()
      const currentWidth = editorEl.getBoundingClientRect().width
      const delta = event.key === 'ArrowRight' ? 16 : -16
      setEditorWidth(currentWidth + delta, { persist: true })
    }

    handleEl.addEventListener('pointerdown', pointerDown)
    handleEl.addEventListener('keydown', keyDown)
    window.addEventListener('resize', scheduleClamp)

    return () => {
      rootEl.classList.remove('is-resizing-editor-split')
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf)
      if (pointerMove) window.removeEventListener('pointermove', pointerMove)
      if (pointerUp) window.removeEventListener('pointerup', pointerUp)
      handleEl.removeEventListener('pointerdown', pointerDown)
      handleEl.removeEventListener('keydown', keyDown)
      window.removeEventListener('resize', scheduleClamp)
    }
  }, [editorEl, handleEl, previewEl, rootEl, setEditorWidth])

  return { applyStoredEditorWidth, setEditorWidth }
}
