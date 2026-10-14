import { mountDocumentState } from '../../react/content/states/mount-document-state.js'
import { clearContentUi } from '../../react/content/mount-content-ui.jsx'

export async function render({ loadedDocument, articleEl, signal }) {
  if (signal?.aborted) {
    throw new DOMException('Document render was aborted.', 'AbortError')
  }

  const ownerDocument = articleEl?.ownerDocument || globalThis.document
  if (!ownerDocument || typeof articleEl?.replaceChildren !== 'function') {
    throw new Error('The text document host is unavailable.')
  }

  clearContentUi(articleEl)
  if (loadedDocument?.loadError) {
    mountDocumentState(articleEl, { className: 'mdp-text-document__state mdp-text-document__state--error', message: loadedDocument.loadError.message || 'Could not display this text file.', role: 'alert' })
  } else {
    const source = String(loadedDocument?.text ?? '')
    if (!source) {
      mountDocumentState(articleEl, { className: 'mdp-text-document__state mdp-text-document__state--empty', message: 'This text file is empty.' })
    } else {
      const pre = ownerDocument.createElement('pre')
      pre.className = 'mdp-text-document'
      const code = ownerDocument.createElement('code')
      code.textContent = source
      pre.appendChild(code)
      articleEl.replaceChildren(pre)
    }
  }

  return {
    tocItems: [],
    interactionProfile: 'none'
  }
}
