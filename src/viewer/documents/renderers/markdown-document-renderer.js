import { renderDocument, renderIntoElement } from '../../core/renderer.js'
import { buildTocItems } from '../../core/toc-builder.js'
import { isEditorFeatureEnabled } from '../../../shared/constants/editor.js'

const PLUGIN_WARNING_MESSAGE =
  'Some Markdown enhancements could not be applied. Basic Markdown is still available.'

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('Document render was aborted.', 'AbortError')
}

function renderEmptyState(articleEl, { showEditHint = false } = {}) {
  const ownerDocument = articleEl?.ownerDocument || globalThis.document
  if (!ownerDocument?.createElement || typeof articleEl?.replaceChildren !== 'function') {
    throw new Error('Missing render target document.')
  }

  const state = ownerDocument.createElement('section')
  state.className = 'mdp-ui-state mdp-document-empty'
  state.setAttribute('role', 'status')

  const title = ownerDocument.createElement('strong')
  title.className = 'mdp-ui-state__title'
  title.textContent = 'Empty Markdown document'

  state.append(title)
  if (showEditHint) {
    const message = ownerDocument.createElement('p')
    message.className = 'mdp-ui-state__message'
    message.textContent = 'Use Edit to start writing.'
    state.append(message)
  }
  articleEl.replaceChildren(state)
}

export async function render({ loadedDocument, articleEl, settings, services, signal }) {
  const source = String(loadedDocument?.text ?? '')
  if (!source.trim()) {
    throwIfAborted(signal)
    renderEmptyState(articleEl, {
      showEditHint:
        loadedDocument?.document?.sourceKind === 'file-url' && isEditorFeatureEnabled(settings)
    })
    return {
      tocItems: [],
      interactionProfile: 'markdown',
      renderedText: source,
      renderResult: { html: '', warnings: [] }
    }
  }

  const pluginWarnings = []
  let pluginWarningShown = false
  const onPluginWarning = (warning) => {
    pluginWarnings.push(warning)
    if (pluginWarningShown) return
    pluginWarningShown = true
    services.showToast?.(PLUGIN_WARNING_MESSAGE, { variant: 'warning' })
  }
  const result = await renderDocument(source, settings, {
    injectViewerStyles: services.injectViewerStyles,
    renderContextCache: services.renderContextCache,
    onPluginWarning
  })
  throwIfAborted(signal)

  renderIntoElement(articleEl, result.html)
  throwIfAborted(signal)

  const pluginCleanup = await result.pluginManager?.afterRender({
    articleEl,
    settings,
    copyCodeWithToast: services.copyCodeWithToast,
    signal,
    onPluginWarning
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
    renderResult: {
      ...result,
      warnings: pluginWarnings
    }
  }
}
