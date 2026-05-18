import { logger } from '../../shared/logger.js'
import { FileMismatchError, getSuggestedFilenameFromUrl, saveFile } from '../editor/file-io.js'
import { applyEditModeOverrides as applyEditorStyles } from './viewerStyles.js'

const EDITOR_RENDER_DEBOUNCE_MS = 300

/**
 * @param {object} options
 * @param {() => boolean} options.isDestroyed
 * @param {() => string} options.getMarkdown
 * @param {(markdown: string) => void} options.setMarkdown
 * @param {() => string} options.getLastSuccessfulRenderMarkdown
 * @param {(opts?: object) => Promise<unknown>} options.render
 * @param {() => object | null} options.getReactHandle
 * @param {() => string} options.getCurrentFileUrl
 * @param {(message: string) => void} options.showToast
 * @param {() => void} options.applyReaderStyles
 * @param {() => (HTMLElement | null)} options.getArticleEl
 * @param {() => object} options.getSettings
 */
export function createEditorSessionController({
  isDestroyed,
  getMarkdown,
  setMarkdown,
  getLastSuccessfulRenderMarkdown,
  render,
  getReactHandle,
  getCurrentFileUrl,
  showToast,
  applyReaderStyles,
  getArticleEl,
  getSettings
}) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let editorDebounceTimer = null
  let editModeActive = false
  let editorDirty = false
  let saveInFlight = false
  /** @type {'saved' | 'modified' | 'saving'} */
  let saveStatus = 'saved'

  function syncSaveStatus() {
    /** @type {'saved' | 'modified' | 'saving'} */
    const next = saveInFlight ? 'saving' : editorDirty ? 'modified' : 'saved'
    if (saveStatus === next) return
    saveStatus = next
    getReactHandle()?.setSaveStatus?.(next)
  }

  function setDirty(dirty) {
    const next = Boolean(dirty)
    if (editorDirty === next) return
    editorDirty = next
    getReactHandle()?.setDirty?.(next)
    syncSaveStatus()
  }

  function clearDebounce() {
    if (!editorDebounceTimer) return
    clearTimeout(editorDebounceTimer)
    editorDebounceTimer = null
  }

  function setExternalMarkdown(markdown) {
    const nextMarkdown = typeof markdown === 'string' ? markdown : ''
    clearDebounce()
    setMarkdown(nextMarkdown)
    getReactHandle()?.updateMarkdown(nextMarkdown)
  }

  function handleEditorChange(nextMarkdown) {
    if (isDestroyed()) return
    setMarkdown(typeof nextMarkdown === 'string' ? nextMarkdown : '')
    setDirty(true)
    clearDebounce()
    editorDebounceTimer = setTimeout(() => {
      editorDebounceTimer = null
      if (isDestroyed()) return
      if (getMarkdown() === getLastSuccessfulRenderMarkdown()) {
        return
      }
      void render({ preserveScroll: true, honorHash: false })
    }, EDITOR_RENDER_DEBOUNCE_MS)
  }

  function applyEditModeOverrides() {
    applyEditorStyles(getArticleEl(), getSettings())
  }

  /**
   * @param {boolean} enabled
   */
  function setEditModeActive(enabled) {
    editModeActive = Boolean(enabled)
    if (editModeActive) {
      applyEditModeOverrides()
      return
    }
    setDirty(false)
    applyReaderStyles()
  }

  async function handleSave() {
    if (isDestroyed() || saveInFlight) return
    if (!editModeActive) return

    saveInFlight = true
    syncSaveStatus()
    try {
      const content = getMarkdown()
      const fileUrl = getCurrentFileUrl() || window.location.href
      const suggestedName = getSuggestedFilenameFromUrl(fileUrl)
      const result = await saveFile(content, { fileUrl, suggestedName })

      if (result === 'cancelled') {
        return
      }

      setDirty(false)
      if (result === 'fsa') {
        showToast('Saved')
      } else {
        showToast('Downloaded copy (save to original file via picker next time)')
      }
    } catch (error) {
      if (error instanceof FileMismatchError) {
        showToast(error.message)
        return
      }
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Failed to save markdown file.', error)
      showToast(message ? `Save failed: ${message}` : 'Save failed.')
    } finally {
      saveInFlight = false
      syncSaveStatus()
    }
  }

  function destroy() {
    clearDebounce()
  }

  return {
    setExternalMarkdown,
    handleEditorChange,
    setEditModeActive,
    handleSave,
    destroy,
    isDirty: () => editorDirty,
    isEditModeActive: () => editModeActive
  }
}
