import { colorDisplayValues } from './color-display-values.js'
import { createColorSourceCopy } from './color-source-copy.js'
import { copyTextToClipboard } from '../../shared/clipboard.js'
import { COPY_BUTTON_FEEDBACK_MS } from '../../shared/constants/viewer.js'
import { logger } from '../../shared/logger.js'
import { createAppIconSvg } from '../../shared/icons/create-app-icon.js'
import { attachTooltip } from '../dom-tooltip.js'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../shared/constants/tooltip.js'

let nextId = 0

/** Article-local, non-modal color inspector. Owns its portal, listeners and pending feedback. */
export function createColorPopover({ articleEl, swatches }) {
  const doc = articleEl.ownerDocument
  const win = doc.defaultView
  const root = articleEl.closest('#mdp-viewer-root') || articleEl.parentElement
  let panel = null
  let anchor = null
  let pinned = false
  let hideTimer = 0
  let hoverTimer = 0
  let restoringFocus = false
  let deferredFocusClose = false
  const pendingCopies = new Set()
  const timers = new Map()
  const tooltips = []
  const sourceCopy = createColorSourceCopy({
    articleEl,
    onSettled: settleCopyFocus,
    getAvoidRect: () => panel?.getBoundingClientRect(),
    onSuccess(trigger) {
      if (anchor !== trigger || !panel) return
      const status = panel.querySelector('[role="status"]')
      status.classList.remove('is-error')
      status.textContent = ''
      position()
    },
    onError(trigger, message) {
      open(trigger)
      const status = panel.querySelector('[role="status"]')
      status.classList.add('is-error')
      status.textContent = message
      position()
    }
  })

  const element = (tag, className, text) => {
    const node = doc.createElement(tag)
    node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function close(restoreFocus = false) {
    win.clearTimeout(hideTimer)
    win.clearTimeout(hoverTimer)
    tooltips.splice(0).forEach(tooltip => tooltip.destroy())
    for (const timer of timers.values()) win.clearTimeout(timer)
    timers.clear()
    const previous = anchor
    anchor?.setAttribute('aria-expanded', 'false')
    anchor?.removeAttribute('aria-controls')
    panel?.remove()
    panel = anchor = null
    pinned = false
    deferredFocusClose = false
    if (restoreFocus && previous?.isConnected) {
      restoringFocus = true
      previous.focus({ preventScroll: true })
      restoringFocus = false
    }
  }

  function position() {
    if (!panel || !anchor) return
    const rect = anchor.getBoundingClientRect()
    const pad = 8
    panel.style.left = `${Math.max(pad, Math.min(rect.left, win.innerWidth - panel.offsetWidth - pad))}px`
    const below = rect.bottom + pad
    const top = below + panel.offsetHeight <= win.innerHeight - pad ? below : rect.top - panel.offsetHeight - pad
    panel.style.top = `${Math.max(pad, Math.min(top, win.innerHeight - panel.offsetHeight - pad))}px`
    sourceCopy.reposition()
  }

  function scheduleClose() {
    win.clearTimeout(hideTimer)
    const keyboardFocus = doc.activeElement === anchor && anchor?.matches(':focus-visible')
    if (!pinned && !keyboardFocus && !panel?.contains(doc.activeElement)) {
      hideTimer = win.setTimeout(() => close(), 160)
    }
  }

  function closeIfFocusOutside() {
    deferredFocusClose = Boolean(panel && doc.activeElement !== anchor && !panel.contains(doc.activeElement))
    if (deferredFocusClose && !pendingCopies.size && !sourceCopy.isCopying()) close()
  }

  function settleCopyFocus() { if (deferredFocusClose) closeIfFocusOutside() }

  async function copy(button, value, format, status, tooltip, text, display) {
    if (pendingCopies.has(button) || !button.isConnected) return
    win.clearTimeout(timers.get(button))
    timers.delete(button)
    button.classList.remove('is-copied', 'is-error')
    pendingCopies.add(button)
    button.disabled = true
    button.setAttribute('aria-busy', 'true')
    try {
      await copyTextToClipboard(value)
      if (!button.isConnected) return
      text.textContent = display
      button.classList.add('is-copied')
      tooltip.setText(`${format} copied`)
      status.classList.remove('is-error')
      status.textContent = `${format} copied to clipboard`
      position()
      const timer = win.setTimeout(() => {
        timers.delete(button)
        button.classList.remove('is-copied')
        tooltip.setText(`Copy ${format}: ${value}`)
      }, COPY_BUTTON_FEEDBACK_MS)
      timers.set(button, timer)
    } catch (error) {
      logger.warn('Could not copy color format.', { errorName: error?.name || 'Error' })
      if (button.isConnected) {
        text.textContent = value
        button.classList.add('is-error')
        status.classList.add('is-error')
        status.textContent = 'Could not copy. Select a value to copy manually.'
        tooltip.setText('Could not copy. Try again.')
        position()
      }
    } finally {
      pendingCopies.delete(button)
      button.disabled = false
      button.removeAttribute('aria-busy')
      if (button.isConnected && (!doc.activeElement || doc.activeElement === doc.body || doc.activeElement === button)) {
        button.focus({ preventScroll: true })
      }
      tooltip.hide()
      settleCopyFocus()
    }
  }

  function open(trigger, activate = false) {
    win.clearTimeout(hideTimer)
    win.clearTimeout(hoverTimer)
    if (anchor !== trigger) {
      close()
      anchor = trigger
      panel = element('section', 'mdp-color-popover')
      panel.id = `mdp-color-popover-${++nextId}`
      panel.setAttribute('role', 'dialog')
      panel.setAttribute('aria-label', `Color formats for ${trigger.dataset.mdpColor}`)
      const status = element('p', 'mdp-color-popover__status')
      status.setAttribute('role', 'status')
      status.setAttribute('aria-live', 'polite')
      const { rows, opacity } = colorDisplayValues(swatches.get(trigger))
      for (const { format, value, display } of rows) {
        const row = element('div', 'mdp-color-popover__row')
        const label = element('span', 'mdp-color-popover__label', format)
        const valueGroup = element('span', 'mdp-color-popover__value-group')
        const text = element('span', 'mdp-color-popover__value', display)
        text.setAttribute('aria-label', value)
        const valueTooltip = attachTooltip(text, { text: value, showDelayMs: VIEWER_TOOLTIP_DELAY_QUICK_MS })
        tooltips.push(valueTooltip)
        if (format === 'HEX') {
          const sample = element('span', 'mdp-color-popover__sample')
          sample.setAttribute('aria-hidden', 'true')
          sample.style.setProperty('--mdp-preview-color', trigger.style.getPropertyValue('--mdp-preview-color'))
          valueGroup.append(sample)
        }
        valueGroup.append(text)
        if (format === 'HEX' && opacity) {
          const alpha = element('span', 'mdp-color-popover__opacity', opacity)
          alpha.setAttribute('aria-label', `Opacity ${opacity}`)
          tooltips.push(attachTooltip(alpha, { text: `Opacity: ${opacity}`, showDelayMs: VIEWER_TOOLTIP_DELAY_QUICK_MS }))
          valueGroup.append(alpha)
        }
        const button = element('button', 'mdp-color-popover__copy')
        button.type = 'button'
        button.setAttribute('aria-label', `Copy ${format}`)
        button.append(
          createAppIconSvg('copy', { width: 16, height: 16, className: 'mdp-color-popover__copy-icon' }),
          createAppIconSvg('check', { width: 16, height: 16, className: 'mdp-color-popover__check-icon' })
        )
        const tooltip = attachTooltip(button, { text: `Copy ${format}: ${value}`, showDelayMs: VIEWER_TOOLTIP_DELAY_QUICK_MS })
        tooltips.push(tooltip)
        button.addEventListener('click', () => {
          pinned = true
          tooltips.forEach(tip => tip.hide())
          void copy(button, value, format, status, tooltip, text, display)
        })
        row.append(label, valueGroup, button)
        panel.append(row)
      }
      panel.append(status)
      panel.addEventListener('pointerenter', () => win.clearTimeout(hideTimer))
      panel.addEventListener('pointerleave', scheduleClose)
      panel.addEventListener('focusin', () => { pinned = true })
      root.append(panel)
      trigger.setAttribute('aria-expanded', 'true')
      trigger.setAttribute('aria-controls', panel.id)
      position()
    }
    if (activate) {
      pinned = true
      panel.querySelector('button').focus({ preventScroll: true })
      tooltips.forEach(tooltip => tooltip.hide())
    }
  }

  function getTrigger(event) {
    const trigger = event.target?.closest?.('.mdp-color-swatch')
    return swatches.has(trigger) ? trigger : null
  }
  const onClick = event => {
    const trigger = getTrigger(event)
    if (!trigger) return
    event.preventDefault()
    void sourceCopy.copy(trigger, event)
  }
  const onOver = event => {
    const trigger = getTrigger(event)
    if (trigger && !pinned) {
      win.clearTimeout(hoverTimer)
      win.clearTimeout(hideTimer)
      hoverTimer = win.setTimeout(() => open(trigger), 120)
    }
  }
  const onOut = event => {
    if (getTrigger(event)) {
      win.clearTimeout(hoverTimer)
      if (!panel?.contains(event.relatedTarget)) scheduleClose()
    }
  }
  const onFocus = event => {
    const trigger = getTrigger(event)
    if (trigger) {
      if (!restoringFocus && !pinned && trigger.matches(':focus-visible')) open(trigger)
    }
    closeIfFocusOutside()
  }
  const onPointer = event => {
    const path = event.composedPath()
    if (panel && !path.includes(panel) && !path.includes(anchor)) close()
  }
  const onKey = event => {
    const trigger = getTrigger(event)
    if (trigger && event.key === 'ArrowDown') {
      event.preventDefault()
      open(trigger, true)
      return
    }
    if (!panel) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
    } else if (event.key === 'Tab' && panel.contains(event.target)) {
      const buttons = [...panel.querySelectorAll('button')]
      if (event.shiftKey && event.target === buttons[0]) {
        event.preventDefault()
        close(true)
      } else if (!event.shiftKey && event.target === buttons.at(-1)) close(true)
    }
  }
  const onViewport = event => {
    if (!panel?.contains(event.target)) close(Boolean(panel?.contains(doc.activeElement)))
  }
  articleEl.addEventListener('click', onClick)
  articleEl.addEventListener('pointerover', onOver)
  articleEl.addEventListener('pointerout', onOut)
  doc.addEventListener('pointerdown', onPointer, true)
  doc.addEventListener('focusin', onFocus)
  doc.addEventListener('keydown', onKey, true)
  win.addEventListener('scroll', onViewport, true)
  win.addEventListener('resize', onViewport)
  return { destroy() {
    close()
    sourceCopy.destroy()
    pendingCopies.clear()
    articleEl.removeEventListener('click', onClick)
    articleEl.removeEventListener('pointerover', onOver)
    articleEl.removeEventListener('pointerout', onOut)
    doc.removeEventListener('pointerdown', onPointer, true)
    doc.removeEventListener('focusin', onFocus)
    doc.removeEventListener('keydown', onKey, true)
    win.removeEventListener('scroll', onViewport, true)
    win.removeEventListener('resize', onViewport)
  } }
}
