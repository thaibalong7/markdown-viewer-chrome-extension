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
  listEl.hidden = true

  root.appendChild(backBtn)
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
    const fileButtons = listEl.querySelectorAll('.mdp-explorer__file-btn')
    for (const btn of fileButtons) {
      const isActive = btn.getAttribute('data-file-href') === href
      btn.classList.toggle('is-active', isActive)
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
      li.className = 'mdp-explorer__item'

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'mdp-explorer__file-btn'
      if (file.isActive) btn.classList.add('is-active')
      btn.setAttribute('data-file-href', file.href)
      btn.textContent = file.displayName
      btn.setAttribute('title', file.href)
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
