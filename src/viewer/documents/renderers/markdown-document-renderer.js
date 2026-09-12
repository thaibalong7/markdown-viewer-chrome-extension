import { renderDocument, renderIntoElement } from '../../core/renderer.js'
import { buildTocItems } from '../../core/toc-builder.js'

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('Document render was aborted.', 'AbortError')
}

export async function render({ loadedDocument, articleEl, settings, services, signal }) {
  const source = String(loadedDocument?.text ?? '')
  const result = await renderDocument(source, settings, {
    injectViewerStyles: services.injectViewerStyles,
    renderContextCache: services.renderContextCache
  })
  throwIfAborted(signal)

  renderIntoElement(articleEl, result.html)
  throwIfAborted(signal)

  const pluginCleanup = await result.pluginManager?.afterRender({
    articleEl,
    settings,
    copyCodeWithToast: services.copyCodeWithToast,
    signal
  })
  if (signal?.aborted) {
    pluginCleanup?.()
    throwIfAborted(signal)
  }
  services.prepareZoomableImages?.()

  return {
    tocItems: buildTocItems(articleEl),
    interactionProfile: 'markdown',
    cleanup: typeof pluginCleanup === 'function' ? pluginCleanup : undefined,
    renderedText: source,
    renderResult: result
  }
}
