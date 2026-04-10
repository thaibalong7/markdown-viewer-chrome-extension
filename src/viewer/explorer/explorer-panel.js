/**
 * Imperative Files tab UI: loading, empty state, sibling list, back to original.
 * @param {object} options
 * @param {HTMLElement} options.container
 * @param {(href: string) => void} [options.onNavigate] - called before in-viewer navigation (optional)
 */
export function createExplorerPanel({ container, onNavigate } = {}) {
  const root = document.createElement('div')
  root.className = 'mdp-explorer'
  root.setAttribute('role', 'region')
  root.setAttribute('aria-label', 'Markdown files in folder')

  const headerEl = document.createElement('div')
  headerEl.className = 'mdp-explorer__header'

  const headingRowEl = document.createElement('div')
  headingRowEl.className = 'mdp-explorer__heading-row'

  const headingLabelEl = document.createElement('strong')
  headingLabelEl.className = 'mdp-explorer__heading'
  headingLabelEl.textContent = 'Files'

  const metaEl = document.createElement('span')
  metaEl.className = 'mdp-explorer__meta'
  metaEl.textContent = '0 files'

  headingRowEl.appendChild(headingLabelEl)
  headingRowEl.appendChild(metaEl)

  const pathEl = document.createElement('div')
  pathEl.className = 'mdp-explorer__path'
  pathEl.textContent = 'Current folder'

  const backBtn = document.createElement('button')
  backBtn.type = 'button'
  backBtn.className = 'mdp-explorer__back-btn mdp-button'
  backBtn.hidden = true

  const loadingEl = document.createElement('div')
  loadingEl.className = 'mdp-explorer__loading'
  loadingEl.textContent = 'Loading…'
  loadingEl.hidden = true

  const emptyEl = document.createElement('div')
  emptyEl.className = 'mdp-explorer__empty'
  emptyEl.textContent = 'No markdown files found in this directory.'
  emptyEl.hidden = true

  const listEl = document.createElement('ul')
  listEl.className = 'mdp-explorer__list'
  listEl.setAttribute('role', 'tree')
  listEl.setAttribute('aria-label', 'Files in current folder')
  listEl.hidden = true
  const setSummary = setSummaryFactory(pathEl, metaEl)

  headerEl.appendChild(headingRowEl)
  headerEl.appendChild(pathEl)
  headerEl.appendChild(backBtn)

  root.appendChild(headerEl)
  root.appendChild(loadingEl)
  root.appendChild(emptyEl)
  root.appendChild(listEl)

  container.appendChild(root)

  /** @type {(() => void) | null} */
  let backHandler = null
  /** @type {(() => void) | null} */
  let listClickCleanup = null

  function clearListListeners() {
    if (listClickCleanup) {
      listClickCleanup()
      listClickCleanup = null
    }
  }

  /**
   * @param {string} href
   */
  function markActiveFile(href) {
    if (!href) return
    const fileButtons = listEl.querySelectorAll('.mdp-explorer__node-btn')
    for (const btn of fileButtons) {
      const isActive = btn.getAttribute('data-file-href') === href
      btn.classList.toggle('is-active', isActive)
      btn.setAttribute('aria-current', isActive ? 'true' : 'false')
    }
  }

  function setBackVisible(visible, label, handler) {
    backBtn.hidden = !visible
    if (backHandler) {
      backBtn.removeEventListener('click', backHandler)
      backHandler = null
    }
    if (visible && handler) {
      backBtn.textContent = label || 'Back to original file'
      backHandler = () => {
        handler()
      }
      backBtn.addEventListener('click', backHandler)
    }
  }

  function showLoading() {
    setSummary({ fileCount: 0 })
    loadingEl.hidden = false
    emptyEl.hidden = true
    listEl.hidden = true
    clearListListeners()
    listEl.replaceChildren()
  }

  /**
   * @param {object} [ctx]
   * @param {boolean} [ctx.showBack]
   * @param {string} [ctx.backLabel]
   * @param {() => void} [ctx.onBack]
   */
  function showEmpty(ctx = {}) {
    setSummary({
      directoryLabel: getDirectoryLabelFromUrl(ctx.currentFileUrl),
      fileCount: 0
    })
    loadingEl.hidden = true
    emptyEl.hidden = false
    listEl.hidden = true
    clearListListeners()
    listEl.replaceChildren()
    setBackVisible(Boolean(ctx.showBack), ctx.backLabel, ctx.onBack)
  }

  /**
   * @param {Array<{ displayName: string, href: string, isActive: boolean }>} files
   * @param {object} ctx
   * @param {string} ctx.currentFileUrl
   * @param {string | null} ctx.originalFileUrl
   * @param {boolean} ctx.showBack
   * @param {string} [ctx.backLabel]
   * @param {() => void} ctx.onBack
   */
  function showFiles(files, ctx) {
    setSummary({
      directoryLabel: getDirectoryLabelFromUrl(ctx.currentFileUrl),
      fileCount: files.length
    })
    loadingEl.hidden = true
    emptyEl.hidden = files.length > 0
    listEl.hidden = files.length === 0
    clearListListeners()

    if (files.length === 0) {
      setBackVisible(ctx.showBack, ctx.backLabel, ctx.onBack)
      return
    }

    const fragment = document.createDocumentFragment()
    for (const file of files) {
      const li = document.createElement('li')
      li.className = 'mdp-explorer__node'
      li.setAttribute('role', 'treeitem')
      li.setAttribute('aria-level', '1')

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'mdp-explorer__node-btn'
      if (file.isActive) btn.classList.add('is-active')
      btn.setAttribute('data-file-href', file.href)
      btn.setAttribute('aria-current', file.isActive ? 'true' : 'false')
      btn.setAttribute('title', file.href)

      const depthEl = document.createElement('span')
      depthEl.className = 'mdp-explorer__node-depth'
      depthEl.setAttribute('aria-hidden', 'true')

      const iconEl = document.createElement('span')
      iconEl.className = 'mdp-explorer__node-icon'
      iconEl.setAttribute('aria-hidden', 'true')
      iconEl.textContent = '📄'

      const labelEl = document.createElement('span')
      labelEl.className = 'mdp-explorer__node-label'
      labelEl.textContent = file.displayName

      btn.appendChild(depthEl)
      btn.appendChild(iconEl)
      btn.appendChild(labelEl)
      btn.addEventListener('click', () => {
        if (file.isActive) return
        markActiveFile(file.href)
        onNavigate?.(file.href)
      })

      li.appendChild(btn)
      fragment.appendChild(li)
    }
    listEl.replaceChildren(fragment)

    setBackVisible(ctx.showBack, ctx.backLabel, ctx.onBack)
  }

  function destroy() {
    clearListListeners()
    if (backHandler) {
      backBtn.removeEventListener('click', backHandler)
      backHandler = null
    }
    root.remove()
  }

  return {
    root,
    showLoading,
    showEmpty,
    showFiles,
    destroy
  }
}

/**
 * @param {object} options
 * @param {string} [options.directoryLabel]
 * @param {number} options.fileCount
 */
function setSummaryFactory(pathEl, metaEl) {
  /**
   * @param {object} options
   * @param {string} [options.directoryLabel]
   * @param {number} options.fileCount
   */
  return function setSummary({ directoryLabel, fileCount }) {
    if (directoryLabel) pathEl.textContent = directoryLabel
    metaEl.textContent = `${fileCount} ${fileCount === 1 ? 'file' : 'files'}`
  }
}

/**
 * @param {string | undefined} fileUrl
 * @returns {string}
 */
function getDirectoryLabelFromUrl(fileUrl) {
  if (!fileUrl) return 'Current folder'
  try {
    const parsed = new URL(fileUrl)
    if (parsed.protocol !== 'file:') return 'Current folder'
    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments.length <= 1) return '/'
    const folderPath = segments.slice(0, -1).join('/')
    return `/${decodeURIComponent(folderPath)}`
  } catch {
    return 'Current folder'
  }
}
