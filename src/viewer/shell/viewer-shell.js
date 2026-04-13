function createStyleElement(cssText) {
  const style = document.createElement('style')
  style.textContent = cssText
  return style
}

function createHeaderToolbar() {
  const toolbar = document.createElement('div')
  toolbar.className = 'mdp-toolbar'

  const title = document.createElement('div')
  title.className = 'mdp-toolbar__title'
  title.textContent = 'Markdown Plus'

  const actions = document.createElement('div')
  actions.className = 'mdp-toolbar__actions'

  toolbar.appendChild(title)
  toolbar.appendChild(actions)

  return {
    element: toolbar,
    toolbarActions: actions
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

  const tabBar = document.createElement('div')
  tabBar.className = 'mdp-sidebar-tabs'
  tabBar.setAttribute('role', 'tablist')
  tabBar.setAttribute('aria-label', 'Sidebar')

  const tabOutline = document.createElement('button')
  tabOutline.type = 'button'
  tabOutline.className = 'mdp-sidebar-tab is-active'
  tabOutline.setAttribute('role', 'tab')
  tabOutline.setAttribute('aria-selected', 'true')
  tabOutline.setAttribute('id', 'mdp-tab-outline')
  tabOutline.setAttribute('aria-controls', 'mdp-panel-outline')
  tabOutline.textContent = 'Outline'

  const tabFiles = document.createElement('button')
  tabFiles.type = 'button'
  tabFiles.className = 'mdp-sidebar-tab'
  tabFiles.setAttribute('role', 'tab')
  tabFiles.setAttribute('aria-selected', 'false')
  tabFiles.setAttribute('id', 'mdp-tab-files')
  tabFiles.setAttribute('aria-controls', 'mdp-panel-files')
  tabFiles.textContent = 'Files'

  tabBar.appendChild(tabOutline)
  tabBar.appendChild(tabFiles)

  const outlinePanel = document.createElement('div')
  outlinePanel.className = 'mdp-sidebar-panel mdp-sidebar-panel--outline'
  outlinePanel.setAttribute('role', 'tabpanel')
  outlinePanel.setAttribute('id', 'mdp-panel-outline')
  outlinePanel.setAttribute('aria-labelledby', 'mdp-tab-outline')

  const outlineTitle = document.createElement('div')
  outlineTitle.className = 'mdp-sidebar__title'
  outlineTitle.textContent = 'Outline'

  const tocContainer = document.createElement('nav')
  tocContainer.className = 'mdp-toc'
  tocContainer.setAttribute('aria-label', 'Table of contents')

  outlinePanel.appendChild(outlineTitle)
  outlinePanel.appendChild(tocContainer)

  const filesPanel = document.createElement('div')
  filesPanel.className = 'mdp-sidebar-panel mdp-sidebar-panel--files'
  filesPanel.setAttribute('role', 'tabpanel')
  filesPanel.setAttribute('id', 'mdp-panel-files')
  filesPanel.setAttribute('aria-labelledby', 'mdp-tab-files')
  filesPanel.hidden = true

  const explorerContainer = document.createElement('div')
  explorerContainer.className = 'mdp-explorer-container'

  filesPanel.appendChild(explorerContainer)

  sidebar.appendChild(tabBar)
  sidebar.appendChild(outlinePanel)
  sidebar.appendChild(filesPanel)

  const resizeHandle = document.createElement('div')
  resizeHandle.className = 'mdp-sidebar__resize-handle'
  resizeHandle.setAttribute('role', 'separator')
  resizeHandle.setAttribute('aria-label', 'Resize sidebar')
  resizeHandle.setAttribute('aria-orientation', 'vertical')
  resizeHandle.setAttribute('aria-valuemin', '220')
  resizeHandle.setAttribute('aria-valuemax', '520')
  resizeHandle.setAttribute('tabindex', '0')
  sidebar.appendChild(resizeHandle)

  return {
    element: sidebar,
    tocContainer,
    explorerContainer,
    tabBar,
    tabFiles,
    tabOutline,
    filesPanel,
    outlinePanel,
    resizeHandle
  }
}

export function createShell({ styles = [] } = {}) {
  const root = document.createElement('div')
  root.className = 'mdp-root'

  const header = createHeaderToolbar()
  const toolbar = header.element
  const contentPane = createContentPane()
  const body = document.createElement('div')
  body.className = 'mdp-body'

  const {
    element: sidebar,
    tocContainer,
    explorerContainer,
    tabBar,
    tabFiles,
    tabOutline,
    filesPanel,
    outlinePanel,
    resizeHandle
  } = createTocSidebar()

  body.appendChild(sidebar)
  body.appendChild(contentPane.element)

  root.appendChild(toolbar)
  root.appendChild(body)

  return {
    element: root,
    styleElements: styles.map(createStyleElement),
    parts: {
      root,
      toolbar,
      toolbarActions: header.toolbarActions,
      sidebar,
      tocContainer,
      explorerContainer,
      tabBar,
      tabFiles,
      tabOutline,
      filesPanel,
      outlinePanel,
      resizeHandle,
      contentPane: contentPane.element,
      article: contentPane.article
    }
  }
}
