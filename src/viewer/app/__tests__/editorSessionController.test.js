import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEditorSessionController } from '../editorSessionController.js'

const fileIoMocks = vi.hoisted(() => ({
  prepareFileForEditing: vi.fn(),
  primePersistedEditHandle: vi.fn(),
  saveFile: vi.fn()
}))

vi.mock('../../editor/file-io.js', () => fileIoMocks)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function createController() {
  let markdown = '# Original'
  const reactHandle = {
    setDirty: vi.fn(),
    setSaveStatus: vi.fn(),
    updateMarkdown: vi.fn()
  }
  const showToast = vi.fn()
  const controller = createEditorSessionController({
    isDestroyed: () => false,
    getMarkdown: () => markdown,
    setMarkdown: (next) => { markdown = next },
    getLastSuccessfulRenderMarkdown: () => '# Original',
    render: vi.fn().mockResolvedValue(null),
    getReactHandle: () => reactHandle,
    getCurrentFileUrl: () => 'file:///docs/index.md',
    showToast,
    applyReaderStyles: vi.fn(),
    getArticleEl: () => null,
    getSettings: () => ({}),
    canEditCurrentDocument: () => true
  })
  return { controller, reactHandle, showToast, getMarkdown: () => markdown }
}

describe('editor document-switch coordination', () => {
  it('keeps the old document dirty until a confirmed navigation actually loads', () => {
    vi.stubGlobal('window', { confirm: vi.fn().mockReturnValue(true) })
    const { controller } = createController()
    controller.handleEditorChange('# Modified')

    expect(controller.prepareForDocumentSwitch()).toBe(true)
    expect(controller.isDirty()).toBe(true)

    controller.setExternalMarkdown('# Next document')
    expect(controller.isDirty()).toBe(false)
    controller.destroy()
  })

  it('rejects navigation when the user keeps unsaved changes', () => {
    vi.stubGlobal('window', { confirm: vi.fn().mockReturnValue(false) })
    const { controller } = createController()
    controller.handleEditorChange('# Modified')

    expect(controller.prepareForDocumentSwitch()).toBe(false)
    expect(controller.isDirty()).toBe(true)
    controller.destroy()
  })
})

describe('editor file connection and save safety', () => {
  it('connects the original file before allowing edit mode', async () => {
    fileIoMocks.prepareFileForEditing.mockResolvedValue({
      status: 'ready',
      reused: false,
      filename: 'index.md'
    })
    const { controller, showToast } = createController()

    await expect(controller.prepareForEditing()).resolves.toBe(true)
    expect(fileIoMocks.prepareFileForEditing).toHaveBeenCalledWith('# Original', {
      fileUrl: 'file:///docs/index.md'
    })
    expect(showToast).toHaveBeenCalledWith('Connected save target: index.md', {
      variant: 'success'
    })
  })

  it('keeps changes dirty when saving the connected file fails', async () => {
    fileIoMocks.saveFile.mockRejectedValue(new Error('File changed on disk'))
    const { controller, showToast } = createController()
    controller.setEditModeActive(true)
    controller.handleEditorChange('# Modified')

    await controller.handleSave()

    expect(controller.isDirty()).toBe(true)
    expect(showToast).toHaveBeenCalledWith('Save failed: File changed on disk', {
      variant: 'error'
    })
    controller.destroy()
  })

  it('marks the editor clean only after a direct handle save succeeds', async () => {
    fileIoMocks.saveFile.mockResolvedValue('fsa')
    const { controller, showToast } = createController()
    controller.setEditModeActive(true)
    controller.handleEditorChange('# Modified')

    await controller.handleSave()

    expect(controller.isDirty()).toBe(false)
    expect(showToast).toHaveBeenCalledWith('Saved to the connected original file', {
      variant: 'success'
    })
    controller.destroy()
  })

  it('restores the pre-edit content when a dirty session is discarded', () => {
    const { controller, getMarkdown } = createController()
    controller.setEditModeActive(true)
    controller.handleEditorChange('# Modified')

    controller.setEditModeActive(false)

    expect(controller.isDirty()).toBe(false)
    expect(getMarkdown()).toBe('# Original')
    controller.destroy()
  })
})
