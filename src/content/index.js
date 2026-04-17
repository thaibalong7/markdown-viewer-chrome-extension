import { logger } from '../shared/logger.js'
import { pathnameHasMarkdownExtension } from '../shared/markdown-detect.js'

(async function start() {
  try {
    const protocol = window.location?.protocol || ''
    const pathname = window.location?.pathname || ''
    const isLocalMarkdownFile = protocol === 'file:' && pathnameHasMarkdownExtension(pathname)
    if (!isLocalMarkdownFile) return

    const { startViewer } = await import('./viewer-loader.js')
    await startViewer()
  } catch (error) {
    logger.error('Failed to start content script.', error)
  }
})()
