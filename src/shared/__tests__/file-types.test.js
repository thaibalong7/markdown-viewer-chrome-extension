import { describe, expect, it } from 'vitest'
import { MDP_WS_FILE } from '../constants/explorer.js'
import {
  getDocumentCapabilities,
  getFileTypeById,
  getFileTypeFromName,
  getFileTypeFromUrl,
  isDirectActivationUrl,
  isExplorerSupportedFile,
  stripRegisteredFileExtension
} from '../file-types.js'

describe('file type registry', () => {
  it.each(['README.md', 'Guide.MARKDOWN', 'archive.mdown', 'config.mdc', 'CONFIG.MDC'])(
    'classifies Markdown-family name %s',
    (name) => {
      expect(getFileTypeFromName(name)?.id).toBe('markdown')
    }
  )

  it.each(['README', 'README.md/', '.md', 'report.pdf'])(
    'rejects unsupported or non-file name %s',
    (name) => {
      expect(getFileTypeFromName(name)).toBeNull()
    }
  )

  it('classifies real file URLs without query or fragment affecting the result', () => {
    expect(getFileTypeFromUrl('file:///D%E1%BB%B1%20%C3%A1n/Guide%20Notes.mdc?raw=1#intro')?.id).toBe(
      'markdown'
    )
  })

  it('classifies encoded workspace virtual paths using the original encoded name', () => {
    const href = `${MDP_WS_FILE}${encodeURIComponent('Dự án/docs/Hướng dẫn.mdc')}`
    expect(getFileTypeFromUrl(href)?.id).toBe('markdown')
    expect(isExplorerSupportedFile(href)).toBe(true)
    expect(isDirectActivationUrl(href)).toBe(false)
  })

  it.each([
    'https://example.com/README.md',
    'file:///docs/',
    'file:///docs/README'
  ])('rejects unsupported URL %s', (url) => {
    expect(getFileTypeFromUrl(url)).toBeNull()
    expect(isDirectActivationUrl(url)).toBe(false)
  })

  it('directly activates every registered Markdown-family extension', () => {
    expect(isDirectActivationUrl('file:///docs/README.md')).toBe(true)
    expect(isDirectActivationUrl('file:///docs/config.mdc')).toBe(true)
    expect(isDirectActivationUrl('file:///docs/notes.txt')).toBe(false)
  })

  it('publishes immutable Markdown capabilities', () => {
    expect(getFileTypeById('markdown')).toMatchObject({ rendererId: 'markdown', contentKind: 'text' })
    expect(getDocumentCapabilities('markdown')).toEqual({
      outline: true,
      edit: true,
      exportDocument: true,
      print: true,
      viewModes: ['rendered'],
      zoom: true
    })
    expect(getDocumentCapabilities('unknown')).toBeNull()
  })

  it('registers plain text for explorer-only rendering without Markdown capabilities', () => {
    expect(getFileTypeFromName('notes.TXT')).toMatchObject({
      id: 'text',
      activation: 'explorer-only',
      contentKind: 'text',
      rendererId: 'text'
    })
    expect(getFileTypeFromUrl('file:///docs/notes.txt')?.id).toBe('text')
    expect(isExplorerSupportedFile('notes.txt')).toBe(true)
    expect(getDocumentCapabilities('text')).toEqual({
      outline: false,
      edit: false,
      exportDocument: false,
      print: true,
      viewModes: ['rendered'],
      zoom: false
    })
  })

  it('registers standalone Mermaid with rendered and raw modes but no direct activation', () => {
    expect(getFileTypeFromName('architecture.MERMAID')).toMatchObject({
      id: 'mermaid',
      activation: 'explorer-only',
      contentKind: 'text',
      rendererId: 'mermaid',
      explorerIcon: 'diagram'
    })
    expect(getFileTypeFromUrl('file:///docs/architecture.mermaid')?.id).toBe('mermaid')
    expect(isExplorerSupportedFile('architecture.mermaid')).toBe(true)
    expect(isDirectActivationUrl('file:///docs/architecture.mermaid')).toBe(false)
    expect(getDocumentCapabilities('mermaid')).toEqual({
      outline: false,
      edit: false,
      exportDocument: false,
      print: true,
      viewModes: ['rendered', 'raw'],
      zoom: true
    })
  })

  it.each(['photo.png', 'photo.JPG', 'photo.jpeg', 'animation.gif', 'photo.webp', 'photo.avif', 'photo.bmp', 'favicon.ico', 'animation.apng'])(
    'registers raster image %s as explorer-only',
    (name) => {
      expect(getFileTypeFromName(name)).toMatchObject({
        id: 'raster-image',
        activation: 'explorer-only',
        contentKind: 'image',
        rendererId: 'image',
        explorerIcon: 'image'
      })
      expect(isExplorerSupportedFile(name)).toBe(true)
      expect(isDirectActivationUrl(`file:///docs/${name}`)).toBe(false)
    }
  )

  it('publishes image-only capabilities for raster files', () => {
    expect(getDocumentCapabilities('raster-image')).toEqual({
      outline: false,
      edit: false,
      exportDocument: false,
      print: true,
      viewModes: ['rendered'],
      zoom: true
    })
  })

  it('registers SVG separately as explorer-only with no raw/source mode', () => {
    expect(getFileTypeFromName('diagram.SVG')).toMatchObject({
      id: 'svg-image',
      activation: 'explorer-only',
      contentKind: 'image',
      rendererId: 'image',
      explorerIcon: 'vector-image',
      mimeTypes: ['image/svg+xml']
    })
    expect(getFileTypeFromUrl('file:///docs/diagram.svg')?.id).toBe('svg-image')
    expect(isExplorerSupportedFile('diagram.svg')).toBe(true)
    expect(isDirectActivationUrl('file:///docs/diagram.svg')).toBe(false)
    expect(getDocumentCapabilities('svg-image')).toEqual({
      outline: false,
      edit: false,
      exportDocument: false,
      print: true,
      viewModes: ['rendered'],
      zoom: true
    })
  })

  it('strips only registered extensions', () => {
    expect(stripRegisteredFileExtension('Guide Notes.mdc')).toBe('Guide Notes')
    expect(stripRegisteredFileExtension('notes.txt')).toBe('notes')
    expect(stripRegisteredFileExtension('architecture.mermaid')).toBe('architecture')
    expect(stripRegisteredFileExtension('photo.jpeg')).toBe('photo')
    expect(stripRegisteredFileExtension('diagram.svg')).toBe('diagram')
  })
})
