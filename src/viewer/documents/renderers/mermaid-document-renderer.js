import { mountDocumentState } from '../../react/content/states/mount-document-state.js'
import { clearContentUi } from '../../react/content/mount-content-ui.jsx'
import { closeMermaidLightbox, destroyMermaidLightbox } from '../../media/mermaid-lightbox-controller.js'
import { renderMermaidIntoNode } from '../../mermaid/mermaid-render-service.js'

function abortError() {
  return new DOMException('Document render was aborted.', 'AbortError')
}


export async function render({ loadedDocument, articleEl, settings, services = {}, signal }) {
  if (signal?.aborted) throw abortError()
  const ownerDocument = articleEl?.ownerDocument || globalThis.document
  if (!ownerDocument || typeof articleEl?.replaceChildren !== 'function') {
    throw new Error('The Mermaid document host is unavailable.')
  }

  clearContentUi(articleEl)
  if (loadedDocument?.loadError) {
    mountDocumentState(articleEl, { className: 'mdp-mermaid-document__state mdp-mermaid-document__state--error', message: loadedDocument.loadError.message || 'Could not display this Mermaid document.', role: 'alert' })
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
    mountDocumentState(articleEl, { className: 'mdp-mermaid-document__state mdp-mermaid-document__state--empty', message: 'This Mermaid file is empty.' })
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
