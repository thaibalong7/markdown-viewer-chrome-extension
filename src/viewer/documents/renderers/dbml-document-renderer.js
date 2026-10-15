import { DocumentLabel } from '../../react/content/states/DocumentState.jsx'
import { mountDocumentState } from '../../react/content/states/mount-document-state.js'
import { mountContentUi, clearContentUi } from '../../react/content/mount-content-ui.jsx'
import { highlightCode } from '../../core/shiki-highlighter.js'
import { renderIntoElement, sanitizeHtml } from '../../core/renderer.js'
import { logger } from '../../../shared/logger.js'

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('Document render was aborted.', 'AbortError')
}

function createPlainSource(document, source) {
  const pre = document.createElement('pre')
  pre.className = 'mdp-dbml-document__source'
  pre.setAttribute('data-mdp-lang', 'dbml')
  const code = document.createElement('code')
  code.textContent = source
  pre.appendChild(code)
  return pre
}

function restoreSourceLineBreaks(container, source) {
  // Shared highlighting removes separator text for block .line spans. DBML
  // uses inline spans plus the original separators for faithful selection/copy.
  const lines = [...container.querySelectorAll('pre.shiki code > .line')]
  const separators = source.match(/\r\n|\r|\n/g) || []
  if (lines.length !== separators.length + 1) return
  for (let index = 1; index < lines.length; index++) {
    lines[index].before(container.ownerDocument.createTextNode(separators[index - 1]))
  }
}

export async function render({ loadedDocument, articleEl, settings, services = {}, signal }) {
  throwIfAborted(signal)
  const ownerDocument = articleEl?.ownerDocument || globalThis.document
  if (!ownerDocument || typeof articleEl?.replaceChildren !== 'function') {
    throw new Error('The DBML document host is unavailable.')
  }

  clearContentUi(articleEl)
  if (loadedDocument?.loadError || !loadedDocument?.text) {
    const failed = Boolean(loadedDocument?.loadError)
    const stateUi = mountDocumentState(articleEl, {
      className: `mdp-dbml-document__state mdp-dbml-document__state--${failed ? 'error' : 'empty'}`,
      message: failed
        ? loadedDocument.loadError.message || 'Could not display this DBML file.'
        : 'This DBML file is empty.',
      role: failed ? 'alert' : 'status'
    })
    return { tocItems: [], interactionProfile: 'none', cleanup: () => stateUi.destroy() }
  }

  const source = String(loadedDocument.text)
  const container = ownerDocument.createElement('section')
  container.className = 'mdp-dbml-document'
  const header = ownerDocument.createElement('div')
  header.className = 'mdp-dbml-document__header'
  container.appendChild(header)

  const highlightedHtml = settings?.plugins?.codeHighlight?.enabled !== false
    ? await highlightCode(source, 'dbml', settings)
    : null
  throwIfAborted(signal)
  if (highlightedHtml) {
    const highlighted = ownerDocument.createElement('div')
    highlighted.className = 'mdp-dbml-document__highlighted'
    renderIntoElement(highlighted, sanitizeHtml(highlightedHtml))
    restoreSourceLineBreaks(highlighted, source)
    container.appendChild(highlighted)
  } else {
    container.appendChild(createPlainSource(ownerDocument, source))
  }

  articleEl.replaceChildren(container)
  const headerUi = mountContentUi(header, DocumentLabel, { text: 'DBML' }, { scope: articleEl })
  let colorCleanup
  const cleanup = () => {
    colorCleanup?.()
    headerUi.destroy()
  }
  try {
    // Reuse the optional inspector without loading Markdown's other plugins.
    if (settings?.plugins?.colorPreview?.enabled !== false) {
      try {
        const { colorPreviewPlugin } = await import('../../../plugins/optional/color-preview.plugin.js')
        throwIfAborted(signal)
        colorCleanup = colorPreviewPlugin.afterRender({ articleEl, signal })
      } catch (error) {
        throwIfAborted(signal)
        logger.warn('DBML color preview failed; source remains available.', { errorName: error?.name || 'Error' })
        services.showToast?.('Color previews could not be displayed. DBML source is still available.', { variant: 'warning' })
      }
    }
    throwIfAborted(signal)
  } catch (error) {
    cleanup()
    throw error
  }
  return { tocItems: [], interactionProfile: 'none', cleanup }
}
