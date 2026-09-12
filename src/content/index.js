import { logger } from '../shared/logger.js'
import { isDirectActivationUrl } from '../shared/file-types.js'

(async function start() {
  try {
    if (!isDirectActivationUrl(window.location?.href || '')) return

    const { startViewer } = await import('./viewer-loader.js')
    await startViewer()
  } catch (error) {
    logger.error('Failed to start content script.', error)
  }
})()
