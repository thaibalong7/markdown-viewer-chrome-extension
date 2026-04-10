import { logger } from '../shared/logger.js'
import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'
import { detectMarkdownPage } from './page-detector.js'
import { extractRawMarkdown } from './raw-content-extractor.js'
import { looksLikeMarkdownText } from './text-sampling.js'
import { createViewerRoot } from './page-overrider.js'
import { MarkdownViewerApp } from '../viewer/app.js'

export async function bootstrap({ baseCss, layoutCss, contentCss, tocCss, explorerCss, getViewerStyles }) {
  logger.info('Content bootstrap started.')
  const protocol = window.location?.protocol || ''
  const pathname = window.location?.pathname || ''

  // Product decision: MR view only applies to local opened Markdown files,
  // not remote web links that happen to serve markdown-like content.
  const isLocalMarkdownFile = protocol === 'file:' && /\.(md|markdown|mdown)$/i.test(pathname)
  if (!isLocalMarkdownFile) {
    logger.debug('Skip viewer mount: current URL is not a local markdown file.')
    return
  }

  const detection = detectMarkdownPage({
    location: window.location,
    document
  })

  logger.debug('Detection result:', detection)

  let extraction = null
  if (!detection.isMarkdown) {
    // Phase 1 fallback: low confidence, but still try mounting if extracted
    // content clearly looks like markdown.
    //
    // Important: since this content script runs on `<all_urls>`, we must avoid
    // expensive `document.body.innerText` extraction unless we have at least
    // some hint (score/sourceType).
    const shouldAttemptFallback =
      detection.score >= 1 || detection.sourceType === 'raw-pre' || detection.sourceType === 'raw-text'

    if (!shouldAttemptFallback) {
      logger.debug('Low-confidence markdown detection with no hint. Exiting.')
      return
    }

    logger.debug('Low-confidence markdown detection. Trying fallback extraction...')
    const fallbackExtraction = extractRawMarkdown(document, { mode: 'sample', maxChars: 50000 })
    if (looksLikeMarkdownText(fallbackExtraction?.markdown)) {
      // Re-extract in full mode so the viewer renders the whole markdown.
      extraction = extractRawMarkdown(document)
    } else {
      logger.debug('Current page does not look like Markdown. Exiting.')
      return
    }
  }

  const response = await sendMessage({
    type: MESSAGE_TYPES.GET_SETTINGS
  })

  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to load settings.')
  }

  const settings = response.data
  if (!settings?.enabled) {
    logger.info('Viewer is disabled in settings.')
    return
  }

  if (!extraction) {
    extraction = extractRawMarkdown(document)
  }
  logger.debug('Extraction result:', extraction)

  if (!extraction.markdown || !extraction.markdown.trim()) {
    logger.warn('No markdown content extracted.')
    return
  }

  const styles = baseCss && layoutCss && contentCss && tocCss && explorerCss
    ? { baseCss, layoutCss, contentCss, tocCss, explorerCss }
    : await getViewerStyles?.()

  if (
    !styles?.baseCss ||
    !styles?.layoutCss ||
    !styles?.contentCss ||
    !styles?.tocCss ||
    !styles?.explorerCss
  ) {
    throw new Error('Viewer styles are missing.')
  }

  const { shadowRoot, root } = createViewerRoot()
  const mountTarget = shadowRoot || root
  // If the content script runs again (extension reload/HMR), clear previous UI
  // to prevent duplicated DOM/style accumulation.
  mountTarget.innerHTML = ''

  const app = new MarkdownViewerApp({
    markdown: extraction.markdown,
    settings,
    container: mountTarget,
    styles: [styles.baseCss, styles.layoutCss, styles.contentCss, styles.tocCss, styles.explorerCss]
  })

  app.init()
  logger.info('Markdown viewer mounted successfully.')
  return app
}
