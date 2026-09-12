function createState(document, modifier, message, role = 'status') {
  const state = document.createElement('div')
  state.className = `mdp-image-document__state mdp-image-document__state--${modifier}`
  state.setAttribute('role', role)
  state.textContent = message
  return state
}

function abortError() {
  return new DOMException('Document render was aborted.', 'AbortError')
}

export async function render({ loadedDocument, articleEl, services = {}, signal }) {
  if (signal?.aborted) throw abortError()
  const ownerDocument = articleEl?.ownerDocument || globalThis.document
  if (!ownerDocument || typeof articleEl?.replaceChildren !== 'function') {
    throw new Error('The image document host is unavailable.')
  }

  const displayName = loadedDocument?.document?.displayName || 'image'
  if (loadedDocument?.loadError || !loadedDocument?.assetUrl) {
    const message = loadedDocument?.loadError?.message || `Could not display ${displayName}.`
    articleEl.replaceChildren(createState(ownerDocument, 'error', message, 'alert'))
    return { tocItems: [], interactionProfile: 'none' }
  }

  const figure = ownerDocument.createElement('figure')
  figure.className = 'mdp-image-document'
  const loadingState = createState(ownerDocument, 'loading', `Loading ${displayName}…`)
  const image = ownerDocument.createElement('img')
  image.className = 'mdp-image-document__image'
  image.alt = displayName
  image.hidden = true
  image.draggable = false
  image.decoding = 'async'

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    image.removeEventListener('load', handleLoad)
    image.removeEventListener('error', handleError)
    signal?.removeEventListener?.('abort', cleanup)
    services.closeImageLightbox?.()
  }
  const handleLoad = () => {
    if (cleaned || signal?.aborted) return
    loadingState.remove()
    image.hidden = false
    services.prepareZoomableImages?.()
  }
  const handleError = () => {
    if (cleaned || signal?.aborted) return
    services.closeImageLightbox?.()
    figure.replaceChildren(
      createState(ownerDocument, 'error', `Could not display ${displayName}.`, 'alert')
    )
  }

  image.addEventListener('load', handleLoad)
  image.addEventListener('error', handleError)
  signal?.addEventListener?.('abort', cleanup, { once: true })
  image.src = loadedDocument.assetUrl
  figure.append(loadingState, image)
  articleEl.replaceChildren(figure)
  if (signal?.aborted) {
    cleanup()
    throw abortError()
  }
  if (image.complete) {
    if (Number(image.naturalWidth) > 0 && Number(image.naturalHeight) > 0) handleLoad()
    else handleError()
  }

  return { tocItems: [], interactionProfile: 'image', cleanup }
}
