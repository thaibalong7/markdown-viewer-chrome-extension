function createState(document, className, message, role = 'status') {
  const state = document.createElement('div')
  state.className = className
  state.setAttribute('role', role)
  state.textContent = message
  return state
}

export async function render({ loadedDocument, articleEl, signal }) {
  if (signal?.aborted) {
    throw new DOMException('Document render was aborted.', 'AbortError')
  }

  const ownerDocument = articleEl?.ownerDocument || globalThis.document
  if (!ownerDocument || typeof articleEl?.replaceChildren !== 'function') {
    throw new Error('The text document host is unavailable.')
  }

  let content
  if (loadedDocument?.loadError) {
    content = createState(
      ownerDocument,
      'mdp-text-document__state mdp-text-document__state--error',
      loadedDocument.loadError.message || 'Could not display this text file.',
      'alert'
    )
  } else {
    const source = String(loadedDocument?.text ?? '')
    if (!source) {
      content = createState(
        ownerDocument,
        'mdp-text-document__state mdp-text-document__state--empty',
        'This text file is empty.'
      )
    } else {
      const pre = ownerDocument.createElement('pre')
      pre.className = 'mdp-text-document'
      const code = ownerDocument.createElement('code')
      code.textContent = source
      pre.appendChild(code)
      content = pre
    }
  }

  if (signal?.aborted) {
    throw new DOMException('Document render was aborted.', 'AbortError')
  }
  articleEl.replaceChildren(content)

  return {
    tocItems: [],
    interactionProfile: 'none'
  }
}
