import { copyTextToClipboard } from '../../shared/clipboard.js'
import { mountContentUi, getContentOverlayTarget } from '../react/content/mount-content-ui.jsx'
import { ColorCopyFeedback, ColorCopyStatus } from '../react/content/colors/ColorCopyFeedback.jsx'
import { logger } from '../../shared/logger.js'

/** Copies the detected literal verbatim with confirmation at its activation point. */
export function createColorSourceCopy({ articleEl, onError, onSuccess, onSettled, getAvoidRect }) {
  const doc = articleEl.ownerDocument
  const win = doc.defaultView
  const root = getContentOverlayTarget(articleEl)
  const status = mountContentUi(root, ColorCopyStatus, { text: '' }, { scope: articleEl })
  let feedback = null
  const pending = new Set()
  let destroyed = false
  let visual = null
  let visualPoint = null
  let visualTimer = 0
  let sequence = 0

  function clearVisual() {
    win.clearTimeout(visualTimer)
    visualTimer = 0
    feedback?.destroy()
    feedback = null
    visual = visualPoint = null
  }

  function onViewport() {
    sequence++ // A delayed clipboard write must not revive feedback at an old screen point.
    clearVisual()
  }

  function positionVisual() {
    if (!visual) return
    const label = visual.children[1]
    const { x, y } = visualPoint
    const w = label.offsetWidth
    const h = label.offsetHeight
    const pad = 8
    const maxX = Math.max(pad, win.innerWidth - w - pad)
    const maxY = Math.max(pad, win.innerHeight - h - pad)
    const avoid = getAvoidRect?.()
    const candidates = [[x + pad, y - h - pad], [x - w - pad, y - h - pad],
      [x + pad, y + pad], [x - w - pad, y + pad]]
      .map(([left, top]) => [Math.max(pad, Math.min(left, maxX)), Math.max(pad, Math.min(top, maxY))])
    const [left, top] = candidates.find(([a, b]) =>
      !avoid || a + w <= avoid.left || a >= avoid.right || b + h <= avoid.top || b >= avoid.bottom
    ) || candidates[0]
    label.style.left = `${left}px`
    label.style.top = `${top}px`
  }

  function showVisual(point) {
    clearVisual()
    feedback = mountContentUi(root, ColorCopyFeedback, { point, leaving: false, feedbackRef: node => { visual = node } }, { scope: articleEl })
    visualPoint = point
    positionVisual()
    visualTimer = win.setTimeout(() => {
      feedback?.update({ point, leaving: true, feedbackRef: node => { visual = node } })
      visualTimer = win.setTimeout(clearVisual, 180)
    }, 1020)
  }

  win.addEventListener('scroll', onViewport, true)
  win.addEventListener('resize', onViewport)

  async function copy(trigger, event) {
    if (destroyed || pending.has(trigger)) return
    const rect = trigger.getBoundingClientRect()
    const pointer = event?.detail > 0 && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)
    const point = pointer ? { x: event.clientX, y: event.clientY }
      : { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 }
    const copySequence = ++sequence
    clearVisual()
    const source = trigger.dataset.mdpColor
    pending.add(trigger)
    status.update({ text: '' })
    trigger.setAttribute('aria-busy', 'true')
    try {
      await copyTextToClipboard(source)
      if (destroyed || !trigger.isConnected) return
      status.update({ text: `Copied ${source}` })
      if (copySequence === sequence) {
        onSuccess?.(trigger)
        showVisual(point)
      }
    } catch (error) {
      if (destroyed || !trigger.isConnected) return
      logger.warn('Could not copy detected color.', { errorName: error?.name || 'Error' })
      const message = 'Could not copy color. Select the original text to copy manually.'
      if (copySequence === sequence && onError) onError(trigger, message)
      else status.update({ text: message })
    } finally {
      pending.delete(trigger)
      trigger.removeAttribute('aria-busy')
      if (!destroyed && trigger.isConnected) {
        // Clipboard fallback briefly focuses a textarea; do not steal focus from another control.
        if (!doc.activeElement || doc.activeElement === trigger || doc.activeElement === doc.body) {
          trigger.focus({ preventScroll: true })
        }
        onSettled?.()
      }
    }
  }

  return {
    copy,
    reposition: positionVisual,
    isCopying: () => pending.size > 0,
    destroy() {
      if (destroyed) return
      destroyed = true
      clearVisual()
      win.removeEventListener('scroll', onViewport, true)
      win.removeEventListener('resize', onViewport)
      for (const trigger of pending) trigger.removeAttribute('aria-busy')
      pending.clear()
      status.destroy()
    }
  }
}
