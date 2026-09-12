import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEditorSessionController } from '../editorSessionController.js'

afterEach(() => vi.unstubAllGlobals())

function createController() {
  let markdown = '# Original'
  const reactHandle = {
    setDirty: vi.fn(),
    setSaveStatus: vi.fn(),
    updateMarkdown: vi.fn()
  }
  const controller = createEditorSessionController({
    isDestroyed: () => false,
    getMarkdown: () => markdown,
    setMarkdown: (next) => { markdown = next },
    getLastSuccessfulRenderMarkdown: () => '# Original',
    render: vi.fn().mockResolvedValue(null),
    getReactHandle: () => reactHandle,
    getCurrentFileUrl: () => 'file:///docs/index.md',
    showToast: vi.fn(),
    applyReaderStyles: vi.fn(),
    getArticleEl: () => null,
    getSettings: () => ({}),
    canEditCurrentDocument: () => true
  })
  return { controller, reactHandle, getMarkdown: () => markdown }
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
