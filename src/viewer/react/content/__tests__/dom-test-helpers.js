import { destroyContentUi } from '../mount-content-ui.jsx'

/** Real DOM/events; only geometry and browser-only image loading are simulated. */
export function createArticle() {
  const root = document.createElement('div')
  root.id = 'mdp-viewer-root'
  const article = document.createElement('article')
  article.className = 'mdp-markdown-body'
  article.tabIndex = -1
  root.append(article)
  document.body.append(root)
  return article
}

export function cleanDom() {
  for (const root of document.querySelectorAll('#mdp-viewer-root')) destroyContentUi(root)
  destroyContentUi(document.body)
  document.body.replaceChildren()
}

export function fire(node, type, options = {}) {
  if (type === 'click' && node.disabled) return
  if (type === 'click' && node.tagName === 'BUTTON') node.focus()
  const target = options.target || node
  if (type === 'focusin' && target !== document && target !== window) target.focus()
  const Constructor = type.startsWith('key') ? KeyboardEvent : /click|pointer|mouse/.test(type) ? MouseEvent : Event
  const event = new Constructor(type, { bubbles: true, cancelable: true, ...options })
  if (options.composedPath) Object.defineProperty(event, 'composedPath', { value: options.composedPath })
  target.dispatchEvent(event)
}
