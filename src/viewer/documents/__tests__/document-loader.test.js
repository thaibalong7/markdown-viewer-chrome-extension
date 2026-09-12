import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ sendMessage: vi.fn() }))
vi.mock('../../../messaging/index.js', () => ({
  MESSAGE_TYPES: { FETCH_FILE_AS_TEXT: 'FETCH_FILE_AS_TEXT' },
  sendMessage: mocks.sendMessage
}))

import { loadDocument, MAX_PLAIN_TEXT_BYTES } from '../document-loader.js'

const MARKDOWN_TYPE = { id: 'markdown', contentKind: 'text' }
const TEXT_TYPE = { id: 'text', contentKind: 'text' }
const MERMAID_TYPE = { id: 'mermaid', contentKind: 'text' }
const IMAGE_TYPE = {
  id: 'raster-image',
  contentKind: 'image',
  mimeTypes: ['image/png', 'image/jpeg']
}
const SVG_TYPE = {
  id: 'svg-image',
  contentKind: 'image',
  mimeTypes: ['image/svg+xml']
}

beforeEach(() => vi.clearAllMocks())

describe('document loader', () => {
  it('loads a real text document through the background route', async () => {
    mocks.sendMessage.mockResolvedValue({ ok: true, data: { text: '# Loaded' } })

    await expect(loadDocument({
      href: 'file:///docs/README.md',
      fileType: MARKDOWN_TYPE,
      signal: new AbortController().signal
    })).resolves.toMatchObject({ text: '# Loaded', assetUrl: null })

    expect(mocks.sendMessage).toHaveBeenCalledWith({
      type: 'FETCH_FILE_AS_TEXT',
      payload: { url: 'file:///docs/README.md' }
    })
  })

  it('loads virtual File-like and handle-backed text sources', async () => {
    const direct = { text: vi.fn().mockResolvedValue('# Direct') }
    const handle = {
      getFile: vi.fn().mockResolvedValue({ text: vi.fn().mockResolvedValue('# Handle') })
    }

    await expect(loadDocument({ fileType: MARKDOWN_TYPE, workspaceReader: direct })).resolves.toMatchObject({
      text: '# Direct'
    })
    await expect(loadDocument({ fileType: MARKDOWN_TYPE, workspaceReader: handle })).resolves.toMatchObject({
      text: '# Handle'
    })
  })

  it('rejects an aborted load even when the background response arrives', async () => {
    const controller = new AbortController()
    mocks.sendMessage.mockImplementation(async () => {
      controller.abort()
      return { ok: true, data: { text: '# Stale' } }
    })

    await expect(loadDocument({
      href: 'file:///docs/stale.md',
      fileType: MARKDOWN_TYPE,
      signal: controller.signal
    })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('surfaces background read failures without exposing file content', async () => {
    mocks.sendMessage.mockResolvedValue({ ok: false, error: 'Permission denied' })

    await expect(loadDocument({
      href: 'file:///docs/private.md',
      fileType: MARKDOWN_TYPE
    })).rejects.toThrow('Permission denied')
  })

  it('keeps empty and Unicode plain text intact', async () => {
    const unicode = 'Xin chào 👋\n\t  preserved  '
    mocks.sendMessage
      .mockResolvedValueOnce({ ok: true, data: { text: '' } })
      .mockResolvedValueOnce({ ok: true, data: { text: unicode } })

    await expect(loadDocument({
      href: 'file:///docs/empty.txt',
      fileType: TEXT_TYPE
    })).resolves.toMatchObject({ text: '' })
    await expect(loadDocument({
      href: 'file:///docs/unicode.txt',
      fileType: TEXT_TYPE
    })).resolves.toMatchObject({ text: unicode })
  })

  it('rejects oversized plain text before reading a sized workspace file', async () => {
    const reader = {
      size: MAX_PLAIN_TEXT_BYTES + 1,
      text: vi.fn().mockResolvedValue('should not be read')
    }

    await expect(loadDocument({ fileType: TEXT_TYPE, workspaceReader: reader })).rejects.toMatchObject({
      name: 'DocumentTooLargeError',
      code: 'document-too-large'
    })
    expect(reader.text).not.toHaveBeenCalled()
  })

  it('enforces the plain-text UTF-8 limit without changing Markdown loading', async () => {
    const largeText = 'a'.repeat(MAX_PLAIN_TEXT_BYTES + 1)
    mocks.sendMessage.mockResolvedValue({ ok: true, data: { text: largeText } })

    await expect(loadDocument({
      href: 'file:///docs/large.txt',
      fileType: TEXT_TYPE
    })).rejects.toMatchObject({ code: 'document-too-large' })

    await expect(loadDocument({
      href: 'file:///docs/large.md',
      fileType: MARKDOWN_TYPE
    })).resolves.toMatchObject({ text: largeText })
  })

  it('loads standalone Mermaid as text and enforces the standalone file limit', async () => {
    mocks.sendMessage
      .mockResolvedValueOnce({ ok: true, data: { text: 'flowchart LR\nA-->B' } })
      .mockResolvedValueOnce({ ok: true, data: { text: 'a'.repeat(MAX_PLAIN_TEXT_BYTES + 1) } })

    await expect(loadDocument({
      href: 'file:///docs/chart.mermaid',
      fileType: MERMAID_TYPE
    })).resolves.toMatchObject({ text: 'flowchart LR\nA-->B', assetUrl: null })
    await expect(loadDocument({
      href: 'file:///docs/large.mermaid',
      fileType: MERMAID_TYPE
    })).rejects.toMatchObject({ code: 'document-too-large' })
  })

  it('uses a normalized local URL without reading real image bytes', async () => {
    await expect(loadDocument({
      href: 'file:///docs/My%20Photo.PNG?ignored=1#ignored',
      fileType: IMAGE_TYPE
    })).resolves.toEqual({
      text: null,
      assetUrl: 'file:///docs/My%20Photo.PNG',
      revokeAssetUrl: null
    })
    expect(mocks.sendMessage).not.toHaveBeenCalled()
  })

  it('creates and idempotently revokes an object URL for virtual images', async () => {
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn().mockReturnValue('blob:virtual-photo')
    URL.revokeObjectURL = vi.fn()
    try {
      const file = { name: 'photo.png', type: 'image/png' }
      const loaded = await loadDocument({ fileType: IMAGE_TYPE, workspaceReader: file })
      expect(loaded).toMatchObject({ text: null, assetUrl: 'blob:virtual-photo' })
      expect(URL.createObjectURL).toHaveBeenCalledWith(file)

      loaded.revokeAssetUrl()
      loaded.revokeAssetUrl()
      expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:virtual-photo')
    } finally {
      if (originalCreate) URL.createObjectURL = originalCreate
      else delete URL.createObjectURL
      if (originalRevoke) URL.revokeObjectURL = originalRevoke
      else delete URL.revokeObjectURL
    }
  })

  it('validates virtual image extension and MIME before creating an object URL', async () => {
    const originalCreate = URL.createObjectURL
    URL.createObjectURL = vi.fn()
    try {
      await expect(loadDocument({
        fileType: IMAGE_TYPE,
        workspaceReader: { name: 'photo.svg', type: 'image/svg+xml' }
      })).rejects.toThrow('not a registered image format')
      await expect(loadDocument({
        fileType: IMAGE_TYPE,
        workspaceReader: { name: 'photo.png', type: 'application/octet-stream' }
      })).rejects.toThrow('unsupported image type')
      expect(URL.createObjectURL).not.toHaveBeenCalled()
    } finally {
      if (originalCreate) URL.createObjectURL = originalCreate
      else delete URL.createObjectURL
    }
  })

  it('loads real and virtual SVGs only as image resource URLs', async () => {
    await expect(loadDocument({
      href: 'file:///docs/Diagram.SVG?raw=1#source',
      fileType: SVG_TYPE
    })).resolves.toEqual({
      text: null,
      assetUrl: 'file:///docs/Diagram.SVG',
      revokeAssetUrl: null
    })

    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn().mockReturnValue('blob:virtual-svg')
    URL.revokeObjectURL = vi.fn()
    try {
      const file = {
        name: 'diagram.svg',
        type: 'image/svg+xml',
        text: vi.fn().mockResolvedValue('<svg onload="alert(1)"><script>alert(1)</script></svg>')
      }
      const loaded = await loadDocument({ fileType: SVG_TYPE, workspaceReader: file })
      expect(loaded).toMatchObject({ text: null, assetUrl: 'blob:virtual-svg' })
      expect(file.text).not.toHaveBeenCalled()
      expect(URL.createObjectURL).toHaveBeenCalledWith(file)
      loaded.revokeAssetUrl()
    } finally {
      if (originalCreate) URL.createObjectURL = originalCreate
      else delete URL.createObjectURL
      if (originalRevoke) URL.revokeObjectURL = originalRevoke
      else delete URL.revokeObjectURL
    }
  })

  it('rejects virtual SVGs with a mismatched extension or MIME type', async () => {
    await expect(loadDocument({
      fileType: SVG_TYPE,
      workspaceReader: { name: 'diagram.png', type: 'image/svg+xml' }
    })).rejects.toThrow('not a registered image format')
    await expect(loadDocument({
      fileType: SVG_TYPE,
      workspaceReader: { name: 'diagram.svg', type: 'text/html' }
    })).rejects.toThrow('unsupported image type')
  })

  it('revokes a newly created virtual image URL when the load is aborted', async () => {
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    const controller = new AbortController()
    URL.createObjectURL = vi.fn(() => {
      controller.abort()
      return 'blob:aborted-photo'
    })
    URL.revokeObjectURL = vi.fn()
    try {
      await expect(loadDocument({
        fileType: IMAGE_TYPE,
        workspaceReader: {
          getFile: vi.fn().mockResolvedValue({ name: 'photo.jpeg', type: 'image/jpeg' })
        },
        signal: controller.signal
      })).rejects.toMatchObject({ name: 'AbortError' })
      expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:aborted-photo')
    } finally {
      if (originalCreate) URL.createObjectURL = originalCreate
      else delete URL.createObjectURL
      if (originalRevoke) URL.revokeObjectURL = originalRevoke
      else delete URL.revokeObjectURL
    }
  })
})
