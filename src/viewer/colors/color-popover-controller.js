import { colorDisplayValues } from './color-display-values.js'
import { createColorSourceCopy } from './color-copy-controller.js'
import { copyTextToClipboard } from '../../shared/clipboard.js'
import { COPY_BUTTON_FEEDBACK_MS } from '../../shared/constants/viewer.js'
import { logger } from '../../shared/logger.js'
import { mountContentUi, getContentOverlayTarget } from '../react/content/mount-content-ui.jsx'
import { ColorPopover } from '../react/content/colors/ColorPopover.jsx'
import { attachTooltip } from '../dom-tooltip.js'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../shared/constants/tooltip.js'

let nextId = 0

/** Article-local, non-modal color inspector. Owns its portal, listeners and pending feedback. */
export function createColorPopover({ articleEl, swatches }) {
  const doc = articleEl.ownerDocument
  const win = doc.defaultView
  const root = getContentOverlayTarget(articleEl)
  let panel = null
  let panelUi = null
  let rows = []
  let status = { text: '', error: false }
  let panelId = ''
  let opacity = null
  const panelRef = node => { panel = node }
  const onPanelEnter = () => win.clearTimeout(hideTimer)
  const onPanelFocus = () => { pinned = true }
  function panelProps() {
    return {
      id: panelId, source: anchor.dataset.mdpColor,
      color: anchor.style.getPropertyValue('--mdp-preview-color'),
      rows, opacity, status, panelRef,
      onEnter: onPanelEnter, onLeave: scheduleClose,
      onFocus: onPanelFocus, onCopy: copyRow
    }
  }
  function publish() { panelUi?.update(panelProps()) }
  function copyRow(row, button) {
    pinned = true
    tooltips.forEach(tip => tip.hide())
    void copy(button, row)
  }
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
      status = { text: '', error: false }
      publish()
      position()
    },
    onError(trigger, message) {
      open(trigger)
      status = { text: message, error: true }
      publish()
      position()
    }
  })

  function close(restoreFocus = false) {
    win.clearTimeout(hideTimer)
    win.clearTimeout(hoverTimer)
    tooltips.splice(0).forEach(tooltip => tooltip.destroy())
    for (const timer of timers.values()) win.clearTimeout(timer)
    timers.clear()
    const previous = anchor
    anchor?.setAttribute('aria-expanded', 'false')
    anchor?.removeAttribute('aria-controls')
    panelUi?.destroy()
    panelUi = null
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

  async function copy(button, row) {
    if (pendingCopies.has(button) || !button.isConnected) return
    const { value, format, tooltip } = row
    win.clearTimeout(timers.get(button))
    timers.delete(button)
    row.copied = row.error = false
    row.busy = true
    pendingCopies.add(button)
    publish()
    try {
      await copyTextToClipboard(value)
      if (!button.isConnected) return
      row.copied = true
      tooltip.setText(`${format} copied`)
      status = { text: `${format} copied to clipboard`, error: false }
      publish()
      position()
      timers.set(button, win.setTimeout(() => {
        timers.delete(button)
        row.copied = false
        tooltip.setText(`Copy ${format}: ${value}`)
        publish()
      }, COPY_BUTTON_FEEDBACK_MS))
    } catch (error) {
      logger.warn('Could not copy color format.', { errorName: error?.name || 'Error' })
      if (button.isConnected) {
        row.error = true
        status = { text: 'Could not copy. Select a value to copy manually.', error: true }
        tooltip.setText('Could not copy. Try again.')
        publish()
        position()
      }
    } finally {
      pendingCopies.delete(button)
      row.busy = false
      if (button.isConnected) {
        publish()
        if (!doc.activeElement || doc.activeElement === doc.body || doc.activeElement === button) button.focus({ preventScroll: true })
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
      panelId = `mdp-color-popover-${++nextId}`
      status = { text: '', error: false }
      const values = colorDisplayValues(swatches.get(trigger))
      opacity = values.opacity
      rows = values.rows.map(value => {
        const row = { ...value, busy: false, copied: false, error: false }
        row.buttonRef = node => { row.button = node }
        row.valueRef = node => { row.text = node }
        row.opacityRef = node => { row.alpha = node }
        return row
      })
      panelUi = mountContentUi(root, ColorPopover, panelProps(), { scope: articleEl })
      for (const row of rows) {
        tooltips.push(attachTooltip(row.text, { text: row.value, showDelayMs: VIEWER_TOOLTIP_DELAY_QUICK_MS }))
        if (row.alpha) tooltips.push(attachTooltip(row.alpha, { text: `Opacity: ${opacity}`, showDelayMs: VIEWER_TOOLTIP_DELAY_QUICK_MS }))
        row.tooltip = attachTooltip(row.button, { text: `Copy ${row.format}: ${row.value}`, showDelayMs: VIEWER_TOOLTIP_DELAY_QUICK_MS })
        tooltips.push(row.tooltip)
      }
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
    if (!event.target?.nodeType || !panel?.contains(event.target)) close(Boolean(panel?.contains(doc.activeElement)))
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
