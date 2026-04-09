import { logger } from '../shared/logger.js'
import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'
import { detectMarkdownPage } from './page-detector.js'
import { extractRawMarkdown } from './raw-content-extractor.js'
import { createViewerRoot } from './page-overrider.js'
import { MarkdownViewerApp } from '../viewer/app.js'

export async function bootstrap({ baseCss, layoutCss, contentCss, tocCss, settingsCss, getViewerStyles }) {
  logger.info('Content bootstrap started.')

  const detection = detectMarkdownPage({
    location: window.location,
    document
  })

  logger.debug('Detection result:', detection)

  function looksLikeMarkdownText(text) {
    const value = String(text || '')
    if (value.length < 200) return false
    return (
      /^(#{1,6}\s+)/m.test(value) ||
      /^```/m.test(value) ||
      /^>\s+/m.test(value) ||
      /^(\-|\*|\+)\s+/m.test(value) ||
      /^\d+\.\s+/m.test(value) ||
      /^(\s*[-*_]{3,}\s*)$/m.test(value) ||
      /\*\*[^*]+\*\*/.test(value) ||
      /\[[^\]]+\]\([^)]+\)/.test(value)
    )
  }

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

  const styles = baseCss && layoutCss && contentCss && tocCss && settingsCss
    ? { baseCss, layoutCss, contentCss, tocCss, settingsCss }
    : await getViewerStyles?.()

  if (!styles?.baseCss || !styles?.layoutCss || !styles?.contentCss || !styles?.tocCss || !styles?.settingsCss) {
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
    styles: [styles.baseCss, styles.layoutCss, styles.contentCss, styles.tocCss, styles.settingsCss]
  })

  app.init()
  logger.info('Markdown viewer mounted successfully.')
}
