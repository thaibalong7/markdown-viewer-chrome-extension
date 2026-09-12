import { getDocumentCapabilities, getFileTypeFromUrl } from '../../shared/file-types.js'
import { logger } from '../../shared/logger.js'
import { loadDocument as defaultLoadDocument } from '../documents/document-loader.js'
import { createDocumentIdentity, createDocumentUiState } from '../documents/document-model.js'

function cleanupLoadedDocument(loadedDocument) {
  try {
    loadedDocument?.revokeAssetUrl?.()
  } catch (error) {
    logger.debug('Could not release document asset URL.', error)
  }
}

function safeLoadError(error, fileType) {
  if (error?.code === 'document-too-large' && error?.userMessage) {
    return { code: error.code, message: error.userMessage }
  }
  const kind = fileType?.contentKind === 'image' ? 'image' : 'text file'
  const message = /permission|denied|access/i.test(error?.message || '')
    ? `Could not read this ${kind}.`
    : `Could not open this ${kind}.`
  return { code: 'document-load-failed', message }
}

export function createDocumentSessionController({
  initialDocument,
  initialText = '',
  loadDocument = defaultLoadDocument,
  render,
  beforeDocumentSwitch,
  onDocumentSwitchStart,
  onDocumentLoaded,
  onCurrentDocumentChange,
  publishUiState,
  showToast
}) {
  let currentDocument = initialDocument
  let loadedDocument = {
    document: initialDocument,
    text: String(initialText ?? ''),
    assetUrl: null,
    revokeAssetUrl: null
  }
  let loadController = null
  let navigationToken = 0
  let destroyed = false

  const publish = (state = {}, document = currentDocument) => {
    publishUiState?.(createDocumentUiState(document, state))
  }

  async function openDocument(href, options = {}) {
    if (destroyed || !href) return false
    const fileType = getFileTypeFromUrl(href)
    const nextDocument = createDocumentIdentity(href)
    if (!fileType || !nextDocument) {
      showToast?.('This file type is not supported', { variant: 'error' })
      return false
    }

    const sameDocument = currentDocument?.href === nextDocument.href
    if (!sameDocument || options.forceReload) {
      const canSwitch = await beforeDocumentSwitch?.({
        currentDocument,
        nextDocument,
        forceReload: Boolean(options.forceReload)
      })
      if (canSwitch === false) return false
    }

    const token = ++navigationToken
    loadController?.abort()
    loadController = new AbortController()
    onDocumentSwitchStart?.()
    publish({ loading: true }, nextDocument)

    try {
      const payload = await loadDocument({
        href,
        fileType,
        workspaceReader: options.workspaceReader,
        signal: loadController.signal
      })
      if (destroyed || token !== navigationToken) {
        cleanupLoadedDocument(payload)
        return false
      }
      if (fileType.id === 'markdown' && !String(payload.text ?? '').trim()) {
        showToast?.('Linked file is empty', { variant: 'warning' })
        publish()
        return false
      }

      cleanupLoadedDocument(loadedDocument)
      currentDocument = nextDocument
      loadedDocument = { document: nextDocument, ...payload }
      onDocumentLoaded?.(loadedDocument)
      onCurrentDocumentChange?.(nextDocument)
      publish()
      await render?.({ preserveScroll: false, honorHash: false })
      return !destroyed && token === navigationToken
    } catch (error) {
      if (error?.name === 'AbortError' || destroyed || token !== navigationToken) return false
      logger.warn('Failed to open document.', {
        fileTypeId: fileType.id,
        href,
        message: error instanceof Error ? error.message : String(error)
      })
      if (fileType.id !== 'markdown') {
        const loadError = safeLoadError(error, fileType)
        cleanupLoadedDocument(loadedDocument)
        currentDocument = nextDocument
        loadedDocument = {
          document: nextDocument,
          text: '',
          assetUrl: null,
          revokeAssetUrl: null,
          loadError
        }
        onDocumentLoaded?.(loadedDocument)
        onCurrentDocumentChange?.(nextDocument)
        publish({ error: loadError.message })
        await render?.({ preserveScroll: false, honorHash: false })
        return !destroyed && token === navigationToken
      }
      const message = /permission|denied|access/i.test(error?.message || '')
        ? 'Could not read linked file'
        : 'Could not open linked file'
      showToast?.(message, { variant: 'error' })
      publish({ error: message })
      return false
    } finally {
      if (token === navigationToken) loadController = null
    }
  }

  async function showPlaceholder(text) {
    if (destroyed) return false
    const canSwitch = await beforeDocumentSwitch?.({ currentDocument, nextDocument: null })
    if (canSwitch === false) return false
    ++navigationToken
    loadController?.abort()
    loadController = null
    onDocumentSwitchStart?.()
    cleanupLoadedDocument(loadedDocument)
    currentDocument = null
    loadedDocument = {
      document: { fileTypeId: 'markdown', rendererId: 'markdown' },
      text: String(text ?? ''),
      assetUrl: null,
      revokeAssetUrl: null
    }
    onDocumentLoaded?.(loadedDocument)
    onCurrentDocumentChange?.(null)
    publish()
    await render?.({ preserveScroll: false, honorHash: false })
    return true
  }

  function updateText(text) {
    if (!loadedDocument) return
    loadedDocument = { ...loadedDocument, text: String(text ?? '') }
  }

  async function setViewMode(viewMode) {
    if (destroyed || loadController || !currentDocument || !loadedDocument) return false
    const nextMode = String(viewMode || '')
    const supportedModes = getDocumentCapabilities(currentDocument.fileTypeId)?.viewModes || []
    if (!supportedModes.includes(nextMode)) return false
    if (currentDocument.viewMode === nextMode) return true

    const nextDocument = createDocumentIdentity(currentDocument.href, {
      fileTypeId: currentDocument.fileTypeId,
      displayName: currentDocument.displayName,
      sourceKind: currentDocument.sourceKind,
      viewMode: nextMode
    })
    if (!nextDocument) return false

    currentDocument = nextDocument
    loadedDocument = { ...loadedDocument, document: nextDocument }
    onCurrentDocumentChange?.(nextDocument)
    publish()
    await render?.({ preserveScroll: false, honorHash: false })
    return !destroyed && currentDocument === nextDocument
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    ++navigationToken
    loadController?.abort()
    loadController = null
    onDocumentSwitchStart?.()
    cleanupLoadedDocument(loadedDocument)
    loadedDocument = null
    currentDocument = null
  }

  return {
    openDocument,
    showPlaceholder,
    updateText,
    setViewMode,
    getCurrentDocument: () => currentDocument,
    getLoadedDocument: () => loadedDocument,
    getUiState: () => createDocumentUiState(currentDocument),
    destroy
  }
}
