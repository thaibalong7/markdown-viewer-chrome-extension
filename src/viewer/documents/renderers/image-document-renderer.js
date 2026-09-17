function createState(document, modifier, message, role = 'status') {
  const state = document.createElement('div')
  state.className = `mdp-image-document__state mdp-image-document__state--${modifier}`
  state.setAttribute('role', role)
  if (modifier === 'loading') {
    state.className += ' mdp-ui-loading-state'
    state.setAttribute('aria-busy', 'true')
    const spinner = document.createElement('span')
    spinner.className = 'mdp-ui-spinner'
    spinner.setAttribute('aria-hidden', 'true')
    const label = document.createElement('span')
    label.textContent = message
    state.append(spinner, label)
  } else {
    state.textContent = message
  }
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
  let settled = false
  let resolveImage
  let rejectImage
  const imageReady = new Promise((resolve, reject) => {
    resolveImage = resolve
    rejectImage = reject
  })
  const settleReady = () => {
    if (settled) return
    settled = true
    resolveImage()
  }
  const settleAborted = () => {
    if (settled) return
    settled = true
    rejectImage(abortError())
  }
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    image.removeEventListener('load', handleLoad)
    image.removeEventListener('error', handleError)
    signal?.removeEventListener?.('abort', handleAbort)
    services.closeImageLightbox?.()
  }
  const handleLoad = () => {
    if (cleaned || signal?.aborted) return
    loadingState.remove()
    image.hidden = false
    services.prepareZoomableImages?.()
    settleReady()
  }
  const handleError = () => {
    if (cleaned || signal?.aborted) return
    services.closeImageLightbox?.()
    figure.replaceChildren(
      createState(ownerDocument, 'error', `Could not display ${displayName}.`, 'alert')
    )
    settleReady()
  }
  const handleAbort = () => {
    cleanup()
    settleAborted()
  }

  image.addEventListener('load', handleLoad)
  image.addEventListener('error', handleError)
  signal?.addEventListener?.('abort', handleAbort, { once: true })
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

  await imageReady
  if (signal?.aborted) {
    cleanup()
    throw abortError()
  }

  return { tocItems: [], interactionProfile: 'image', cleanup }
}
