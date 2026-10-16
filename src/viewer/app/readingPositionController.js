import { normalizeFileUrlForCompare } from '../explorer/url-utils.js'
import { readReadingPosition } from '../navigation/reading-position.js'
import { createReadingPositionStore } from '../navigation/reading-position-store.js'
import { cancelViewerAnchorLock } from '../scroll-utils.js'

/** One active reading session per Viewer. Only real-file bookmarks survive reload. */
export function createReadingPositionController({
  entryFileUrl,
  workspaceRoot = null,
  getCurrentDocument,
  getScrollRoot,
  getArticleEl,
  restorePosition,
  cancelRestoration,
  onScopeChange,
  getStorage = () => globalThis.sessionStorage,
  eventTarget = globalThis.window
}) {
  const store = createReadingPositionStore({ entryFileUrl, workspaceRoot, getStorage })
  let renderedDocument = null
  let captureSuspended = false
  let destroyed = false

  function getRenderedHref() {
    if (destroyed || captureSuspended || !renderedDocument || getCurrentDocument() !== renderedDocument) return null
    return normalizeFileUrlForCompare(renderedDocument.href)
  }

  function saveCurrent() {
    const href = getRenderedHref()
    if (href) store.save(href, readReadingPosition(getScrollRoot(), getArticleEl()))
  }

  function cancel() {
    cancelRestoration?.()
    cancelViewerAnchorLock(getScrollRoot())
  }

  function changeScope(change) {
    if (destroyed || !change()) return
    cancel()
    captureSuspended = true
    onScopeChange?.()
  }

  function documentRendered(loaded) {
    if (destroyed) return
    renderedDocument = !loaded?.loadError && !loaded?.placeholderMessage && loaded?.document?.href
      ? loaded.document : null
    captureSuspended = false
  }

  function resume() {
    // A workspace scan can retain the already rendered document without rendering again.
    if (!destroyed) captureSuspended = false
  }

  function restore(href) {
    const key = normalizeFileUrlForCompare(href)
    if (key !== getRenderedHref()) return false
    const position = store.get(key)
    if (!position) return false
    cancel()
    return restorePosition(position)
  }

  function beforeDocumentReplace() {
    saveCurrent()
    cancel()
    captureSuspended = true
  }

  function beforeRender() {
    saveCurrent()
    renderedDocument = null
  }

  const previousScrollRestoration = eventTarget?.history?.scrollRestoration
  if (previousScrollRestoration) eventTarget.history.scrollRestoration = 'manual'
  eventTarget?.addEventListener?.('pagehide', saveCurrent)
  eventTarget?.addEventListener?.('beforeunload', saveCurrent)

  return {
    saveCurrent,
    beforeDocumentReplace,
    beforeRender,
    documentRendered,
    resume,
    restore,
    cancel,
    getReloadHref: store.getReloadHref,
    startWorkspace: (root) => changeScope(() => store.startWorkspace(root)),
    leaveWorkspace: () => changeScope(store.leaveWorkspace),
    destroy() {
      if (destroyed) return
      saveCurrent()
      destroyed = true
      cancel()
      renderedDocument = null
      store.dispose()
      eventTarget?.removeEventListener?.('pagehide', saveCurrent)
      eventTarget?.removeEventListener?.('beforeunload', saveCurrent)
      if (previousScrollRestoration && eventTarget.history.scrollRestoration === 'manual') {
        eventTarget.history.scrollRestoration = previousScrollRestoration
      }
    }
  }
}
