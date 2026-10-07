import { afterEach, describe, expect, it, vi } from 'vitest'
import { openOptionsSection } from '../open-options-section.js'

describe('openOptionsSection', () => {
  afterEach(() => {
    delete globalThis.chrome
  })

  it('opens an exact Settings deep link in a new extension tab', async () => {
    const create = vi.fn(async () => undefined)
    globalThis.chrome = {
      runtime: { getURL: vi.fn(() => 'chrome-extension://extension-id/src/options/index.html') },
      tabs: { create }
    }

    await expect(openOptionsSection('about')).resolves.toBeUndefined()
    expect(create).toHaveBeenCalledWith({
      url: 'chrome-extension://extension-id/src/options/index.html#about'
    })
  })

  it('rejects invalid section ids before opening a tab', async () => {
    await expect(openOptionsSection('../about')).rejects.toThrow(
      'Choose a valid Settings section.'
    )
  })

  it('surfaces unsupported browser environments', async () => {
    await expect(openOptionsSection('about')).rejects.toThrow(
      'The Settings page is unavailable in this browser.'
    )
  })
})
