import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const manifestUrl = new URL('../../manifest.json', import.meta.url)

async function readManifest() {
  return JSON.parse(await readFile(manifestUrl, 'utf8'))
}

describe('extension manifest permissions', () => {
  it('limits page access and runtime assets to local files', async () => {
    const manifest = await readManifest()

    expect(manifest.minimum_chrome_version).toBe('109')
    expect(manifest.host_permissions).toEqual(['file:///*'])
    expect(manifest.content_scripts.map(({ matches }) => matches)).toEqual([['file:///*']])
    expect(manifest.web_accessible_resources.map(({ matches }) => matches)).toEqual([
      ['file:///*']
    ])
    expect(JSON.stringify(manifest)).not.toContain('<all_urls>')
  })

  it('keeps only permissions backed by current runtime features', async () => {
    const manifest = await readManifest()

    expect(manifest.permissions).toEqual(['storage', 'offscreen', 'downloads'])
  })
})
