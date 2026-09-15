import { highlightCode } from '../../core/shiki-highlighter.js'
import { renderIntoElement, sanitizeHtml } from '../../core/renderer.js'

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('Document render was aborted.', 'AbortError')
}

function createState(document, modifier, message, role = 'status') {
  const state = document.createElement('div')
  state.className = `mdp-sql-document__state mdp-sql-document__state--${modifier}`
  state.setAttribute('role', role)
  state.textContent = message
  return state
}

function createPlainSql(document, source) {
  const pre = document.createElement('pre')
  pre.className = 'mdp-sql-document__source'
  pre.setAttribute('data-mdp-lang', 'sql')
  const code = document.createElement('code')
  code.textContent = source
  pre.appendChild(code)
  return pre
}

export async function render({ loadedDocument, articleEl, settings, signal }) {
  throwIfAborted(signal)
  const ownerDocument = articleEl?.ownerDocument || globalThis.document
  if (!ownerDocument || typeof articleEl?.replaceChildren !== 'function') {
    throw new Error('The SQL document host is unavailable.')
  }

  if (loadedDocument?.loadError) {
    articleEl.replaceChildren(createState(
      ownerDocument,
      'error',
      loadedDocument.loadError.message || 'Could not display this SQL file.',
      'alert'
    ))
    return { tocItems: [], interactionProfile: 'none' }
  }

  const source = String(loadedDocument?.text ?? '')
  if (!source) {
    articleEl.replaceChildren(createState(ownerDocument, 'empty', 'This SQL file is empty.'))
    return { tocItems: [], interactionProfile: 'none' }
  }

  const container = ownerDocument.createElement('section')
  container.className = 'mdp-sql-document'

  const header = ownerDocument.createElement('div')
  header.className = 'mdp-sql-document__header'
  header.textContent = 'SQL'
  container.appendChild(header)

  const codeHighlightEnabled = settings?.plugins?.codeHighlight?.enabled !== false
  const highlightedHtml = codeHighlightEnabled
    ? await highlightCode(source, 'sql', settings)
    : null
  throwIfAborted(signal)

  if (highlightedHtml) {
    const highlighted = ownerDocument.createElement('div')
    highlighted.className = 'mdp-sql-document__highlighted'
    renderIntoElement(highlighted, sanitizeHtml(highlightedHtml))
    container.appendChild(highlighted)
  } else {
    container.appendChild(createPlainSql(ownerDocument, source))
  }

  throwIfAborted(signal)
  articleEl.replaceChildren(container)
  return { tocItems: [], interactionProfile: 'none' }
}
