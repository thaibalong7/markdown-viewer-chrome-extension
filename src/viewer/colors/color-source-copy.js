import { copyTextToClipboard } from '../../shared/clipboard.js'
import { createAppIconSvg } from '../../shared/icons/create-app-icon.js'
import { logger } from '../../shared/logger.js'

/** Copies the detected literal verbatim with confirmation at its activation point. */
export function createColorSourceCopy({ articleEl, onError, onSuccess, onSettled, getAvoidRect }) {
  const doc = articleEl.ownerDocument
  const win = doc.defaultView
  const root = articleEl.closest('#mdp-viewer-root') || articleEl.parentElement
  const status = doc.createElement('span')
  status.className = 'mdp-color-source-status'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  root.append(status)
  const pending = new Set()
  let destroyed = false
  let visual = null
  let visualPoint = null
  let visualTimer = 0
  let sequence = 0

  function clearVisual() {
    win.clearTimeout(visualTimer)
    visualTimer = 0
    visual?.remove()
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
    visual = doc.createElement('span')
    visual.className = 'mdp-color-copy-feedback'
    visual.setAttribute('aria-hidden', 'true')
    visual.style.left = `${point.x}px`
    visual.style.top = `${point.y}px`
    const pulse = doc.createElement('span')
    pulse.className = 'mdp-color-copy-feedback__pulse'
    const label = doc.createElement('span')
    label.className = 'mdp-color-copy-feedback__label'
    const text = doc.createElement('span')
    text.textContent = 'Copied'
    label.append(createAppIconSvg('check', { width: 14, height: 14 }), text)
    visual.append(pulse, label)
    // The portal keeps decorative text/SVG out of selectable Markdown and code.
    root.append(visual)
    visualPoint = point
    positionVisual()
    visualTimer = win.setTimeout(() => {
      visual.classList.add('is-leaving')
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
    status.textContent = ''
    trigger.setAttribute('aria-busy', 'true')
    try {
      await copyTextToClipboard(source)
      if (destroyed || !trigger.isConnected) return
      status.textContent = `Copied ${source}`
      if (copySequence === sequence) {
        onSuccess?.(trigger)
        showVisual(point)
      }
    } catch (error) {
      if (destroyed || !trigger.isConnected) return
      logger.warn('Could not copy detected color.', { errorName: error?.name || 'Error' })
      const message = 'Could not copy color. Select the original text to copy manually.'
      if (copySequence === sequence && onError) onError(trigger, message)
      else status.textContent = message
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
      status.remove()
    }
  }
}
