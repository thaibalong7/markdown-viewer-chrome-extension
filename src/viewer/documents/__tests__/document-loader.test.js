import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ sendMessage: vi.fn() }))
vi.mock('../../../messaging/index.js', () => ({
  MESSAGE_TYPES: { FETCH_FILE_AS_TEXT: 'FETCH_FILE_AS_TEXT', FETCH_FILE_AS_BYTES: 'FETCH_FILE_AS_BYTES' },
  sendMessage: mocks.sendMessage
}))

import { loadDocument, MAX_PLAIN_TEXT_BYTES } from '../document-loader.js'

const MARKDOWN_TYPE = { id: 'markdown', contentKind: 'text' }
const TEXT_TYPE = { id: 'text', contentKind: 'text' }
const SQL_TYPE = { id: 'sql', contentKind: 'text' }
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
  it('bounds watch reads before reading workspace source and after real-file reads', async () => {
    const text = vi.fn()
    await expect(loadDocument({
      fileType: MARKDOWN_TYPE, maxWatchBytes: 4,
      workspaceReader: { getFile: async () => ({ size: 5, text }) }
    })).rejects.toMatchObject({ code: 'document-too-large' })
    expect(text).not.toHaveBeenCalled()
    mocks.sendMessage.mockResolvedValue({ ok: true, data: { text: 'hello' } })
    await expect(loadDocument({
      href: 'file:///docs/README.md', fileType: MARKDOWN_TYPE, maxWatchBytes: 4
    })).rejects.toMatchObject({ code: 'document-too-large' })
  })

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

  it('applies the configured UTF-8 byte limit to file URL documents', async () => {
    const oneMiBInTwoByteCharacters = 'é'.repeat((1024 * 1024) / 2)
    mocks.sendMessage
      .mockResolvedValueOnce({ ok: true, data: { text: oneMiBInTwoByteCharacters } })
      .mockResolvedValueOnce({ ok: true, data: { text: `${oneMiBInTwoByteCharacters}é` } })

    await expect(loadDocument({
      href: 'file:///docs/within-limit.txt',
      fileType: TEXT_TYPE,
      maxStandaloneTextFileSizeMiB: 1
    })).resolves.toMatchObject({ text: oneMiBInTwoByteCharacters })

    await expect(loadDocument({
      href: 'file:///docs/over-limit.txt',
      fileType: TEXT_TYPE,
      maxStandaloneTextFileSizeMiB: 1
    })).rejects.toMatchObject({
      code: 'document-too-large',
      userMessage: 'This text file is larger than the 1 MiB viewing limit.'
    })
  })

  it('applies the configured byte limit before reading a sized virtual workspace file', async () => {
    const reader = {
      size: (2 * 1024 * 1024) + 1,
      text: vi.fn().mockResolvedValue('should not be read')
    }

    await expect(loadDocument({
      fileType: MERMAID_TYPE,
      workspaceReader: reader,
      maxStandaloneTextFileSizeMiB: 2
    })).rejects.toMatchObject({
      code: 'document-too-large',
      userMessage: 'This text file is larger than the 2 MiB viewing limit.'
    })
    expect(reader.text).not.toHaveBeenCalled()
  })

  it('allows a larger configured limit while retaining the safe default for invalid values', async () => {
    const aboveDefaultLimit = 'a'.repeat(MAX_PLAIN_TEXT_BYTES + 1)
    mocks.sendMessage
      .mockResolvedValueOnce({ ok: true, data: { text: aboveDefaultLimit } })
      .mockResolvedValueOnce({ ok: true, data: { text: aboveDefaultLimit } })

    await expect(loadDocument({
      href: 'file:///docs/allowed.txt',
      fileType: TEXT_TYPE,
      maxStandaloneTextFileSizeMiB: 6
    })).resolves.toMatchObject({ text: aboveDefaultLimit })

    await expect(loadDocument({
      href: 'file:///docs/still-protected.txt',
      fileType: TEXT_TYPE,
      maxStandaloneTextFileSizeMiB: 500
    })).rejects.toMatchObject({ code: 'document-too-large' })
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

  it('loads SQL as text and enforces the standalone file limit', async () => {
    mocks.sendMessage
      .mockResolvedValueOnce({ ok: true, data: { text: 'SELECT * FROM users;' } })
      .mockResolvedValueOnce({ ok: true, data: { text: 'a'.repeat(MAX_PLAIN_TEXT_BYTES + 1) } })

    await expect(loadDocument({
      href: 'file:///docs/schema.sql',
      fileType: SQL_TYPE
    })).resolves.toMatchObject({ text: 'SELECT * FROM users;', assetUrl: null })
    await expect(loadDocument({
      href: 'file:///docs/large.sql',
      fileType: SQL_TYPE
    })).rejects.toMatchObject({ code: 'document-too-large' })
  })

  it('retains the normalized local resource fallback for oversized images', async () => {
    mocks.sendMessage.mockResolvedValue({ ok: false, code: 'document-too-large', error: 'too large' })
    await expect(loadDocument({
      href: 'file:///docs/My%20Photo.PNG?ignored=1#ignored',
      fileType: IMAGE_TYPE
    })).resolves.toEqual({
      text: null,
      assetUrl: 'file:///docs/My%20Photo.PNG',
      revokeAssetUrl: null
    })
  })

  it('keeps oversized workspace images viewable and idempotently releases their URL', async () => {
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn().mockReturnValue('blob:virtual-photo')
    URL.revokeObjectURL = vi.fn()
    try {
      const file = { name: 'photo.png', type: 'image/png', size: MAX_PLAIN_TEXT_BYTES + 1, arrayBuffer: vi.fn() }
      const loaded = await loadDocument({ fileType: IMAGE_TYPE, workspaceReader: file })
      expect(loaded).toMatchObject({ text: null, assetUrl: 'blob:virtual-photo' })
      expect(URL.createObjectURL).toHaveBeenCalledWith(file)
      expect(file.arrayBuffer).not.toHaveBeenCalled()

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

  it('keeps oversized local SVG fallback and renders workspace SVG bytes only as image resources', async () => {
    mocks.sendMessage.mockResolvedValue({ ok: false, code: 'document-too-large', error: 'too large' })
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
      const svgSource = '<svg onload="alert(1)"><script>alert(1)</script></svg>'
      const file = {
        arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode(svgSource).buffer),
        name: 'diagram.svg',
        type: 'image/svg+xml',
        text: vi.fn().mockResolvedValue('<svg onload="alert(1)"><script>alert(1)</script></svg>')
      }
      const loaded = await loadDocument({ fileType: SVG_TYPE, workspaceReader: file })
      expect(loaded).toMatchObject({ text: null, assetUrl: 'blob:virtual-svg' })
      expect(file.text).not.toHaveBeenCalled()
      const imageBlob = URL.createObjectURL.mock.calls[0][0]
      expect(imageBlob.type).toBe('image/svg+xml')
      expect(await imageBlob.text()).toBe(svgSource)
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
          getFile: vi.fn().mockResolvedValue({ name: 'photo.jpeg', type: 'image/jpeg',
            arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer })
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

it('captures exact local image bytes and polls without allocating temporary URLs', async () => {
  mocks.sendMessage.mockResolvedValue({ ok: true, data: { base64: btoa('pixels'), size: 6 } })
  const create = vi.spyOn(URL, 'createObjectURL')
  const revoke = vi.spyOn(URL, 'revokeObjectURL')
  try {
    const loaded = await loadDocument({ href: 'file:///docs/photo.png', fileType: IMAGE_TYPE })
    expect(loaded.revisionSource).toBe(btoa('pixels'))
    expect(loaded.assetUrl).toMatch(/^blob:/)
    expect(create).toHaveBeenCalledOnce()
    expect(mocks.sendMessage).toHaveBeenCalledWith({ type: 'FETCH_FILE_AS_BYTES', payload: { url: 'file:///docs/photo.png' } })
    const revision = await loadDocument({ href: 'file:///docs/photo.png', fileType: IMAGE_TYPE, revisionOnly: true, maxWatchBytes: 10 })
    expect(revision).toEqual({ revisionSource: btoa('pixels') })
    expect(create).toHaveBeenCalledOnce()
    loaded.revokeAssetUrl()
    loaded.revokeAssetUrl()
    expect(revoke).toHaveBeenCalledOnce()
  } finally {
    create.mockRestore()
    revoke.mockRestore()
  }
})

it('keeps large real images viewable but rejects their Watch reads', async () => {
  mocks.sendMessage.mockResolvedValue({ ok: false, code: 'document-too-large', error: 'too large' })
  await expect(loadDocument({ href: 'file:///docs/large.png', fileType: IMAGE_TYPE }))
    .resolves.toMatchObject({ assetUrl: 'file:///docs/large.png' })
  await expect(loadDocument({ href: 'file:///docs/large.png', fileType: IMAGE_TYPE, revisionOnly: true }))
    .rejects.toMatchObject({ code: 'document-too-large' })
})

it('detects same-size workspace image overwrites using bytes rather than metadata', async () => {
  const reader = { getFile: vi.fn()
    .mockResolvedValueOnce(new Blob(['before']))
    .mockResolvedValueOnce(new Blob(['after!'])) }
  const first = await loadDocument({ fileType: IMAGE_TYPE, workspaceReader: reader, revisionOnly: true })
  const second = await loadDocument({ fileType: IMAGE_TYPE, workspaceReader: reader, revisionOnly: true })
  expect(first.revisionSource).toBe(btoa('before'))
  expect(second.revisionSource).toBe(btoa('after!'))
})

it('bounds workspace image reads before allocating bytes and cancels late binary responses', async () => {
  const arrayBuffer = vi.fn()
  await expect(loadDocument({ fileType: IMAGE_TYPE, revisionOnly: true, maxWatchBytes: 4,
    workspaceReader: { size: 5, arrayBuffer } })).rejects.toMatchObject({ code: 'document-too-large' })
  expect(arrayBuffer).not.toHaveBeenCalled()
  const controller = new AbortController()
  mocks.sendMessage.mockImplementation(async () => {
    controller.abort()
    return { ok: true, data: { base64: btoa('late'), size: 4 } }
  })
  await expect(loadDocument({ href: 'file:///docs/photo.png', fileType: IMAGE_TYPE,
    signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
})
