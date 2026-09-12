import { closeMermaidLightbox, destroyMermaidLightbox } from '../../../plugins/optional/mermaid-lightbox.js'
import { renderMermaidIntoNode } from '../../mermaid/mermaid-render-service.js'

function abortError() {
  return new DOMException('Document render was aborted.', 'AbortError')
}

function createState(document, modifier, message, role = 'status') {
  const state = document.createElement('div')
  state.className = `mdp-mermaid-document__state mdp-mermaid-document__state--${modifier}`
  state.setAttribute('role', role)
  state.textContent = message
  return state
}

export async function render({ loadedDocument, articleEl, settings, services = {}, signal }) {
  if (signal?.aborted) throw abortError()
  const ownerDocument = articleEl?.ownerDocument || globalThis.document
  if (!ownerDocument || typeof articleEl?.replaceChildren !== 'function') {
    throw new Error('The Mermaid document host is unavailable.')
  }

  if (loadedDocument?.loadError) {
    articleEl.replaceChildren(createState(
      ownerDocument,
      'error',
      loadedDocument.loadError.message || 'Could not display this Mermaid document.',
      'alert'
    ))
    return { tocItems: [], interactionProfile: 'none' }
  }

  const source = String(loadedDocument?.text ?? '')
  if (loadedDocument?.document?.viewMode === 'raw') {
    const pre = ownerDocument.createElement('pre')
    pre.className = 'mdp-mermaid-document__source'
    const code = ownerDocument.createElement('code')
    code.textContent = source
    pre.appendChild(code)
    articleEl.replaceChildren(pre)
    return { tocItems: [], interactionProfile: 'none' }
  }

  if (!source) {
    articleEl.replaceChildren(createState(ownerDocument, 'empty', 'This Mermaid file is empty.'))
    return { tocItems: [], interactionProfile: 'none' }
  }

  const diagram = ownerDocument.createElement('div')
  diagram.className = 'mdp-mermaid mdp-mermaid-document'
  diagram.textContent = source
  articleEl.replaceChildren(diagram)
  const result = await renderMermaidIntoNode({
    node: diagram,
    source,
    settings,
    chartIndex: 1,
    copyCodeWithToast: services.copyCodeWithToast,
    signal
  })
  if (signal?.aborted) {
    result.cleanup?.()
    throw abortError()
  }

  return {
    tocItems: [],
    interactionProfile: 'none',
    cleanup() {
      result.cleanup?.()
      closeMermaidLightbox()
      destroyMermaidLightbox(articleEl.closest?.('.mdp-root'))
    }
  }
}
