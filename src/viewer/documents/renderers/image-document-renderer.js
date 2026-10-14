import { mountDocumentState } from '../../react/content/states/mount-document-state.js'
import { clearContentUi } from '../../react/content/mount-content-ui.jsx'

function abortError() {
  return new DOMException('Document render was aborted.', 'AbortError')
}

export async function render({ loadedDocument, articleEl, services = {}, signal }) {
  if (signal?.aborted) throw abortError()
  const ownerDocument = articleEl?.ownerDocument || globalThis.document
  if (!ownerDocument || typeof articleEl?.replaceChildren !== 'function') {
    throw new Error('The image document host is unavailable.')
  }

  clearContentUi(articleEl)
  const displayName = loadedDocument?.document?.displayName || 'image'
  if (loadedDocument?.loadError || !loadedDocument?.assetUrl) {
    const message = loadedDocument?.loadError?.message || `Could not display ${displayName}.`
    mountDocumentState(articleEl, { className: 'mdp-image-document__state mdp-image-document__state--error', message, role: 'alert' })
    return { tocItems: [], interactionProfile: 'none' }
  }

  const figure = ownerDocument.createElement('figure')
  figure.className = 'mdp-image-document'
  const loadingSlot = ownerDocument.createElement('div')
  figure.append(loadingSlot)
  let loadingUi
  const image = ownerDocument.createElement('img')
  image.className = 'mdp-image-document__image'
  image.setAttribute('data-mdp-file-type', loadedDocument?.document?.fileTypeId || '')
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
    loadingUi?.destroy()
    clearContentUi(figure)
    image.removeEventListener('load', handleLoad)
    image.removeEventListener('error', handleError)
    signal?.removeEventListener?.('abort', handleAbort)
    services.closeImageLightbox?.()
  }
  const handleLoad = () => {
    if (cleaned || signal?.aborted) return
    loadingUi.destroy()
    loadingSlot.remove()
    image.hidden = false
    services.prepareZoomableImages?.()
    settleReady()
  }
  const handleError = () => {
    if (cleaned || signal?.aborted) return
    services.closeImageLightbox?.()
    loadingUi.destroy()
    mountDocumentState(figure, { className: 'mdp-image-document__state mdp-image-document__state--error', message: `Could not display ${displayName}.`, role: 'alert' })
    settleReady()
  }
  const handleAbort = () => {
    cleanup()
    settleAborted()
  }

  image.addEventListener('load', handleLoad)
  image.addEventListener('error', handleError)
  signal?.addEventListener?.('abort', handleAbort, { once: true })
  figure.append(image)
  articleEl.replaceChildren(figure)
  loadingUi = mountDocumentState(loadingSlot, { className: 'mdp-image-document__state mdp-image-document__state--loading', loading: true, message: `Loading ${displayName}…` })
  image.src = loadedDocument.assetUrl
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
