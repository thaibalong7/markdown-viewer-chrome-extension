import { describe, it, expect } from 'vitest'
import {
  normalizeFileUrlKey,
  getSuggestedFilenameFromUrl,
  getLeafFilenameFromFileUrl,
  handleMatchesFileUrl,
  FileMismatchError,
  isFileSystemAccessSupported
} from '../file-io.js'

describe('file-io', () => {
  it('normalizeFileUrlKey strips hash', () => {
    const key = normalizeFileUrlKey('file:///tmp/README.md#section')
    expect(key).toBe('file:///tmp/README.md')
  })

  it('getSuggestedFilenameFromUrl uses leaf name', () => {
    expect(getSuggestedFilenameFromUrl('file:///Users/me/notes/Hello%20World.md')).toBe('Hello World.md')
  })

  it('getSuggestedFilenameFromUrl adds .md when missing', () => {
    expect(getSuggestedFilenameFromUrl('file:///tmp/readme')).toBe('readme.md')
  })

  it('isFileSystemAccessSupported is false without window.showSaveFilePicker', () => {
    expect(isFileSystemAccessSupported()).toBe(false)
  })

  it('getLeafFilenameFromFileUrl decodes path leaf', () => {
    expect(getLeafFilenameFromFileUrl('file:///tmp/My%20Doc.md')).toBe('My Doc.md')
  })

  it('handleMatchesFileUrl compares leaf names case-insensitively', () => {
    expect(handleMatchesFileUrl({ name: 'readme.md' }, 'file:///a/README.MD')).toBe(true)
    expect(handleMatchesFileUrl({ name: 'other.md' }, 'file:///a/README.md')).toBe(false)
  })

  it('FileMismatchError includes expected and selected names', () => {
    const err = new FileMismatchError('README.md', 'notes.md')
    expect(err.name).toBe('FileMismatchError')
    expect(err.message).toContain('README.md')
    expect(err.message).toContain('notes.md')
  })
})
