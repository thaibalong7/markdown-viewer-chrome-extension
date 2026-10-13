import { getFileTypeFromUrl } from '../../shared/file-types.js'
import { logger } from '../../shared/logger.js'
import { readLocalTextResource } from './document-loader.js'

// Operate only on sanitized <img> nodes. SVG source stays in an image resource.
export function prepareMarkdownImages({ articleEl, documentHref, signal }) {
  if (!documentHref || signal?.aborted) return () => {}
  const objectUrls = new Set()
  let disposed = false
  const cleanup = () => {
    if (disposed) return
    disposed = true
    signal?.removeEventListener('abort', cleanup)
    for (const url of objectUrls) URL.revokeObjectURL(url)
    objectUrls.clear()
  }
  signal?.addEventListener('abort', cleanup, { once: true })
  const resources = new Map()
  for (const image of articleEl.querySelectorAll('img[src]')) {
    const src = image.getAttribute('src')
    if (!src || src.trimStart().startsWith('//')) continue
    let url
    try {
      url = new URL(src, documentHref)
    } catch {
      continue
    }
    if (url.protocol !== 'file:' || getFileTypeFromUrl(url)?.id !== 'svg-image') continue
    // Viewer navigation keeps the entry URL stable; images use the active document.
    image.setAttribute('src', url.href)
    image.setAttribute('data-mdp-file-type', 'svg-image')
    const hash = url.hash
    url.hash = ''
    url.search = ''
    if (!resources.has(url.href)) {
      resources.set(url.href, (async () => {
        const text = await readLocalTextResource(url.href, { signal })
        if (disposed) return null
        const objectUrl = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }))
        objectUrls.add(objectUrl)
        return objectUrl
      })())
    }
    void resources.get(url.href).then((objectUrl) => {
      if (!disposed && objectUrl) image.setAttribute('src', `${objectUrl}${hash}`)
    }).catch((error) => {
      if (disposed || error?.name === 'AbortError') return
      // Retain the resolved image URL and the browser's alt-text fallback.
      logger.warn('Could not prepare a local Markdown SVG image.', { name: error?.name })
    })
  }
  return cleanup
}
