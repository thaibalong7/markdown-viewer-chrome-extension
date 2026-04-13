import { createExportIconSvg, createPrintIconSvg } from '../icons.js'
import { attachTooltip, VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../tooltip.js'
import {
  buildExportFilename,
  exportAsHtml,
  exportAsWord,
  printDocument
} from './document-actions.js'

/**
 * @param {object} options
 * @param {HTMLElement} options.mountEl - `.mdp-toolbar__actions`
 * @param {() => HTMLElement | null | undefined} options.getArticleEl
 * @param {() => object} options.getSettings
 * @param {() => string} options.getCurrentFileUrl
 * @param {(message: string) => void} options.showToast
 */
export function createToolbarDocumentActions(options) {
  const { mountEl, getArticleEl, getSettings, getCurrentFileUrl, showToast } = options

  const root = document.createElement('div')
  root.className = 'mdp-toolbar-doc-actions'
  root.hidden = true
  root.setAttribute('aria-hidden', 'true')

  const printBtn = document.createElement('button')
  printBtn.type = 'button'
  printBtn.className = 'mdp-toolbar-icon-btn'
  printBtn.setAttribute('aria-label', 'Print — use Save as PDF in the print dialog.')
  printBtn.appendChild(createPrintIconSvg({ className: 'mdp-toolbar-icon-btn__icon' }))

  const exportWrap = document.createElement('div')
  exportWrap.className = 'mdp-toolbar-export'

  const exportBtn = document.createElement('button')
  exportBtn.type = 'button'
  exportBtn.className = 'mdp-toolbar-icon-btn mdp-toolbar-export__trigger'
  exportBtn.setAttribute('aria-label', 'Download — HTML or Word (.doc).')
  exportBtn.setAttribute('aria-expanded', 'false')
  exportBtn.setAttribute('aria-haspopup', 'true')
  exportBtn.appendChild(createExportIconSvg({ className: 'mdp-toolbar-icon-btn__icon' }))

  const menu = document.createElement('div')
  menu.className = 'mdp-toolbar-export__menu'
  menu.hidden = true
  menu.setAttribute('role', 'menu')
  menu.setAttribute('aria-label', 'Export format')

  function addMenuItem(label, onActivate) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'mdp-toolbar-export__menu-item'
    btn.setAttribute('role', 'menuitem')
    btn.textContent = label
    btn.addEventListener('click', () => {
      closeMenu()
      onActivate()
    })
    menu.appendChild(btn)
  }

  /**
   * @param {string} ext
   * @param {(article: HTMLElement, settings: object, filename: string) => Promise<void>} exportFn
   * @param {string} errorMsg
   */
  function runExport(ext, exportFn, errorMsg) {
    void (async () => {
      const article = getArticleEl()
      if (!article) {
        showToast('Nothing to export yet.')
        return
      }
      const filename = buildExportFilename(getCurrentFileUrl(), ext)
      try {
        await exportFn(article, getSettings(), filename)
        showToast(`Exported ${filename}`)
      } catch {
        showToast(errorMsg)
      }
    })()
  }

  addMenuItem('HTML', () => runExport('html', exportAsHtml, 'Could not export HTML'))
  addMenuItem('Word (.doc)', () => runExport('doc', exportAsWord, 'Could not export Word document'))

  exportWrap.appendChild(exportBtn)
  exportWrap.appendChild(menu)

  root.appendChild(printBtn)
  root.appendChild(exportWrap)
  mountEl.appendChild(root)

  const printTooltip = attachTooltip(printBtn, {
    text: 'Print — Save as PDF in the dialog to export PDF.',
    showDelayMs: VIEWER_TOOLTIP_DELAY_QUICK_MS
  })
  const exportTooltip = attachTooltip(exportBtn, {
    text: 'Download — HTML or Word (.doc).',
    showDelayMs: VIEWER_TOOLTIP_DELAY_QUICK_MS
  })

  let menuOpen = false

  function closeMenu() {
    menuOpen = false
    menu.hidden = true
    exportBtn.setAttribute('aria-expanded', 'false')
  }

  function openMenu() {
    menuOpen = true
    menu.hidden = false
    exportBtn.setAttribute('aria-expanded', 'true')
  }

  function toggleMenu() {
    if (menuOpen) closeMenu()
    else openMenu()
  }

  function onDocPointerDown(ev) {
    if (!menuOpen) return
    const path = typeof ev.composedPath === 'function' ? ev.composedPath() : null
    if (path ? !path.includes(exportWrap) : !exportWrap.contains(ev.target)) {
      closeMenu()
    }
  }

  function onKeyDown(ev) {
    if (ev.key === 'Escape' && menuOpen) {
      ev.preventDefault()
      closeMenu()
      exportBtn.focus()
    }
  }

  printBtn.addEventListener('click', () => {
    closeMenu()
    printDocument()
  })

  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleMenu()
  })

  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.addEventListener('keydown', onKeyDown, true)

  function syncVisibility() {
    const url = getCurrentFileUrl()
    const visible = Boolean(url && String(url).trim())
    root.hidden = !visible
    root.setAttribute('aria-hidden', visible ? 'false' : 'true')
    if (!visible) closeMenu()
  }

  return {
    syncVisibility,
    destroy() {
      printTooltip.destroy()
      exportTooltip.destroy()
      document.removeEventListener('pointerdown', onDocPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
      closeMenu()
      root.remove()
    }
  }
}
