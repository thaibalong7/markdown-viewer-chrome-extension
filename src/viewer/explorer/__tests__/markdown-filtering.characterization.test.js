import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendMessage = vi.hoisted(() => vi.fn())

vi.mock('../../../messaging/index.js', () => ({
  MESSAGE_TYPES: { FETCH_FILE_AS_TEXT: 'FETCH_FILE_AS_TEXT' },
  sendMessage
}))

import { scanSiblingFiles } from '../sibling-scanner.js'
import { scanFolderRecursive } from '../folder-scanner.js'
import {
  scanWorkspaceFromDirectoryHandle,
  scanWorkspaceFromWebkitFileList
} from '../workspace-picker.js'

const RASTER_NAMES = [
  'photo.png',
  'photo.jpg',
  'photo.jpeg',
  'animation.gif',
  'photo.webp',
  'photo.avif',
  'photo.bmp',
  'favicon.ico',
  'animation.apng'
]
const SVG_NAME = 'diagram.svg'
const MERMAID_NAME = 'architecture.mermaid'
const SQL_NAME = 'schema.sql'

function fileHandle(name) {
  return {
    kind: 'file',
    name,
    async getFile() {
      return { name, text: async () => `# ${name}` }
    }
  }
}

function directoryHandle(name, entries) {
  return {
    kind: 'directory',
    name,
    entries() {
      return {
        async *[Symbol.asyncIterator]() {
          yield *entries
        }
      }
    },
    async getFileHandle() {
      throw new Error('No .gitignore fixture')
    }
  }
}

function webkitFile(name, webkitRelativePath) {
  return { name, webkitRelativePath, text: async () => `# ${name}` }
}

function flattenFileNames(node) {
  if (node.type === 'file') return [node.name]
  return (node.children || []).flatMap(flattenFileNames)
}

function flattenFileNodes(node) {
  if (node.type === 'file') return [node]
  return (node.children || []).flatMap(flattenFileNodes)
}

beforeEach(() => {
  sendMessage.mockReset()
})

describe('supported-document explorer filtering', () => {
  it('keeps visible supported siblings and preserves Unicode/spaces', async () => {
    sendMessage.mockResolvedValue({
      ok: true,
      data: {
        text: [
          '<script>',
          'addRow("README.md", "README.md", false, 1);',
          'addRow("Guide Notes.markdown", "Guide%20Notes.markdown", false, 1);',
          'addRow("Hướng dẫn.mdown", "H%C6%B0%E1%BB%9Bng%20d%E1%BA%ABn.mdown", false, 1);',
          'addRow("notes.txt", "notes.txt", false, 1);',
          `addRow("${SQL_NAME}", "${SQL_NAME}", false, 1);`,
          ...RASTER_NAMES.map((name) => `addRow("${name}", "${name}", false, 1);`),
          `addRow("${SVG_NAME}", "${SVG_NAME}", false, 1);`,
          `addRow("${MERMAID_NAME}", "${MERMAID_NAME}", false, 1);`,
          'addRow("config.mdc", "config.mdc", false, 1);',
          'addRow(".hidden.md", ".hidden.md", false, 1);',
          '</script>'
        ].join('\n')
      }
    })

    const files = await scanSiblingFiles('file:///fixtures/README.md')

    expect(new Set(files.map((file) => file.displayName))).toEqual(
      new Set([
        'config.mdc',
        'Guide Notes.markdown',
        'Hướng dẫn.mdown',
        'notes.txt',
        SQL_NAME,
        'README.md',
        ...RASTER_NAMES,
        SVG_NAME,
        MERMAID_NAME
      ])
    )
    expect(files.find((file) => file.displayName === 'notes.txt')?.fileTypeId).toBe('text')
    expect(files.find((file) => file.displayName === SQL_NAME)?.fileTypeId).toBe('sql')
    expect(files.find((file) => file.displayName === 'photo.png')?.fileTypeId).toBe('raster-image')
    expect(files.find((file) => file.displayName === SVG_NAME)?.fileTypeId).toBe('svg-image')
    expect(files.find((file) => file.displayName === MERMAID_NAME)?.fileTypeId).toBe('mermaid')
    expect(files.find((file) => file.displayName === 'README.md')?.isActive).toBe(true)
  })

  it('applies the same supported-file allowlist to directory-handle workspaces', async () => {
    const root = directoryHandle('Dự án', [
      ['README.md', fileHandle('README.md')],
      ['Guide Notes.MARKDOWN', fileHandle('Guide Notes.MARKDOWN')],
      ['archive.mdown', fileHandle('archive.mdown')],
      ['config.mdc', fileHandle('config.mdc')],
      ['notes.txt', fileHandle('notes.txt')],
      [SQL_NAME, fileHandle(SQL_NAME)],
      ...RASTER_NAMES.map((name) => [name, fileHandle(name)]),
      [SVG_NAME, fileHandle(SVG_NAME)],
      [MERMAID_NAME, fileHandle(MERMAID_NAME)]
    ])

    const { tree, readers } = await scanWorkspaceFromDirectoryHandle(root, {
      respectGitignore: false
    })

    expect(new Set(flattenFileNames(tree))).toEqual(
      new Set([
        'archive.mdown',
        'config.mdc',
        'Guide Notes.MARKDOWN',
        'notes.txt',
        SQL_NAME,
        'README.md',
        ...RASTER_NAMES,
        SVG_NAME,
        MERMAID_NAME
      ])
    )
    expect(readers.size).toBe(8 + RASTER_NAMES.length)
    expect(flattenFileNodes(tree).find((file) => file.name === 'notes.txt')?.fileTypeId).toBe('text')
    expect(flattenFileNodes(tree).find((file) => file.name === SQL_NAME)?.fileTypeId).toBe('sql')
    expect(flattenFileNodes(tree).find((file) => file.name === 'photo.jpg')?.fileTypeId).toBe('raster-image')
    expect(flattenFileNodes(tree).find((file) => file.name === SVG_NAME)?.fileTypeId).toBe('svg-image')
    expect(flattenFileNodes(tree).find((file) => file.name === MERMAID_NAME)?.fileTypeId).toBe('mermaid')
    expect([...readers.keys()].every((href) => href.startsWith('mdp-ws-file:'))).toBe(true)
  })

  it('applies the same supported-file allowlist to recursive file URL scans', async () => {
    sendMessage.mockResolvedValue({
      ok: true,
      data: {
        text: [
          '<script>',
          'addRow("README.md", "README.md", false, 1);',
          'addRow("config.mdc", "config.mdc", false, 1);',
          'addRow("notes.txt", "notes.txt", false, 1);',
          `addRow("${SQL_NAME}", "${SQL_NAME}", false, 1);`,
          ...RASTER_NAMES.map((name) => `addRow("${name}", "${name}", false, 1);`),
          `addRow("${SVG_NAME}", "${SVG_NAME}", false, 1);`,
          `addRow("${MERMAID_NAME}", "${MERMAID_NAME}", false, 1);`,
          '</script>'
        ].join('\n')
      }
    })

    const { tree, stats } = await scanFolderRecursive('file:///fixtures/', {
      respectGitignore: false
    })

    expect(new Set(flattenFileNames(tree))).toEqual(
      new Set(['config.mdc', 'notes.txt', SQL_NAME, 'README.md', ...RASTER_NAMES, SVG_NAME, MERMAID_NAME])
    )
    expect(flattenFileNodes(tree).find((file) => file.name === 'notes.txt')?.fileTypeId).toBe('text')
    expect(flattenFileNodes(tree).find((file) => file.name === SQL_NAME)?.fileTypeId).toBe('sql')
    expect(flattenFileNodes(tree).find((file) => file.name === 'photo.webp')?.fileTypeId).toBe('raster-image')
    expect(flattenFileNodes(tree).find((file) => file.name === SVG_NAME)?.fileTypeId).toBe('svg-image')
    expect(flattenFileNodes(tree).find((file) => file.name === MERMAID_NAME)?.fileTypeId).toBe('mermaid')
    expect(stats.scannedFiles).toBe(6 + RASTER_NAMES.length)
  })

  it('applies the same supported-file allowlist to webkitdirectory workspaces', async () => {
    const files = [
      webkitFile('README.md', 'Dự án/README.md'),
      webkitFile('Hướng dẫn.mdown', 'Dự án/docs/Hướng dẫn.mdown'),
      webkitFile('Guide Notes.markdown', 'Dự án/Guide Notes.markdown'),
      webkitFile('config.mdc', 'Dự án/config.mdc'),
      webkitFile('notes.txt', 'Dự án/notes.txt'),
      webkitFile(SQL_NAME, `Dự án/${SQL_NAME}`),
      ...RASTER_NAMES.map((name) => webkitFile(name, `Dự án/${name}`)),
      webkitFile(SVG_NAME, `Dự án/${SVG_NAME}`),
      webkitFile(MERMAID_NAME, `Dự án/${MERMAID_NAME}`)
    ]

    const { tree, readers } = await scanWorkspaceFromWebkitFileList(files, {
      respectGitignore: false
    })

    expect(new Set(flattenFileNames(tree))).toEqual(
      new Set([
        'config.mdc',
        'Hướng dẫn.mdown',
        'Guide Notes.markdown',
        'notes.txt',
        SQL_NAME,
        'README.md',
        ...RASTER_NAMES,
        SVG_NAME,
        MERMAID_NAME
      ])
    )
    expect(readers.size).toBe(8 + RASTER_NAMES.length)
    expect(flattenFileNodes(tree).find((file) => file.name === 'notes.txt')?.fileTypeId).toBe('text')
    expect(flattenFileNodes(tree).find((file) => file.name === SQL_NAME)?.fileTypeId).toBe('sql')
    expect(flattenFileNodes(tree).find((file) => file.name === 'animation.apng')?.fileTypeId).toBe('raster-image')
    expect(flattenFileNodes(tree).find((file) => file.name === SVG_NAME)?.fileTypeId).toBe('svg-image')
    expect(flattenFileNodes(tree).find((file) => file.name === MERMAID_NAME)?.fileTypeId).toBe('mermaid')
  })
})
