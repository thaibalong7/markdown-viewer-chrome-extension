import { exportMermaidPng, exportMermaidSvg } from './mermaid-export.js'
import { logger } from '../../shared/logger.js'
import { attachTooltip, VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../viewer/tooltip.js'

const SVG_NS = 'http://www.w3.org/2000/svg'

function createIconCopy() {
  const icon = document.createElementNS(SVG_NS, 'svg')
  icon.setAttribute('viewBox', '0 0 24 24')
  icon.setAttribute('width', '14')
  icon.setAttribute('height', '14')
  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('focusable', 'false')

  const back = document.createElementNS(SVG_NS, 'rect')
  back.setAttribute('x', '9')
  back.setAttribute('y', '9')
  back.setAttribute('width', '11')
  back.setAttribute('height', '11')
  back.setAttribute('rx', '2')
  back.setAttribute('fill', 'none')
  back.setAttribute('stroke', 'currentColor')
  back.setAttribute('stroke-width', '1.8')

  const front = document.createElementNS(SVG_NS, 'rect')
  front.setAttribute('x', '4')
  front.setAttribute('y', '4')
  front.setAttribute('width', '11')
  front.setAttribute('height', '11')
  front.setAttribute('rx', '2')
  front.setAttribute('fill', 'none')
  front.setAttribute('stroke', 'currentColor')
  front.setAttribute('stroke-width', '1.8')

  icon.append(back, front)
  return icon
}

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
  if (!containerEl || containerEl.dataset.mermaidCopyAttached === 'true') return

  const text = source == null ? '' : String(source)
  containerEl.dataset.mermaidCopyAttached = 'true'

  const toolbar = ensureMermaidToolbar(containerEl)
  const copyBtn = document.createElement('button')
  copyBtn.type = 'button'
  copyBtn.className = 'mdp-mermaid-toolbar__copy'
  copyBtn.setAttribute('aria-label', 'Copy Mermaid source')
  attachTooltip(copyBtn, {
    text: 'Copy Mermaid source',
    showDelayMs: VIEWER_TOOLTIP_DELAY_QUICK_MS
  })
  copyBtn.appendChild(createIconCopy())

  copyBtn.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (typeof copyCodeWithToast !== 'function') return
    void copyCodeWithToast(text, copyBtn)
  })

  toolbar.insertBefore(copyBtn, toolbar.firstChild)
}

function createIconDots() {
  const icon = document.createElementNS(SVG_NS, 'svg')
  icon.setAttribute('viewBox', '0 0 24 24')
  icon.setAttribute('width', '14')
  icon.setAttribute('height', '14')
  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('focusable', 'false')

  for (const y of [6, 12, 18]) {
    const dot = document.createElementNS(SVG_NS, 'circle')
    dot.setAttribute('cx', '12')
    dot.setAttribute('cy', String(y))
    dot.setAttribute('r', '1.8')
    dot.setAttribute('fill', 'currentColor')
    icon.appendChild(dot)
  }

  return icon
}

function createMenuButton({ label, action, scale }) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'mdp-mermaid-actions__item'
  button.dataset.action = action
  if (typeof scale === 'number') {
    button.dataset.scale = String(scale)
  }
  button.textContent = label
  return button
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
  if (!containerEl || containerEl.dataset.mermaidActionsAttached === 'true') return
  if (!containerEl.querySelector(':scope > svg')) return

  containerEl.dataset.mermaidActionsAttached = 'true'

  const root = document.createElement('div')
  root.className = 'mdp-mermaid-actions'

  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = 'mdp-mermaid-actions__trigger'
  trigger.setAttribute('aria-label', 'Mermaid chart actions')
  trigger.setAttribute('aria-haspopup', 'menu')
  trigger.setAttribute('aria-expanded', 'false')
  trigger.appendChild(createIconDots())

  const menu = document.createElement('div')
  menu.className = 'mdp-mermaid-actions__menu'
  menu.hidden = true
  menu.setAttribute('role', 'menu')

  menu.appendChild(createMenuButton({ label: 'Download SVG', action: 'export-svg' }))

  const separator = document.createElement('div')
  separator.className = 'mdp-mermaid-actions__separator'
  separator.setAttribute('role', 'separator')
  menu.appendChild(separator)

  const groupLabel = document.createElement('div')
  groupLabel.className = 'mdp-mermaid-actions__group-label'
  groupLabel.textContent = 'Download PNG'
  menu.appendChild(groupLabel)

  menu.appendChild(createMenuButton({ label: 'PNG 1x', action: 'export-png', scale: 1 }))
  menu.appendChild(createMenuButton({ label: 'PNG 2x', action: 'export-png', scale: 2 }))
  menu.appendChild(createMenuButton({ label: 'PNG 3x', action: 'export-png', scale: 3 }))
  menu.appendChild(createMenuButton({ label: 'PNG 4x', action: 'export-png', scale: 4 }))

  const portalParent = containerEl.closest('.mdp-markdown-body')
  if (portalParent) {
    portalParent.appendChild(menu)
  } else {
    root.appendChild(menu)
  }

  let isOpen = false
  let repositionRaf = 0
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
    if (event.key === 'Escape') closeMenu()
  }

  function positionMenu() {
    if (!isOpen || menu.hidden || !trigger.isConnected) return
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
    if (repositionRaf) {
      cancelAnimationFrame(repositionRaf)
      repositionRaf = 0
    }
  }

  function openMenu() {
    if (isOpen) return
    isOpen = true
    menu.hidden = false
    trigger.setAttribute('aria-expanded', 'true')
    window.addEventListener('pointerdown', onWindowPointerDown)
    window.addEventListener('keydown', onWindowKeyDown)
    bindRepositionListeners()
    requestAnimationFrame(() => {
      positionMenu()
      requestAnimationFrame(() => positionMenu())
    })
  }

  function closeMenu() {
    if (!isOpen) return
    isOpen = false
    menu.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
    unbindRepositionListeners()
    window.removeEventListener('pointerdown', onWindowPointerDown)
    window.removeEventListener('keydown', onWindowKeyDown)
  }

  attachTooltip(trigger, {
    text: 'Export this diagram: SVG (vector) or PNG at 1x–4x resolution.',
    showDelayMs: VIEWER_TOOLTIP_DELAY_QUICK_MS
  })

  trigger.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (isOpen) closeMenu()
    else openMenu()
  })

  menu.addEventListener('click', async (event) => {
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
  })

  root.appendChild(trigger)
  ensureMermaidToolbar(containerEl).appendChild(root)
}
