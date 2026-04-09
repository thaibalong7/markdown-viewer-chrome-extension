import { SETTINGS_TAB_IDS, SETTINGS_TABS } from './settings-tab-definitions.js'
import { buildGeneralSettingsPanel } from './settings-general-panel.js'
import { buildReaderSettingsPanel } from './settings-reader-panel.js'
import { buildPluginsSettingsPanel } from './settings-plugins-panel.js'

/**
 * Floating settings UI: left icon rail + tab panels, dismiss on outside pointerdown.
 *
 * @param {{
 *   settings?: object,
 *   settingsButton?: HTMLButtonElement | null,
 *   onClose?: () => void,
 *   onChange?: (patch: object) => void,
 *   onReset?: () => void
 * }} opts
 */
export function createSettingsDrawer({
  settings,
  settingsButton = null,
  onClose,
  onChange,
  onReset
} = {}) {
  const drawer = document.createElement('aside')
  drawer.className = 'mdp-settings-drawer'
  drawer.setAttribute('aria-hidden', 'true')
  drawer.setAttribute('role', 'dialog')
  drawer.setAttribute('aria-label', 'Viewer settings')

  const panel = document.createElement('div')
  panel.className = 'mdp-settings-panel'

  const rail = document.createElement('nav')
  rail.className = 'mdp-settings__rail'
  rail.setAttribute('aria-label', 'Settings sections')

  const main = document.createElement('div')
  main.className = 'mdp-settings__main'

  const header = document.createElement('div')
  header.className = 'mdp-settings__header'

  const title = document.createElement('h2')
  title.className = 'mdp-settings__title'
  title.textContent = 'Settings'

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.className = 'mdp-button'
  closeButton.textContent = 'Close'

  header.appendChild(title)
  header.appendChild(closeButton)

  const tabPanelsEl = document.createElement('div')
  tabPanelsEl.className = 'mdp-settings__tab-panels'

  /** @type {{ update: (s: object) => void, destroy: () => void } | null} */
  let mainPanelApi = null
  /** @type {{ update: (s: object) => void, destroy: () => void } | null} */
  let readerPanelApi = null
  /** @type {{ update: (s: object) => void, destroy: () => void } | null} */
  let pluginsPanelApi = null

  for (const tab of SETTINGS_TABS) {
    const tabPanel = document.createElement('div')
    tabPanel.className = 'mdp-settings__tab-panel'
    tabPanel.dataset.tabId = tab.id
    tabPanel.hidden = tab.id !== SETTINGS_TAB_IDS.SETTINGS

    if (tab.id === SETTINGS_TAB_IDS.SETTINGS) {
      mainPanelApi = buildGeneralSettingsPanel({
        settings,
        onChange
      })
      tabPanel.appendChild(mainPanelApi.element)
    } else if (tab.id === SETTINGS_TAB_IDS.READER) {
      readerPanelApi = buildReaderSettingsPanel({
        settings,
        onChange,
        onReset
      })
      tabPanel.appendChild(readerPanelApi.element)
    } else if (tab.id === SETTINGS_TAB_IDS.PLUGINS) {
      pluginsPanelApi = buildPluginsSettingsPanel({
        settings,
        onChange
      })
      tabPanel.appendChild(pluginsPanelApi.element)
    }
    tabPanelsEl.appendChild(tabPanel)
  }

  main.appendChild(header)
  main.appendChild(tabPanelsEl)

  function setActiveTab(tabId) {
    const activeTab = SETTINGS_TABS.find((tab) => tab.id === tabId)
    title.textContent = activeTab?.title || activeTab?.label || 'Settings'

    for (const btn of rail.querySelectorAll('.mdp-settings__tab')) {
      const isActive = btn.dataset.tabId === tabId
      btn.classList.toggle('is-active', isActive)
      if (isActive) {
        btn.setAttribute('aria-pressed', 'true')
      } else {
        btn.setAttribute('aria-pressed', 'false')
      }
    }
    for (const pane of tabPanelsEl.querySelectorAll('.mdp-settings__tab-panel')) {
      pane.hidden = pane.dataset.tabId !== tabId
    }
  }

  for (const tab of SETTINGS_TABS) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'mdp-settings__tab'
    btn.dataset.tabId = tab.id
    btn.title = tab.title
    btn.setAttribute('aria-label', tab.label)
    btn.textContent = tab.icon
    rail.appendChild(btn)
  }

  setActiveTab(SETTINGS_TAB_IDS.SETTINGS)

  panel.appendChild(rail)
  panel.appendChild(main)
  drawer.appendChild(panel)

  /** @type {((e: PointerEvent) => void) | null} */
  let outsidePointerHandler = null

  function pathTouchesNode(path, node) {
    if (!node) return false
    for (const n of path) {
      if (n === node) return true
      if (n instanceof Node && node.contains(n)) return true
    }
    return false
  }

  function detachOutsideDismiss() {
    if (!outsidePointerHandler) return
    document.removeEventListener('pointerdown', outsidePointerHandler, true)
    outsidePointerHandler = null
  }

  function attachOutsideDismiss() {
    detachOutsideDismiss()

    outsidePointerHandler = (e) => {
      if (!drawer.classList.contains('is-open')) return
      let path = typeof e.composedPath === 'function' ? e.composedPath() : []
      if (!path.length && e.target instanceof Node) {
        path = [e.target]
      }
      if (pathTouchesNode(path, panel)) return
      if (pathTouchesNode(path, settingsButton)) return
      if (typeof onClose === 'function') onClose()
    }
    document.addEventListener('pointerdown', outsidePointerHandler, true)
  }

  const onRailClick = (e) => {
    const t = e.target
    if (!(t instanceof Element)) return
    const btn = t.closest('.mdp-settings__tab')
    if (!btn || !rail.contains(btn)) return
    const id = btn.dataset.tabId
    if (id) setActiveTab(id)
  }

  const onCloseClick = () => {
    if (typeof onClose === 'function') onClose()
  }

  closeButton.addEventListener('click', onCloseClick)
  rail.addEventListener('click', onRailClick)

  return {
    element: drawer,
    closeButton,
    setOpen(isOpen) {
      const open = Boolean(isOpen)
      drawer.classList.toggle('is-open', open)
      drawer.setAttribute('aria-hidden', String(!open))
      if (open) {
        queueMicrotask(() => attachOutsideDismiss())
      } else {
        detachOutsideDismiss()
      }
    },
    update(nextSettings) {
      if (mainPanelApi) mainPanelApi.update(nextSettings)
      if (readerPanelApi) readerPanelApi.update(nextSettings)
      if (pluginsPanelApi) pluginsPanelApi.update(nextSettings)
    },
    destroy() {
      detachOutsideDismiss()
      closeButton.removeEventListener('click', onCloseClick)
      rail.removeEventListener('click', onRailClick)
      if (mainPanelApi) mainPanelApi.destroy()
      mainPanelApi = null
      if (readerPanelApi) readerPanelApi.destroy()
      readerPanelApi = null
      if (pluginsPanelApi) pluginsPanelApi.destroy()
      pluginsPanelApi = null
    }
  }
}
