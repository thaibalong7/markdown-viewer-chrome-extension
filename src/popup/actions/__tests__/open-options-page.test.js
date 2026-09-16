import { afterEach, describe, expect, it, vi } from 'vitest'
import { openOptionsPage } from '../open-options-page.js'

describe('openOptionsPage', () => {
  afterEach(() => {
    delete globalThis.chrome
  })

  it('opens the extension options page through the runtime API', async () => {
    const open = vi.fn(async () => undefined)
    globalThis.chrome = { runtime: { openOptionsPage: open } }

    await expect(openOptionsPage()).resolves.toBeUndefined()
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('surfaces unsupported browser environments', async () => {
    await expect(openOptionsPage()).rejects.toThrow(
      'The Settings page is unavailable in this browser.'
    )
  })
})
