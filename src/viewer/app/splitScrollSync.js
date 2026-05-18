import {
  cancelSmoothScroll,
  computePreviewScrollTarget,
  smoothScrollPreviewTo
} from '../editor/scroll-sync.js'

/** Time after the last user gesture on the preview before editor→preview sync runs again. */
const PREVIEW_USER_SCROLL_END_MS = 2000

/**
 * @param {object} options
 * @param {() => boolean} options.isDestroyed
 * @param {() => (HTMLElement | null)} options.getArticleEl
 */
export function createSplitScrollSync({ isDestroyed, getArticleEl }) {
  /** @type {number | null} */
  let editorScrollRaf = null
  /** @type {null | { topLine0Float: number, scrollFraction: number }} */
  let editorScrollPayload = null
  let previewUserScrolling = false
  /** @type {ReturnType<typeof setTimeout> | null} */
  let previewUserScrollEndTimer = null
  /** @type {HTMLElement | null} */
  let splitScrollContentPane = null
  /** @type {HTMLElement | null} */
  let splitScrollEditorScrollEl = null

  const onPreviewUserIntent = () => {
    if (isDestroyed()) return
    const contentPane = getArticleEl()?.closest?.('.mdp-content-pane')
    if (contentPane) {
      cancelSmoothScroll(contentPane)
    }
    if (editorScrollRaf != null) {
      cancelAnimationFrame(editorScrollRaf)
      editorScrollRaf = null
    }
    editorScrollPayload = null
    previewUserScrolling = true
    if (previewUserScrollEndTimer) {
      clearTimeout(previewUserScrollEndTimer)
    }
    previewUserScrollEndTimer = setTimeout(() => {
      previewUserScrollEndTimer = null
      previewUserScrolling = false
    }, PREVIEW_USER_SCROLL_END_MS)
  }

  const onEditorUserIntent = () => {
    if (isDestroyed()) return
    if (previewUserScrollEndTimer) {
      clearTimeout(previewUserScrollEndTimer)
      previewUserScrollEndTimer = null
    }
    previewUserScrolling = false
  }

  /**
   * @param {{ scrollToLine: (line1Based: number) => void, scrollDOM: HTMLElement }} api
   */
  function bind(api) {
    unbind()
    const contentPane = getArticleEl()?.closest?.('.mdp-content-pane')
    const scrollDom = api?.scrollDOM
    if (!(contentPane instanceof HTMLElement)) return
    splitScrollContentPane = contentPane
    contentPane.addEventListener('wheel', onPreviewUserIntent, { passive: true })
    contentPane.addEventListener('touchstart', onPreviewUserIntent, { passive: true })
    if (scrollDom instanceof HTMLElement) {
      splitScrollEditorScrollEl = scrollDom
      scrollDom.addEventListener('wheel', onEditorUserIntent, { passive: true })
      scrollDom.addEventListener('touchstart', onEditorUserIntent, { passive: true })
    }
  }

  function unbind() {
    if (previewUserScrollEndTimer) {
      clearTimeout(previewUserScrollEndTimer)
      previewUserScrollEndTimer = null
    }
    previewUserScrolling = false
    if (splitScrollContentPane) {
      splitScrollContentPane.removeEventListener('wheel', onPreviewUserIntent, { passive: true })
      splitScrollContentPane.removeEventListener('touchstart', onPreviewUserIntent, { passive: true })
      splitScrollContentPane = null
    }
    if (splitScrollEditorScrollEl) {
      splitScrollEditorScrollEl.removeEventListener('wheel', onEditorUserIntent, { passive: true })
      splitScrollEditorScrollEl.removeEventListener('touchstart', onEditorUserIntent, { passive: true })
      splitScrollEditorScrollEl = null
    }
  }

  /**
   * @param {{ topLine0Float?: number, scrollFraction?: number }} [payload]
   */
  function handleEditorScroll(payload) {
    if (isDestroyed() || !payload) return
    if (previewUserScrolling) return
    editorScrollPayload = {
      topLine0Float: Number.isFinite(payload.topLine0Float) ? /** @type {number} */ (payload.topLine0Float) : 0,
      scrollFraction: Math.min(1, Math.max(0, Number(payload.scrollFraction) || 0))
    }
    if (editorScrollRaf != null) return
    editorScrollRaf = requestAnimationFrame(() => {
      editorScrollRaf = null
      if (isDestroyed()) return
      if (previewUserScrolling) return
      const p = editorScrollPayload
      editorScrollPayload = null
      if (!p) return
      const contentPane = getArticleEl()?.closest?.('.mdp-content-pane')
      if (!contentPane) return
      const target = computePreviewScrollTarget(p.topLine0Float, contentPane, p.scrollFraction)
      smoothScrollPreviewTo(contentPane, target)
    })
  }

  function destroy() {
    unbind()
    if (editorScrollRaf != null) {
      cancelAnimationFrame(editorScrollRaf)
      editorScrollRaf = null
    }
    editorScrollPayload = null
  }

  return {
    bind,
    unbind,
    handleEditorScroll,
    destroy
  }
}
