import { describe, expect, it, vi } from 'vitest'
import { createDocumentIdentity } from '../../documents/document-model.js'
import { createDocumentSessionController } from '../documentSessionController.js'

function deferred() {
  let resolve
  const promise = new Promise((next) => { resolve = next })
  return { promise, resolve }
}

function createSession(options = {}) {
  return createDocumentSessionController({
    initialDocument: createDocumentIdentity('file:///docs/index.md'),
    initialText: '# Index',
    render: vi.fn().mockResolvedValue(null),
    beforeDocumentSwitch: vi.fn().mockReturnValue(true),
    onDocumentLoaded: vi.fn(),
    onCurrentDocumentChange: vi.fn(),
    publishUiState: vi.fn(),
    showToast: vi.fn(),
    ...options
  })
}

describe('document session controller', () => {
  it('keeps the latest navigation when an older load finishes last', async () => {
    const first = deferred()
    const second = deferred()
    const staleCleanup = vi.fn()
    const onDocumentLoaded = vi.fn()
    const render = vi.fn().mockResolvedValue(null)
    const session = createSession({
      loadDocument: ({ href }) => href.endsWith('first.md') ? first.promise : second.promise,
      onDocumentLoaded,
      render
    })

    const firstOpen = session.openDocument('file:///docs/first.md')
    const secondOpen = session.openDocument('file:///docs/second.md')
    second.resolve({ text: '# Second', revokeAssetUrl: null })
    await expect(secondOpen).resolves.toBe(true)
    first.resolve({ text: '# First', revokeAssetUrl: staleCleanup })
    await expect(firstOpen).resolves.toBe(false)

    expect(session.getCurrentDocument().href).toBe('file:///docs/second.md')
    expect(session.getLoadedDocument().text).toBe('# Second')
    expect(onDocumentLoaded).toHaveBeenCalledOnce()
    expect(render).toHaveBeenCalledOnce()
    expect(staleCleanup).toHaveBeenCalledOnce()
  })

  it('does not load a new document when dirty-state resolution rejects the switch', async () => {
    const loadDocument = vi.fn()
    const session = createSession({
      beforeDocumentSwitch: vi.fn().mockReturnValue(false),
      loadDocument
    })

    await expect(session.openDocument('file:///docs/next.md')).resolves.toBe(false)
    expect(loadDocument).not.toHaveBeenCalled()
    expect(session.getCurrentDocument().href).toBe('file:///docs/index.md')
  })

  it('releases replaced and active document resources exactly once', async () => {
    const firstCleanup = vi.fn()
    const secondCleanup = vi.fn()
    const loadDocument = vi.fn()
      .mockResolvedValueOnce({ text: '# First', revokeAssetUrl: firstCleanup })
      .mockResolvedValueOnce({ text: '# Second', revokeAssetUrl: secondCleanup })
    const session = createSession({ loadDocument })

    await session.openDocument('file:///docs/first.md')
    await session.openDocument('file:///docs/second.md')
    session.destroy()
    session.destroy()

    expect(firstCleanup).toHaveBeenCalledOnce()
    expect(secondCleanup).toHaveBeenCalledOnce()
  })

  it('publishes registry capabilities for the current document', () => {
    const session = createSession()
    expect(session.getUiState()).toMatchObject({
      fileTypeId: 'markdown',
      sourceKind: 'file-url',
      capabilities: { outline: true, edit: true, exportDocument: true, print: true }
    })
  })

  it('publishes text capabilities while loading and renders a safe text error state', async () => {
    const publishUiState = vi.fn()
    const onDocumentLoaded = vi.fn()
    const onCurrentDocumentChange = vi.fn()
    const render = vi.fn().mockResolvedValue(null)
    const error = Object.assign(new Error('This text file is larger than the 5 MiB viewing limit.'), {
      code: 'document-too-large',
      userMessage: 'This text file is larger than the 5 MiB viewing limit.'
    })
    const session = createSession({
      loadDocument: vi.fn().mockRejectedValue(error),
      publishUiState,
      onDocumentLoaded,
      onCurrentDocumentChange,
      render
    })

    await expect(session.openDocument('file:///docs/large.txt')).resolves.toBe(true)

    expect(publishUiState.mock.calls[0][0]).toMatchObject({
      fileTypeId: 'text',
      loading: true,
      capabilities: { outline: false, edit: false, exportDocument: false, print: true }
    })
    expect(session.getLoadedDocument()).toMatchObject({
      document: { fileTypeId: 'text' },
      loadError: { code: 'document-too-large' }
    })
    expect(onDocumentLoaded).toHaveBeenCalledOnce()
    expect(onCurrentDocumentChange).toHaveBeenCalledOnce()
    expect(render).toHaveBeenCalledOnce()
  })

  it('publishes image capabilities and closes active image UI before loading the next document', async () => {
    const publishUiState = vi.fn()
    const onDocumentSwitchStart = vi.fn()
    const session = createSession({
      publishUiState,
      onDocumentSwitchStart,
      loadDocument: vi.fn().mockResolvedValue({
        text: null,
        assetUrl: 'file:///docs/photo.png',
        revokeAssetUrl: null
      })
    })

    await expect(session.openDocument('file:///docs/photo.png')).resolves.toBe(true)
    expect(onDocumentSwitchStart).toHaveBeenCalledOnce()
    expect(publishUiState.mock.calls[0][0]).toMatchObject({
      fileTypeId: 'raster-image',
      loading: true,
      capabilities: { outline: false, edit: false, exportDocument: false, print: true, zoom: true }
    })
    expect(session.getLoadedDocument()).toMatchObject({
      document: { fileTypeId: 'raster-image' },
      assetUrl: 'file:///docs/photo.png'
    })
    session.destroy()
    expect(onDocumentSwitchStart).toHaveBeenCalledTimes(2)
  })

  it('renders a safe image load-error document instead of retaining stale content', async () => {
    const render = vi.fn().mockResolvedValue(null)
    const session = createSession({
      render,
      loadDocument: vi.fn().mockRejectedValue(new Error('Unsupported image MIME'))
    })

    await expect(session.openDocument('file:///docs/photo.png')).resolves.toBe(true)
    expect(session.getLoadedDocument()).toMatchObject({
      document: { fileTypeId: 'raster-image' },
      loadError: { code: 'document-load-failed', message: 'Could not open this image.' }
    })
    expect(render).toHaveBeenCalledOnce()
  })

  it('changes Mermaid view mode without reloading or losing source', async () => {
    const render = vi.fn().mockResolvedValue(null)
    const loadDocument = vi.fn().mockResolvedValue({
      text: 'flowchart LR\nA-->B',
      assetUrl: null,
      revokeAssetUrl: null
    })
    const onCurrentDocumentChange = vi.fn()
    const session = createSession({ loadDocument, render, onCurrentDocumentChange })

    await session.openDocument('file:///docs/chart.mermaid')
    render.mockClear()
    onCurrentDocumentChange.mockClear()

    await expect(session.setViewMode('raw')).resolves.toBe(true)
    expect(session.getCurrentDocument()).toMatchObject({ fileTypeId: 'mermaid', viewMode: 'raw' })
    expect(session.getLoadedDocument()).toMatchObject({
      document: { viewMode: 'raw' },
      text: 'flowchart LR\nA-->B'
    })
    expect(loadDocument).toHaveBeenCalledOnce()
    expect(render).toHaveBeenCalledWith({ preserveScroll: false, honorHash: false })
    expect(onCurrentDocumentChange).toHaveBeenCalledWith(expect.objectContaining({ viewMode: 'raw' }))

    await expect(session.setViewMode('unsupported')).resolves.toBe(false)
    expect(session.getCurrentDocument().viewMode).toBe('raw')
  })
})
