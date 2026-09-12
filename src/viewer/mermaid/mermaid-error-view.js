export function formatMermaidRenderError(error) {
  if (error == null) return 'Unknown error.'
  const message = typeof error.message === 'string' ? error.message.trim() : ''
  const detail = typeof error.str === 'string' ? error.str.trim() : ''
  if (message && detail && detail !== message) return `${message}\n\n${detail}`
  if (message) return message
  if (detail) return detail
  try {
    return String(error)
  } catch {
    return 'Unknown error.'
  }
}

export function setMermaidRenderError(node, source, error) {
  if (!node) return
  const ownerDocument = node.ownerDocument || globalThis.document
  node.classList.add('mdp-mermaid--error')
  node.replaceChildren()

  const banner = ownerDocument.createElement('div')
  banner.className = 'mdp-mermaid__error-banner'

  const title = ownerDocument.createElement('div')
  title.className = 'mdp-mermaid__error-title'
  title.textContent = 'Mermaid render error'

  const message = ownerDocument.createElement('pre')
  message.className = 'mdp-mermaid__error-message'
  message.setAttribute('role', 'alert')
  message.textContent = formatMermaidRenderError(error)
  banner.append(title, message)

  const sourceTitle = ownerDocument.createElement('div')
  sourceTitle.className = 'mdp-mermaid__source-title'
  sourceTitle.textContent = 'Diagram source'

  const sourcePre = ownerDocument.createElement('pre')
  sourcePre.className = 'mdp-mermaid__source'
  sourcePre.textContent = String(source ?? '')
  node.append(banner, sourceTitle, sourcePre)
}
