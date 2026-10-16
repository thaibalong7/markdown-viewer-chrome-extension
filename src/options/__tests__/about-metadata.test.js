import { t } from '../../i18n/index.js'
import { describe, expect, it } from 'vitest'
import { ABOUT_LINKS, getExtensionMetadata } from '../about-metadata.js'

function localizedMetadata(runtime) {
  return Object.fromEntries(Object.entries(getExtensionMetadata(runtime))
    .map(([key, value]) => [key, t(value, {}, 'en')]))
}

describe('About metadata', () => {
  it('reads packaged extension information from the runtime manifest', () => {
    const runtime = {
      getManifest: () => ({
        version: '1.2.3',
        version_name: '1.2.3 beta',
        manifest_version: 3,
        minimum_chrome_version: '109'
      })
    }

    expect(localizedMetadata(runtime)).toEqual({
      version: '1.2.3 beta',
      manifestLabel: 'Manifest V3',
      minimumChromeLabel: 'Chrome 109+'
    })
  })

  it('provides non-misleading development fallbacks outside Chrome', () => {
    expect(localizedMetadata(undefined)).toEqual({
      version: 'Development build',
      manifestLabel: 'Chrome extension',
      minimumChromeLabel: ''
    })
  })

  it('keeps the project, support, privacy, and license destinations available', () => {
    expect(ABOUT_LINKS.map(({ id }) => id)).toEqual([
      'website',
      'source',
      'support',
      'privacy',
      'license'
    ])
  })
})
