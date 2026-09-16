import { afterEach, describe, expect, it, vi } from 'vitest'
import { MESSAGE_TYPES } from '../../messaging/index.js'
import { clearRecentFiles } from '../options-actions.js'

describe('options actions', () => {
  afterEach(() => {
    delete globalThis.chrome
  })

  it('clears recent files through the standard message envelope', async () => {
    const sendMessage = vi.fn(async () => ({ ok: true, data: [] }))
    globalThis.chrome = { runtime: { sendMessage } }

    await expect(clearRecentFiles()).resolves.toEqual([])
    expect(sendMessage).toHaveBeenCalledWith({ type: MESSAGE_TYPES.CLEAR_FILE_HISTORY })
  })

  it('surfaces clear-history failures to the Settings page', async () => {
    globalThis.chrome = {
      runtime: { sendMessage: vi.fn(async () => ({ ok: false, error: 'Local storage failed.' })) }
    }

    await expect(clearRecentFiles()).rejects.toThrow('Local storage failed.')
  })
})
