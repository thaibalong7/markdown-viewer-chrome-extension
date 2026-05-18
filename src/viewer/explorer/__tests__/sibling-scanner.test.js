import { describe, expect, it } from 'vitest'
import { scanSiblingFiles } from '../sibling-scanner.js'

describe('sibling scanner cancellation', () => {
  it('throws AbortError before starting a sibling scan with an aborted signal', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      scanSiblingFiles('file:///Users/example/docs/readme.md', { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
