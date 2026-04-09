import { createShell } from './shell/viewer-shell.js'
import { renderDocument, renderIntoElement } from './core/renderer.js'
import { rebuildToc } from './actions/rebuild-toc.js'
import { createOpenSettingsAction } from './actions/open-settings.js'
import { createUpdateSettingsAction } from './actions/update-settings.js'
import { createPluginState, createSettingsState } from './state/viewer-state.js'
import { applyThemeSettings } from '../theme/index.js'
import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'
import { DEFAULT_SETTINGS } from '../settings/index.js'
import { logger } from '../shared/logger.js'
import { isPlainObject } from '../shared/deep-merge.js'

const STYLE_ONLY_KEYS = new Set(['theme', 'typography', 'colors', 'layout'])
const STYLE_ONLY_LAYOUT_KEYS = new Set(['showToc', 'tocWidth', 'contentMaxWidth'])

function patchNeedsFullRender(partial = {}) {
  if (!isPlainObject(partial)) return true
  const keys = Object.keys(partial)
  if (!keys.length) return false
  // Shiki bakes syntax colors into fenced-block HTML; CSS vars cannot refresh them.
  if (partial.theme != null) return true
  if (keys.some((key) => !STYLE_ONLY_KEYS.has(key))) return true

  const layoutPatch = partial.layout
  if (!layoutPatch) return false
  if (!isPlainObject(layoutPatch)) return true
  return Object.keys(layoutPatch).some((key) => !STYLE_ONLY_LAYOUT_KEYS.has(key))
}

function createReaderUiDefaultsPatch() {
  return {
    theme: { ...DEFAULT_SETTINGS.theme },
    typography: { ...DEFAULT_SETTINGS.typography },
    layout: { ...DEFAULT_SETTINGS.layout }
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  try {
    const ok = document.execCommand('copy')
    if (!ok) throw new Error('execCommand copy returned false')
  } finally {
    ta.remove()
  }
}

export class MarkdownViewerApp {
  constructor({ markdown, settings, container, styles = [] }) {
    this.markdown = markdown
    this.settings = settings
    this.container = container
    this.styles = styles
    this.parts = null
    this.tocController = null
    this.shellController = null
    this.settingsState = null
    this.pluginState = null
    this.openSettingsAction = null
    this.updateSettingsAction = null
    this.hashChangeHandler = null
    this.articleHashLinkClickHandler = null
    this._smoothInitialHashScroll = false
    this._toastTimer = null
  }

  init() {
    this.settingsState = createSettingsState(this.settings)
    this.pluginState = createPluginState(this.settings)
    let settingsAction = null

    const shell = createShell({
      onSettingsClick: () => {
        if (settingsAction) settingsAction.toggle()
      },
      onSettingsClose: () => {
        if (settingsAction) settingsAction.close()
      },
      onSettingsChange: (partial) => {
        if (this.updateSettingsAction) this.updateSettingsAction.update(partial)
      },
      onSettingsReset: async () => {
        if (this.updateSettingsAction) this.updateSettingsAction.cancelPending()
        try {
          const resetPatch = createReaderUiDefaultsPatch()
          const response = await sendMessage({
            type: MESSAGE_TYPES.SAVE_SETTINGS,
            payload: resetPatch
          })
          if (!response?.ok) {
            throw new Error(response?.error || 'Failed to reset reader UI settings.')
          }

          const nextSettings = response.data
          this.settings = nextSettings
          this.settingsState.replace(nextSettings)
          this.pluginState = createPluginState(nextSettings)
          this.parts.settingsController.update(nextSettings)
          this.applyReaderStyles()
          await this.render({ preserveScroll: true, honorHash: false })
        } catch (error) {
          logger.error('Failed to reset reader UI settings.', error)
        }
      },
      settings: this.settingsState.get(),
      styles: this.styles
    })

    this.parts = shell.parts
    this.shellController = shell

    for (const styleElement of shell.styleElements) {
      this.container.appendChild(styleElement)
    }
    this.container.appendChild(shell.element)

    settingsAction = createOpenSettingsAction({
      applyOpenState: (open) => this.parts.settingsController.setOpen(open),
      settingsButton: this.parts.settingsButton
    })
    this.openSettingsAction = settingsAction

    this.updateSettingsAction = createUpdateSettingsAction({
      settingsState: this.settingsState,
      onApply: (nextSettings, partial) => {
        this.settings = nextSettings
        this.parts.settingsController.update(nextSettings)
        this.applyReaderStyles()
        this.syncTocVisibility()
        if (patchNeedsFullRender(partial)) {
          void this.render({ preserveScroll: true, honorHash: false })
        }
      },
      onPersist: async (partial) => {
        const response = await sendMessage({
          type: MESSAGE_TYPES.SAVE_SETTINGS,
          payload: partial
        })
        if (!response?.ok) {
          throw new Error(response?.error || 'Failed to save settings.')
        }

        const persisted = response.data
        this.settings = persisted
        this.settingsState.replace(persisted)
        this.pluginState = createPluginState(persisted)
        this.parts.settingsController.update(persisted)
        return persisted
      },
      onError: (error) => {
        logger.error('Failed to persist viewer settings.', error)
      }
    })

    this._smoothInitialHashScroll = Boolean(window.location.hash)
    this.applyReaderStyles()
    void this.render()
    this.bindHashNavigation()
  }

  applyReaderStyles() {
    const article = this.parts?.article
    if (!article) return

    const typo = this.settings?.typography || {}
    const layout = this.settings?.layout || {}
    const sidebar = this.parts?.sidebar
    const themeTarget = this.parts?.root || this.container?.host || this.container

    applyThemeSettings(themeTarget, this.settings)

    if (typo.fontFamily) article.style.fontFamily = 'var(--mdp-font-family)'
    if (typo.fontSize != null) article.style.fontSize = 'var(--mdp-font-size)'
    if (typo.lineHeight != null) article.style.lineHeight = 'var(--mdp-line-height)'
    if (layout.contentMaxWidth != null) article.style.maxWidth = 'var(--mdp-content-max-width)'

    if (sidebar) {
      const showToc = layout.showToc !== false
      sidebar.style.display = showToc ? '' : 'none'
      const body = sidebar.parentElement
      if (body?.classList?.contains('mdp-body')) {
        body.classList.toggle('mdp-body--no-toc', !showToc)
      }
    }
  }

  getScrollRoot() {
    return this.parts?.root || this.parts?.article?.closest?.('.mdp-root') || null
  }

  captureScrollPosition() {
    const scrollRoot = this.getScrollRoot()
    if (!scrollRoot) return null
    return { scrollRoot, top: scrollRoot.scrollTop }
  }

  restoreScrollPosition(snapshot) {
    if (!snapshot?.scrollRoot) return
    const { scrollRoot, top } = snapshot
    const maxTop = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight)
    const nextTop = Math.min(Math.max(0, Number(top) || 0), maxTop)
    scrollRoot.scrollTo({ top: nextTop, behavior: 'auto' })
  }

  async render({ preserveScroll = false, honorHash = true } = {}) {
    const scrollSnapshot = preserveScroll ? this.captureScrollPosition() : null
    let result
    try {
      result = await renderDocument(this.markdown, this.settings)
    } catch (error) {
      logger.error('Failed to render markdown document.', error)
      return null
    }
    renderIntoElement(this.parts.article, result.html)
    await result.pluginManager?.afterRender({
      articleEl: this.parts.article,
      settings: this.settings,
      plugins: this.pluginState?.get() || {}
    })
    this.syncTocVisibility()
    if (scrollSnapshot) {
      this.restoreScrollPosition(scrollSnapshot)
    } else if (honorHash) {
      const behavior =
        this._smoothInitialHashScroll && window.location.hash ? 'smooth' : 'auto'
      this.scrollToHash({ behavior })
      if (this._smoothInitialHashScroll) this._smoothInitialHashScroll = false
    }
    return result
  }

  showToast(message) {
    const root = this.parts?.root
    if (!root) return

    let toast = root.querySelector('.mdp-toast')
    if (!toast) {
      toast = document.createElement('div')
      toast.className = 'mdp-toast'
      toast.setAttribute('role', 'status')
      toast.setAttribute('aria-live', 'polite')
      root.appendChild(toast)
    }
    toast.textContent = message
    toast.classList.add('is-visible')

    if (this._toastTimer) clearTimeout(this._toastTimer)
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible')
      this._toastTimer = null
    }, 2200)
  }

  bindHashNavigation() {
    const article = this.parts?.article
    if (!article) return

    this.hashChangeHandler = () => {
      this.scrollToHash({ behavior: 'auto' })
    }
    window.addEventListener('hashchange', this.hashChangeHandler)

    this.articleHashLinkClickHandler = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest('a[href^="#"]')
      if (!link || !article.contains(link)) return
      const href = link.getAttribute('href') || ''
      const id = decodeURIComponent(href.slice(1))
      if (!id) return

      if (link.classList.contains('mdp-heading-anchor')) {
        event.preventDefault()
        const hash = `#${encodeURIComponent(id)}`
        const baseUrl = window.location.href.replace(/#.*$/, '')
        const url = `${baseUrl}${hash}`
        window.history.replaceState(null, '', hash)
        void this.copySectionLinkWithToast(url)
        return
      }

      event.preventDefault()
      window.history.replaceState(null, '', `#${encodeURIComponent(id)}`)
      this.scrollToHash({ behavior: 'smooth' })
    }
    article.addEventListener('click', this.articleHashLinkClickHandler)
  }

  async copySectionLinkWithToast(url) {
    try {
      await copyTextToClipboard(url)
      this.showToast('Copied link')
    } catch (error) {
      logger.debug('Copy section link failed.', error)
      this.showToast('Could not copy link')
    }
  }

  scrollToHash({ behavior = 'auto' } = {}) {
    const hash = window.location.hash || ''
    if (!hash.startsWith('#')) return
    const id = decodeURIComponent(hash.slice(1))
    if (!id) return

    const headingEl = this.parts?.article?.querySelector?.(`#${CSS.escape(id)}`)
    if (!headingEl) return

    const scrollRoot = this.parts?.root || this.parts?.article?.closest?.('.mdp-root')
    if (!scrollRoot) return
    const toolbarEl = scrollRoot.querySelector('.mdp-toolbar')
    const toolbarHeight = toolbarEl?.getBoundingClientRect?.().height || 56

    const rootRect = scrollRoot.getBoundingClientRect()
    const headingRect = headingEl.getBoundingClientRect()
    const targetTop = headingRect.top - rootRect.top + scrollRoot.scrollTop - (toolbarHeight + 8)
    scrollRoot.scrollTo({ top: targetTop, behavior })
  }

  syncTocVisibility() {
    const showToc = this.settings?.layout?.showToc !== false
    if (!showToc) {
      if (this.tocController) this.tocController.destroy()
      this.tocController = null
      if (this.parts?.tocContainer) this.parts.tocContainer.innerHTML = ''
      return
    }

    if (this.tocController) this.tocController.destroy()
    this.tocController = rebuildToc({
      articleEl: this.parts.article,
      tocContainerEl: this.parts.tocContainer
    })
  }

  async updateSettings(nextSettings) {
    this.settings = nextSettings
    this.applyReaderStyles()
    return this.render({ preserveScroll: true, honorHash: false })
  }

  destroy() {
    if (this._toastTimer) clearTimeout(this._toastTimer)
    this._toastTimer = null
    if (this.updateSettingsAction) this.updateSettingsAction.destroy()
    this.updateSettingsAction = null
    this.openSettingsAction = null
    this.settingsState = null
    this.pluginState = null
    if (this.shellController?.destroy) this.shellController.destroy()
    this.shellController = null
    if (this.hashChangeHandler) {
      window.removeEventListener('hashchange', this.hashChangeHandler)
    }
    this.hashChangeHandler = null
    if (this.articleHashLinkClickHandler && this.parts?.article) {
      this.parts.article.removeEventListener('click', this.articleHashLinkClickHandler)
    }
    this.articleHashLinkClickHandler = null
    this.container.innerHTML = ''
    this.parts = null
    if (this.tocController) this.tocController.destroy()
    this.tocController = null
  }
}
