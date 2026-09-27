import { describe, expect, it, vi } from 'vitest'
import { createOptionsPageService } from '../options-page-service.js'

describe('options page service', () => {
  it('opens the Files & Workspace section from the privileged background context', async () => {
    const tabsApi = { create: vi.fn(async () => undefined) }
    const runtimeApi = {
      getURL: vi.fn((path) => `chrome-extension://markdown-plus/${path}`)
    }
    const service = createOptionsPageService({ runtimeApi, tabsApi })

    await expect(service.openExplorerSettings()).resolves.toBeUndefined()
    expect(tabsApi.create).toHaveBeenCalledWith({
      url: 'chrome-extension://markdown-plus/src/options/index.html#explorer'
    })
  })

  it('fails clearly when the privileged browser APIs are unavailable', async () => {
    const service = createOptionsPageService({ runtimeApi: {}, tabsApi: {} })

    await expect(service.openExplorerSettings()).rejects.toThrow(
      'The Settings page is unavailable in this browser.'
    )
  })
})
