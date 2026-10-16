import { message as localizedMessage } from '../i18n/index.js'
export const ABOUT_LINKS = Object.freeze([
  Object.freeze({
    id: 'website',
    label: 'options.about.links.website.label',
    description: 'options.about.links.website.description',
    href: 'https://thaibalong7.github.io/markdown-viewer-chrome-extension/'
  }),
  Object.freeze({
    id: 'source',
    label: 'options.about.links.source.label',
    description: 'options.about.links.source.description',
    href: 'https://github.com/thaibalong7/markdown-viewer-chrome-extension'
  }),
  Object.freeze({
    id: 'support',
    label: 'options.about.links.support.label',
    description: 'options.about.links.support.description',
    href: 'https://github.com/thaibalong7/markdown-viewer-chrome-extension/issues'
  }),
  Object.freeze({
    id: 'privacy',
    label: 'options.about.links.privacy.label',
    description: 'options.about.links.privacy.description',
    href: 'https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/'
  }),
  Object.freeze({
    id: 'license',
    label: 'options.about.links.license.label',
    description: 'options.about.links.license.description',
    href: 'https://github.com/thaibalong7/markdown-viewer-chrome-extension/blob/master/LICENSE'
  })
])

export function getExtensionMetadata(runtime = globalThis.chrome?.runtime) {
  const getManifest = runtime?.getManifest
  if (typeof getManifest !== 'function') {
    return {
      version: 'options.about.developmentBuild',
      manifestLabel: 'options.about.metadata.chromeExtension',
      minimumChromeLabel: ''
    }
  }

  const manifest = getManifest.call(runtime) || {}
  const version = String(manifest.version_name || manifest.version || '').trim()
  const manifestVersion = Number(manifest.manifest_version)
  const minimumChromeVersion = String(manifest.minimum_chrome_version || '').trim()

  return {
    version: version || 'options.about.developmentBuild',
    manifestLabel: Number.isFinite(manifestVersion)
      ? localizedMessage('options.about.metadata.manifestVersion', { 0: manifestVersion })
      : 'options.about.metadata.chromeExtension',
    minimumChromeLabel: minimumChromeVersion
      ? localizedMessage('options.about.metadata.minimumChromeVersion', { 0: minimumChromeVersion })
      : ''
  }
}
