import { exportMermaidPng, exportMermaidSvg } from './mermaid-export.js'
import { openMermaidLightbox } from '../../viewer/media/mermaid-lightbox-controller.js'
import { logger } from '../../shared/logger.js'
import { mountContentUi, getContentOverlayTarget } from '../../viewer/react/content/mount-content-ui.jsx'
import { MermaidCopyControl, MermaidExpandControl, MermaidActions } from '../../viewer/react/content/toolbars/MermaidControls.jsx'

let menuId = 0

function ensureMermaidToolbar(containerEl) {
  let toolbar = containerEl.querySelector(':scope > .mdp-mermaid-toolbar')
  if (!toolbar) {
    toolbar = document.createElement('div')
    toolbar.className = 'mdp-mermaid-toolbar'
    containerEl.appendChild(toolbar)
  }
  return toolbar
}

/**
 * Copy Mermaid source text; always shown (separate from the export menu).
 * Call after the block DOM is final (`innerHTML` / error UI), because those replace children.
 * @param {{ source?: string, copyCodeWithToast?: (text: string, triggerButton?: HTMLButtonElement | null) => Promise<void> }} [options] — `copyCodeWithToast` from `MarkdownViewerApp` (code-block / Mermaid copy; success uses inline button state when `triggerButton` is passed).
 */
export function attachMermaidCopyButton(containerEl, { source, copyCodeWithToast } = {}) {
  if (!containerEl || containerEl.dataset.mermaidCopyAttached === 'true') return () => {}
  containerEl.dataset.mermaidCopyAttached = 'true'
  const ui = mountContentUi(ensureMermaidToolbar(containerEl), MermaidCopyControl, { source: String(source ?? ''), copyAction: copyCodeWithToast }, { scope: containerEl })
  return () => { ui.destroy(); delete containerEl.dataset.mermaidCopyAttached }
}

export function attachMermaidLightboxButton(containerEl) {
  if (!containerEl || containerEl.dataset.mermaidExpandAttached === 'true' || !containerEl.querySelector(':scope > svg')) return () => {}
  containerEl.dataset.mermaidExpandAttached = 'true'
  const ui = mountContentUi(ensureMermaidToolbar(containerEl), MermaidExpandControl, { onOpen: () => openMermaidLightbox(containerEl) }, { scope: containerEl })
  return () => { ui.destroy(); delete containerEl.dataset.mermaidExpandAttached }
}

function getClosestActionButton(target) {
  if (!target) return null
  if (target instanceof HTMLButtonElement && target.dataset.action) return target
  if (target instanceof Element) return target.closest('button[data-action]')
  if (target instanceof Node && target.parentElement) {
    return target.parentElement.closest('button[data-action]')
  }
  return null
}

function isEventInsideRoot(event, root) {
  if (!event || !root) return false
  const path = typeof event.composedPath === 'function' ? event.composedPath() : null
  if (Array.isArray(path) && path.length > 0) {
    return path.includes(root)
  }
  return root.contains(event.target)
}

/** Scrollable ancestors between `fromEl` and `document`; used to keep fixed menus aligned while nested areas scroll. */
function getScrollableAncestors(fromEl) {
  const out = []
  const doc = fromEl?.ownerDocument
  if (!doc?.defaultView) return out
  const win = doc.defaultView
  let el = fromEl instanceof Element ? fromEl : null
  while (el) {
    const st = win.getComputedStyle(el)
    const overflow = `${st.overflow}${st.overflowX}${st.overflowY}`
    if (/(auto|scroll|overlay)/.test(overflow)) out.push(el)
    el = el.parentElement
  }
  return out
}

export function attachMermaidActionsMenu(containerEl, { chartIndex } = {}) {
  if (!containerEl || containerEl.dataset.mermaidActionsAttached === 'true') return () => {}
  if (!containerEl.querySelector(':scope > svg')) return () => {}

  containerEl.dataset.mermaidActionsAttached = 'true'

  let root = null
  let trigger = null
  let menu = null
  let ui = null
  const id = `mdp-mermaid-menu-${++menuId}`
  const portalTarget = getContentOverlayTarget(containerEl)
  const refs = { rootRef: node => { root = node }, triggerRef: node => { trigger = node }, menuRef: node => { menu = node } }
  function publish() {
    ui?.update({ ...refs, menuId: id, open: isOpen, portalTarget, onToggle: onTriggerClick, onAction: onMenuClick, onKeyDown: onMenuKeyDown })
  }
  let isOpen = false
  let repositionRaf = 0
  let openingRaf = 0
  let destroyed = false
  const scrollTargets = new Set()

  const onReposition = () => {
    if (repositionRaf) return
    repositionRaf = requestAnimationFrame(() => {
      repositionRaf = 0
      positionMenu()
    })
  }

  const onWindowPointerDown = (event) => {
    if (isEventInsideRoot(event, root) || isEventInsideRoot(event, menu)) return
    closeMenu()
  }
  const onWindowKeyDown = (event) => {
    if (event.key === 'Escape') { closeMenu(); trigger.focus({ preventScroll: true }) }
  }

  function positionMenu() {
    if (destroyed || !isOpen || !menu || menu.hidden || !trigger?.isConnected) return
    const rect = trigger.getBoundingClientRect()
    const margin = 6
    const pad = 8
    const vw = window.innerWidth
    const vh = window.innerHeight

    menu.style.right = 'auto'

    const mw = menu.offsetWidth
    const mh = menu.offsetHeight
    let top = rect.bottom + margin
    let left = rect.right - mw

    if (left < pad) left = pad
    if (left + mw > vw - pad) left = Math.max(pad, vw - pad - mw)

    if (top + mh > vh - pad && rect.top - margin - mh >= pad) {
      top = rect.top - margin - mh
    }
    if (top + mh > vh - pad) {
      top = Math.max(pad, vh - pad - mh)
    }

    menu.style.top = `${Math.round(top)}px`
    menu.style.left = `${Math.round(left)}px`
  }

  function bindRepositionListeners() {
    const win = containerEl.ownerDocument?.defaultView || window
    win.addEventListener('resize', onReposition)
    win.addEventListener('scroll', onReposition, true)
    for (const el of getScrollableAncestors(containerEl)) {
      el.addEventListener('scroll', onReposition, { passive: true })
      scrollTargets.add(el)
    }
  }

  function unbindRepositionListeners() {
    const win = containerEl.ownerDocument?.defaultView || window
    win.removeEventListener('resize', onReposition)
    win.removeEventListener('scroll', onReposition, true)
    for (const el of scrollTargets) {
      el.removeEventListener('scroll', onReposition)
    }
    scrollTargets.clear()
    if (openingRaf) { cancelAnimationFrame(openingRaf); openingRaf = 0 }
    if (repositionRaf) {
      cancelAnimationFrame(repositionRaf)
      repositionRaf = 0
    }
  }

  function openMenu() {
    if (destroyed || isOpen) return
    isOpen = true
    publish()
    window.addEventListener('pointerdown', onWindowPointerDown)
    window.addEventListener('keydown', onWindowKeyDown)
    bindRepositionListeners()
    openingRaf = requestAnimationFrame(() => {
      if (!isOpen || destroyed) return
      positionMenu()
      menu.querySelector('[role="menuitem"]')?.focus()
      openingRaf = requestAnimationFrame(() => { openingRaf = 0; positionMenu() })
    })
  }

  function closeMenu() {
    if (!isOpen) return
    isOpen = false
    publish()
    unbindRepositionListeners()
    window.removeEventListener('pointerdown', onWindowPointerDown)
    window.removeEventListener('keydown', onWindowKeyDown)
  }

  const onTriggerClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (isOpen) closeMenu()
    else openMenu()
  }

  const onMenuClick = async (event) => {
    const button = getClosestActionButton(event.target)
    if (!(button instanceof HTMLButtonElement)) return
    event.preventDefault()
    event.stopPropagation()

    const action = button.dataset.action
    try {
      if (action === 'export-svg') {
        exportMermaidSvg(containerEl, { chartIndex })
      } else if (action === 'export-png') {
        await exportMermaidPng(containerEl, {
          chartIndex,
          scale: Number(button.dataset.scale || 1)
        })
      }
      closeMenu()
    } catch (error) {
      logger.warn('Mermaid export action failed.', error)
    }
  }
  const onMenuKeyDown = event => {
    const buttons = [...menu.querySelectorAll('[role="menuitem"]')]
    const index = buttons.indexOf(containerEl.ownerDocument.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? (index + 1) % buttons.length : event.key === 'ArrowUp' ? (index - 1 + buttons.length) % buttons.length : null
    if (next !== null) { event.preventDefault(); buttons[next]?.focus() }
    if (event.key === 'Escape' || event.key === 'Tab') { closeMenu(); trigger.focus({ preventScroll: true }) }
  }
  ui = mountContentUi(ensureMermaidToolbar(containerEl), MermaidActions, { ...refs, menuId: id, open: false, portalTarget, onToggle: onTriggerClick, onAction: onMenuClick, onKeyDown: onMenuKeyDown }, { scope: containerEl })
  return () => {
    if (destroyed) return
    closeMenu()
    destroyed = true
    ui.destroy()
    delete containerEl.dataset.mermaidActionsAttached
  }
}
