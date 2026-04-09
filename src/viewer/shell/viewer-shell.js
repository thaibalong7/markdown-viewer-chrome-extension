import { createSettingsDrawer } from './settings/settings-popup.js'

function createStyleElement(cssText) {
  const style = document.createElement('style')
  style.textContent = cssText
  return style
}

function createHeaderToolbar({ onSettingsClick } = {}) {
  const toolbar = document.createElement('div')
  toolbar.className = 'mdp-toolbar'

  const title = document.createElement('div')
  title.className = 'mdp-toolbar__title'
  title.textContent = 'Markdown Plus'

  const actions = document.createElement('div')
  actions.className = 'mdp-toolbar__actions'

  const settingsButton = document.createElement('button')
  settingsButton.className = 'mdp-button'
  settingsButton.type = 'button'
  settingsButton.textContent = 'Settings'
  settingsButton.setAttribute('aria-expanded', 'false')
  settingsButton.addEventListener('click', () => {
    if (typeof onSettingsClick === 'function') {
      onSettingsClick()
    }
  })

  actions.appendChild(settingsButton)
  toolbar.appendChild(title)
  toolbar.appendChild(actions)

  return {
    element: toolbar,
    settingsButton
  }
}

function createContentPane() {
  const contentPane = document.createElement('main')
  contentPane.className = 'mdp-content-pane'

  const article = document.createElement('article')
  article.className = 'mdp-markdown-body'

  contentPane.appendChild(article)

  return {
    element: contentPane,
    article
  }
}

function createTocSidebar() {
  const sidebar = document.createElement('aside')
  sidebar.className = 'mdp-sidebar'

  const title = document.createElement('div')
  title.className = 'mdp-sidebar__title'
  title.textContent = 'Table of Contents'

  const tocContainer = document.createElement('nav')
  tocContainer.className = 'mdp-toc'
  tocContainer.setAttribute('aria-label', 'Table of contents')

  sidebar.appendChild(title)
  sidebar.appendChild(tocContainer)

  return {
    element: sidebar,
    tocContainer
  }
}

export function createShell({ onSettingsClick, onSettingsChange, onSettingsClose, onSettingsReset, settings, styles = [] } = {}) {
  const root = document.createElement('div')
  root.className = 'mdp-root'

  const toolbar = createHeaderToolbar({ onSettingsClick })
  const contentPane = createContentPane()
  const body = document.createElement('div')
  body.className = 'mdp-body'

  const { element: sidebar, tocContainer } = createTocSidebar()
  const settingsDrawer = createSettingsDrawer({
    settings,
    settingsButton: toolbar.settingsButton,
    onClose: onSettingsClose,
    onChange: onSettingsChange,
    onReset: onSettingsReset
  })

  body.appendChild(sidebar)
  body.appendChild(contentPane.element)

  root.appendChild(toolbar.element)
  root.appendChild(body)
  root.appendChild(settingsDrawer.element)

  return {
    element: root,
    styleElements: styles.map(createStyleElement),
    parts: {
      root,
      toolbar: toolbar.element,
      sidebar,
      tocContainer,
      contentPane: contentPane.element,
      article: contentPane.article,
      settingsDrawer: settingsDrawer.element,
      settingsController: settingsDrawer,
      settingsButton: toolbar.settingsButton
    },
    destroy() {
      settingsDrawer.destroy()
    }
  }
}
