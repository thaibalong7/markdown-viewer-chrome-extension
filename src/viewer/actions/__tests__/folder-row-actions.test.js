import { describe, expect, it } from 'vitest'
import { getFolderCopyPath } from '../folder-row-actions.js'

describe('folder path copy identity', () => {
  it('decodes file paths and preserves a network host', () => {
    expect(getFolderCopyPath({ href: 'file:///docs/My%20Notes/' })).toBe('/docs/My Notes/')
    expect(getFolderCopyPath({ href: 'file://server/notes/' })).toBe('//server/notes/')
  })
  it('copies a workspace-relative path without exposing virtual URL schemes', () => {
    expect(getFolderCopyPath({ href: 'mdp-ws-dir:123', name: 'design' }, 'docs/design')).toBe('docs/design')
    expect(getFolderCopyPath({ href: 'invalid', name: 'design' })).toBe('design')
  })
})
