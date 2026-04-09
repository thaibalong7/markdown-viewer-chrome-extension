import { exportMermaidPng, exportMermaidSvg } from './mermaid-export.js'

const SVG_NS = 'http://www.w3.org/2000/svg'

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

export function attachMermaidActionsMenu(containerEl, { chartIndex } = {}) {
  if (!containerEl || containerEl.dataset.mermaidActionsAttached === 'true') return
  if (containerEl.classList.contains('mdp-mermaid--error')) return
  if (!containerEl.querySelector(':scope > svg')) return

  containerEl.dataset.mermaidActionsAttached = 'true'

  const root = document.createElement('div')
  root.className = 'mdp-mermaid-actions'

  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = 'mdp-mermaid-actions__trigger'
  trigger.setAttribute('aria-label', 'Mermaid chart actions')
  trigger.setAttribute('title', 'Chart actions')
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

  let isOpen = false
  const onWindowPointerDown = (event) => {
    if (isEventInsideRoot(event, root)) return
    closeMenu()
  }
  const onWindowKeyDown = (event) => {
    if (event.key === 'Escape') closeMenu()
  }

  function openMenu() {
    if (isOpen) return
    isOpen = true
    menu.hidden = false
    trigger.setAttribute('aria-expanded', 'true')
    window.addEventListener('pointerdown', onWindowPointerDown)
    window.addEventListener('keydown', onWindowKeyDown)
  }

  function closeMenu() {
    if (!isOpen) return
    isOpen = false
    menu.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
    window.removeEventListener('pointerdown', onWindowPointerDown)
    window.removeEventListener('keydown', onWindowKeyDown)
  }

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
    } catch {}
  })

  root.appendChild(trigger)
  root.appendChild(menu)
  containerEl.appendChild(root)
}
