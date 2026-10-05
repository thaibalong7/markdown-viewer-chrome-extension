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

  it('opens and renders an empty linked Markdown document', async () => {
    const render = vi.fn().mockResolvedValue(null)
    const onDocumentLoaded = vi.fn()
    const showToast = vi.fn()
    const session = createSession({
      loadDocument: vi.fn().mockResolvedValue({
        text: '',
        assetUrl: null,
        revokeAssetUrl: null
      }),
      render,
      onDocumentLoaded,
      showToast
    })

    await expect(session.openDocument('file:///docs/empty.md')).resolves.toBe(true)

    expect(session.getCurrentDocument()).toMatchObject({
      href: 'file:///docs/empty.md',
      fileTypeId: 'markdown'
    })
    expect(session.getLoadedDocument().text).toBe('')
    expect(onDocumentLoaded).toHaveBeenCalledOnce()
    expect(render).toHaveBeenCalledWith({ preserveScroll: false, honorHash: false })
    expect(showToast).not.toHaveBeenCalled()
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

  it('passes the latest configured standalone text limit through the session boundary', async () => {
    const settings = { documents: { maxStandaloneTextFileSizeMiB: 8 } }
    const loadDocument = vi.fn().mockResolvedValue({
      text: 'loaded',
      assetUrl: null,
      revokeAssetUrl: null
    })
    const session = createSession({
      getSettings: () => settings,
      loadDocument
    })

    await session.openDocument('file:///docs/first.txt')
    settings.documents.maxStandaloneTextFileSizeMiB = 14
    await session.openDocument('file:///docs/second.sql')

    expect(loadDocument.mock.calls[0][0]).toMatchObject({
      fileType: { id: 'text' },
      maxStandaloneTextFileSizeMiB: 8
    })
    expect(loadDocument.mock.calls[1][0]).toMatchObject({
      fileType: { id: 'sql' },
      maxStandaloneTextFileSizeMiB: 14
    })
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


describe('document watch revisions', () => {
  it('keeps only the previous accepted revision and resets review history on Save and navigation', async () => {
    const session = createSession({ loadDocument: vi.fn().mockResolvedValue({ text: '# Other' }) })
    session.updateText('# Draft')
    await session.applyCurrentRevision(session.getWatchTarget(), '# First')
    expect(session.getPreviousRevision()).toEqual({ source: '# Index', id: 0 })
    expect(session.getWatchTarget().sourceRevision).toBe(1)
    await session.applyCurrentRevision(session.getWatchTarget(), '# Second')
    expect(session.getPreviousRevision()).toEqual({ source: '# First', id: 1 })
    session.acceptSavedSource('# Saved', session.getCurrentDocument())
    expect(session.getPreviousRevision()).toBeNull()
    await session.applyCurrentRevision(session.getWatchTarget(), '# External')
    await session.openDocument('file:///docs/other.md')
    expect(session.getPreviousRevision()).toBeNull()
    session.destroy()
    expect(session.getPreviousRevision()).toBeNull()
  })
  it('keeps the disk baseline separate from the editor draft', async () => {
    const render = vi.fn()
    const onRevisionApplied = vi.fn()
    const session = createSession({ render, onRevisionApplied })
    session.updateText('# Draft')
    const target = session.getWatchTarget()
    expect(target.acceptedSource).toBe('# Index')
    await expect(session.applyCurrentRevision(target, '# New disk')).resolves.toBe(true)
    expect(onRevisionApplied).toHaveBeenCalledWith(expect.objectContaining({ text: '# New disk' }))
    expect(render).toHaveBeenCalledWith({ preserveScroll: true, honorHash: false })
    expect(session.getWatchTarget().acceptedSource).toBe('# New disk')
    session.destroy()
  })

  it('retains the workspace handle for fresh reads and flags snapshot-only files', async () => {
    const handle = { getFile: vi.fn() }
    const loadDocument = vi.fn().mockResolvedValue({ text: '# Loaded' })
    const session = createSession({ loadDocument })
    await session.openDocument('mdp-ws-file:' + encodeURIComponent('Docs/readme.md'), { workspaceReader: handle })
    const target = session.getWatchTarget()
    expect(target.supported).toBe(true)
    await session.readCurrentRevision(target, new AbortController().signal)
    expect(loadDocument).toHaveBeenLastCalledWith(expect.objectContaining({ workspaceReader: handle, maxWatchBytes: 5 * 1024 * 1024 }))
    await session.openDocument('mdp-ws-file:' + encodeURIComponent('Docs/readme.md'), { workspaceReader: { text: vi.fn() } })
    expect(session.getWatchTarget().supported).toBe(false)
    session.destroy()
  })

  it('rejects a revision after navigating away and back to the same URL', async () => {
    const session = createSession({ loadDocument: vi.fn().mockResolvedValue({ text: '# Reopened' }) })
    const old = session.getWatchTarget()
    await session.openDocument('file:///docs/other.md')
    await session.openDocument('file:///docs/index.md')
    await expect(session.applyCurrentRevision(old, '# Stale')).resolves.toBe(false)
    expect(session.getLoadedDocument().text).toBe('# Reopened')
    session.destroy()
  })

  it('invalidates disk reads after an internal save without replacing the draft', () => {
    const session = createSession()
    const old = session.getWatchTarget()
    session.updateText('# More typing')
    session.acceptSavedSource('# Saved', session.getCurrentDocument())
    expect(session.matchesWatchTarget(old)).toBe(false)
    expect(session.getWatchTarget().acceptedSource).toBe('# Saved')
    expect(session.getLoadedDocument().text).toBe('# More typing')
    session.destroy()
  })

  it('invalidates old readers on workspace replacement and resumes with the new handle', async () => {
    const loadDocument = vi.fn().mockResolvedValue({ text: '# Loaded' })
    const session = createSession({ loadDocument })
    const href = 'mdp-ws-file:' + encodeURIComponent('Docs/readme.md')
    await session.openDocument(href, { workspaceReader: { getFile: vi.fn() } })
    const old = session.getWatchTarget()
    session.updateWorkspaceReader(null)
    expect(session.matchesWatchTarget(old)).toBe(false)
    expect(session.getWatchTarget().supported).toBe(false)
    const newHandle = { getFile: vi.fn() }
    session.updateWorkspaceReader(new Map([[href, newHandle]]))
    await session.readCurrentRevision(session.getWatchTarget(), new AbortController().signal)
    expect(loadDocument).toHaveBeenLastCalledWith(expect.objectContaining({ workspaceReader: newHandle }))
    session.destroy()
  })
})
