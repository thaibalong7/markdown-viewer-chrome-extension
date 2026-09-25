import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  FileConflictError,
  FileContentMismatchError,
  normalizeFileUrlKey,
  getSuggestedFilenameFromUrl,
  getLeafFilenameFromFileUrl,
  getDisplayPathFromFileUrl,
  handleMatchesFileUrl,
  FileMismatchError,
  isFileSystemAccessSupported,
  prepareFileForEditing,
  saveFile
} from '../file-io.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

function createWritableHandle(name, initialContent) {
  let diskContent = initialContent
  let pendingContent = initialContent
  return {
    name,
    getFile: vi.fn(async () => ({ text: async () => diskContent })),
    queryPermission: vi.fn(async () => 'granted'),
    requestPermission: vi.fn(async () => 'granted'),
    createWritable: vi.fn(async () => ({
      write: async (content) => { pendingContent = content },
      close: async () => { diskContent = pendingContent }
    })),
    read: () => diskContent,
    changeOnDisk: (content) => { diskContent = content }
  }
}

describe('file-io', () => {
  it('normalizeFileUrlKey strips hash', () => {
    const key = normalizeFileUrlKey('file:///tmp/README.md#section')
    expect(key).toBe('file:///tmp/README.md')
  })

  it('getSuggestedFilenameFromUrl uses leaf name', () => {
    expect(getSuggestedFilenameFromUrl('file:///Users/me/notes/Hello%20World.md')).toBe('Hello World.md')
    expect(getSuggestedFilenameFromUrl('file:///Users/me/notes/rules.mdc')).toBe('rules.mdc')
  })

  it('getSuggestedFilenameFromUrl adds .md when missing', () => {
    expect(getSuggestedFilenameFromUrl('file:///tmp/readme')).toBe('readme.md')
  })

  it('isFileSystemAccessSupported is false without window.showOpenFilePicker', () => {
    expect(isFileSystemAccessSupported()).toBe(false)
  })

  it('getLeafFilenameFromFileUrl decodes path leaf', () => {
    expect(getLeafFilenameFromFileUrl('file:///tmp/My%20Doc.md')).toBe('My Doc.md')
  })

  it('getDisplayPathFromFileUrl decodes the local path', () => {
    expect(getDisplayPathFromFileUrl('file:///tmp/My%20Doc.md#intro')).toBe('/tmp/My Doc.md')
  })

  it('handleMatchesFileUrl requires the exact leaf filename', () => {
    expect(handleMatchesFileUrl({ name: 'readme.md' }, 'file:///a/README.MD')).toBe(false)
    expect(handleMatchesFileUrl({ name: 'README.MD' }, 'file:///a/README.MD')).toBe(true)
    expect(handleMatchesFileUrl({ name: 'other.md' }, 'file:///a/README.md')).toBe(false)
  })

  it('FileMismatchError includes expected and selected names', () => {
    const err = new FileMismatchError('README.md', 'notes.md')
    expect(err.name).toBe('FileMismatchError')
    expect(err.message).toContain('README.md')
    expect(err.message).toContain('notes.md')
  })

  it('connects and saves only through the verified original handle', async () => {
    const handle = createWritableHandle('safe-save.md', '# Original')
    vi.stubGlobal('window', {
      showOpenFilePicker: vi.fn(async () => [handle])
    })

    await expect(
      prepareFileForEditing('# Original', { fileUrl: 'file:///tmp/safe-save.md' })
    ).resolves.toMatchObject({ status: 'ready', reused: false })
    await expect(
      saveFile('# Updated', { fileUrl: 'file:///tmp/safe-save.md' })
    ).resolves.toBe('fsa')
    expect(handle.read()).toBe('# Updated')
  })

  it('accepts equivalent content when the raw viewer normalized line endings', async () => {
    const handle = createWritableHandle('line-endings.md', '# Title\r\n\r\nBody\r\n')
    vi.stubGlobal('window', {
      showOpenFilePicker: vi.fn(async () => [handle])
    })

    await expect(
      prepareFileForEditing('# Title\n\nBody\n', { fileUrl: 'file:///tmp/line-endings.md' })
    ).resolves.toMatchObject({ status: 'ready' })
  })

  it('rejects a same-name file whose contents do not match the open document', async () => {
    const handle = createWritableHandle('content-check.md', '# Another document')
    vi.stubGlobal('window', {
      showOpenFilePicker: vi.fn(async () => [handle])
    })

    await expect(
      prepareFileForEditing('# Open document', { fileUrl: 'file:///tmp/content-check.md' })
    ).rejects.toBeInstanceOf(FileContentMismatchError)
    expect(handle.createWritable).not.toHaveBeenCalled()
  })

  it('blocks save when the connected file changes externally', async () => {
    const handle = createWritableHandle('conflict-check.md', '# Original')
    vi.stubGlobal('window', {
      showOpenFilePicker: vi.fn(async () => [handle])
    })
    await prepareFileForEditing('# Original', { fileUrl: 'file:///tmp/conflict-check.md' })
    handle.changeOnDisk('# External edit')

    await expect(
      saveFile('# My edit', { fileUrl: 'file:///tmp/conflict-check.md' })
    ).rejects.toBeInstanceOf(FileConflictError)
    expect(handle.createWritable).not.toHaveBeenCalled()
  })
})
