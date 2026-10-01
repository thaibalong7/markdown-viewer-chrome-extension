export const ABOUT_LINKS = Object.freeze([
  Object.freeze({
    id: 'website',
    label: 'Website',
    description: 'Visit the Markdown Plus project website.',
    href: 'https://thaibalong7.github.io/markdown-viewer-chrome-extension/'
  }),
  Object.freeze({
    id: 'source',
    label: 'Source code',
    description: 'Explore the project and contribute on GitHub.',
    href: 'https://github.com/thaibalong7/markdown-viewer-chrome-extension'
  }),
  Object.freeze({
    id: 'support',
    label: 'Report an issue',
    description: 'Ask for help or report a reproducible problem.',
    href: 'https://github.com/thaibalong7/markdown-viewer-chrome-extension/issues'
  }),
  Object.freeze({
    id: 'privacy',
    label: 'Privacy policy',
    description: 'Review how local files and extension data are handled.',
    href: 'https://thaibalong7.github.io/markdown-viewer-chrome-extension/privacy/'
  }),
  Object.freeze({
    id: 'license',
    label: 'MIT License',
    description: 'Read the open-source license for Markdown Plus.',
    href: 'https://github.com/thaibalong7/markdown-viewer-chrome-extension/blob/master/LICENSE'
  })
])

export function getExtensionMetadata(runtime = globalThis.chrome?.runtime) {
  const getManifest = runtime?.getManifest
  if (typeof getManifest !== 'function') {
    return {
      version: 'Development build',
      manifestLabel: 'Chrome extension',
      minimumChromeLabel: ''
    }
  }

  const manifest = getManifest.call(runtime) || {}
  const version = String(manifest.version_name || manifest.version || '').trim()
  const manifestVersion = Number(manifest.manifest_version)
  const minimumChromeVersion = String(manifest.minimum_chrome_version || '').trim()

  return {
    version: version || 'Development build',
    manifestLabel: Number.isFinite(manifestVersion)
      ? `Manifest V${manifestVersion}`
      : 'Chrome extension',
    minimumChromeLabel: minimumChromeVersion
      ? `Chrome ${minimumChromeVersion}+`
      : ''
  }
}
