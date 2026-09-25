import { logger } from '../../shared/logger.js'
import {
  prepareFileForEditing,
  primePersistedEditHandle,
  saveFile
} from '../editor/file-io.js'
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
 * @param {(message: string, options?: object) => void} options.showToast
 * @param {() => void} options.applyReaderStyles
 * @param {() => (HTMLElement | null)} options.getArticleEl
 * @param {() => object} options.getSettings
 * @param {() => boolean} [options.canEditCurrentDocument]
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
  getSettings,
  canEditCurrentDocument = () => true
}) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let editorDebounceTimer = null
  let editModeActive = false
  let editorDirty = false
  let saveInFlight = false
  let editBaselineMarkdown = getMarkdown()
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
    editBaselineMarkdown = nextMarkdown
    getReactHandle()?.updateMarkdown(nextMarkdown)
    setDirty(false)
  }

  function prepareForDocumentSwitch() {
    if (!editorDirty) {
      clearDebounce()
      return true
    }
    const discard = window.confirm('You have unsaved changes. Open another document and discard them?')
    if (!discard) return false
    clearDebounce()
    return true
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

  async function prepareForEditing() {
    if (isDestroyed() || !canEditCurrentDocument()) return false
    try {
      const fileUrl = getCurrentFileUrl() || window.location.href
      const result = await prepareFileForEditing(getMarkdown(), { fileUrl })
      if (result.status === 'cancelled') return false
      editBaselineMarkdown = getMarkdown()
      showToast(
        result.reused
          ? `Verified save target: ${result.filename}`
          : `Connected save target: ${result.filename}`,
        { variant: 'success' }
      )
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn('Could not connect the original markdown file for editing.', {
        message
      })
      showToast(message || 'Could not connect the original file.', { variant: 'error' })
      return false
    }
  }

  async function primeFileConnection() {
    if (isDestroyed()) return
    const fileUrl = getCurrentFileUrl() || window.location.href
    await primePersistedEditHandle(fileUrl)
  }

  /**
   * @param {boolean} enabled
   */
  function setEditModeActive(enabled) {
    const nextActive = Boolean(enabled) && canEditCurrentDocument()
    const discardingChanges = editModeActive && !nextActive && editorDirty
    editModeActive = nextActive
    if (editModeActive) {
      applyEditModeOverrides()
      return
    }
    if (discardingChanges) {
      clearDebounce()
      setMarkdown(editBaselineMarkdown)
      getReactHandle()?.updateMarkdown(editBaselineMarkdown)
      void render({ preserveScroll: true, honorHash: false })
    }
    setDirty(false)
    applyReaderStyles()
  }

  async function handleSave() {
    if (isDestroyed() || saveInFlight) return
    if (!editModeActive || !canEditCurrentDocument()) return

    saveInFlight = true
    syncSaveStatus()
    try {
      const content = getMarkdown()
      const fileUrl = getCurrentFileUrl() || window.location.href
      await saveFile(content, { fileUrl })

      editBaselineMarkdown = content
      setDirty(false)
      showToast('Saved to the connected original file', { variant: 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Failed to save markdown file.', error)
      showToast(message ? `Save failed: ${message}` : 'Save failed.', { variant: 'error' })
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
    prepareForDocumentSwitch,
    handleEditorChange,
    primeFileConnection,
    prepareForEditing,
    setEditModeActive,
    handleSave,
    destroy,
    isDirty: () => editorDirty,
    isEditModeActive: () => editModeActive
  }
}
