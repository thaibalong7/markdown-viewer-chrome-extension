import { mountDocumentState } from '../../react/content/states/mount-document-state.js'
import { renderDocument, renderIntoElement } from '../../core/renderer.js'
import { buildTocItems } from '../../core/toc-builder.js'
import { isEditorFeatureEnabled } from '../../../shared/constants/editor.js'
import { prepareMarkdownImages } from '../markdown-images.js'

const PLUGIN_WARNING_MESSAGE =
  'viewer.documents.markdown.someMarkdownEnhancementsCouldNotBeAppliedBasic'

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException("Document render was aborted.", 'AbortError')
}

function renderEmptyState(articleEl, { placeholderMessage, showEditHint = false } = {}) {
  const ownerDocument = articleEl?.ownerDocument || globalThis.document
  if (!ownerDocument?.createElement || typeof articleEl?.replaceChildren !== 'function') {
    throw new Error('Missing render target document.')
  }

  mountDocumentState(articleEl, {
    className: 'mdp-ui-state mdp-document-empty',
    title: placeholderMessage ? undefined : 'viewer.documents.markdown.emptyMarkdownDocument',
    message: placeholderMessage || (showEditHint ? 'viewer.documents.markdown.useEditToStartWriting' : undefined)
  })
}

export async function render({ loadedDocument, articleEl, settings, services, signal }) {
  const source = String(loadedDocument?.text ?? '')
  const placeholderMessage = loadedDocument?.placeholderMessage
  if (placeholderMessage || !source.trim()) {
    throwIfAborted(signal)
    renderEmptyState(articleEl, {
      placeholderMessage,
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

  const imageCleanup = prepareMarkdownImages({
    articleEl,
    documentHref: loadedDocument?.document?.href,
    signal
  })
  let pluginCleanup
  try {
    pluginCleanup = await result.pluginManager?.afterRender({
      articleEl,
      settings,
      copyCodeWithToast: services.copyCodeWithToast,
      signal,
      onPluginWarning
    })
    throwIfAborted(signal)
    services.prepareZoomableImages?.()
  } catch (error) {
    imageCleanup()
    pluginCleanup?.()
    throw error
  }

  return {
    tocItems: buildTocItems(articleEl),
    interactionProfile: 'markdown',
    cleanup: () => {
      imageCleanup()
      pluginCleanup?.()
    },
    renderedText: source,
    renderResult: {
      ...result,
      warnings: pluginWarnings
    }
  }
}
