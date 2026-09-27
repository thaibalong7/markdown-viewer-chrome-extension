import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MESSAGE_TYPES } from '../../../messaging/index.js'

const mocks = vi.hoisted(() => ({ sendMessage: vi.fn() }))

vi.mock('../../../messaging/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  sendMessage: mocks.sendMessage
}))

import { openExplorerSettings } from '../explorer-settings-actions.js'

describe('explorer Settings action', () => {
  beforeEach(() => {
    mocks.sendMessage.mockReset()
  })

  it('asks the background to open the explorer Settings section', async () => {
    mocks.sendMessage.mockResolvedValue({ ok: true })

    await expect(openExplorerSettings()).resolves.toBeUndefined()
    expect(mocks.sendMessage).toHaveBeenCalledWith({
      type: MESSAGE_TYPES.OPEN_EXPLORER_SETTINGS
    })
  })

  it('surfaces a background failure', async () => {
    mocks.sendMessage.mockResolvedValue({ ok: false, error: 'Tabs API is unavailable.' })

    await expect(openExplorerSettings()).rejects.toThrow('Tabs API is unavailable.')
  })
})
