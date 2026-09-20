import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFileSchemeAccess, openExtensionDetails } from '../file-scheme-access.js'

describe('file scheme access actions', () => {
  afterEach(() => {
    delete globalThis.chrome
  })

  it('returns unavailable when Chrome does not expose the access API', async () => {
    await expect(getFileSchemeAccess()).resolves.toBeNull()
  })

  it('reads allowed access from the callback API', async () => {
    globalThis.chrome = {
      extension: { isAllowedFileSchemeAccess: vi.fn((callback) => callback(true)) },
      runtime: {}
    }

    await expect(getFileSchemeAccess()).resolves.toBe(true)
  })

  it('reads blocked access from the promise API', async () => {
    globalThis.chrome = {
      extension: { isAllowedFileSchemeAccess: vi.fn(async () => false) },
      runtime: {}
    }

    await expect(getFileSchemeAccess()).resolves.toBe(false)
  })

  it('opens the current extension details page', async () => {
    const create = vi.fn(async () => undefined)
    globalThis.chrome = {
      runtime: { id: 'markdown-plus-id' },
      tabs: { create }
    }

    await openExtensionDetails()

    expect(create).toHaveBeenCalledWith({
      url: 'chrome://extensions/?id=markdown-plus-id'
    })
  })

  it('explains the manual fallback when extension details cannot be opened', async () => {
    await expect(openExtensionDetails()).rejects.toThrow('Open chrome://extensions manually.')
  })
})
