import { bootstrap } from './bootstrap.js'
import { logger } from '../shared/logger.js'
import { MESSAGE_TYPES } from '../messaging/index.js'
import { teardownViewerRoot } from './page-overrider.js'
import baseCss from '../viewer/styles/base.scss?inline'
import layoutCss from '../viewer/styles/layout.scss?inline'
import contentCss from '../viewer/styles/content.scss?inline'
import tocCss from '../viewer/styles/toc.scss?inline'
import explorerCss from '../viewer/styles/explorer.scss?inline'

/** Viewer SCSS is compiled by Vite and bundled into the content script (no separate CSS under `src/` or `fetch` at runtime). */
function getViewerStyles() {
  return {
    baseCss,
    layoutCss,
    contentCss,
    tocCss,
    explorerCss
  }
}

export async function startViewer() {
  let app = null

  async function mountViewer() {
    app = await bootstrap({ getViewerStyles })
  }

  await mountViewer()

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== MESSAGE_TYPES.SETTINGS_UPDATED) return
    const nextSettings = message?.payload
    if (!nextSettings) return

    if (nextSettings.enabled === false) {
      try {
        if (app) {
          app.destroy()
          app = null
        }
      } catch (error) {
        logger.warn('Failed to destroy app while disabling viewer.', error)
      } finally {
        teardownViewerRoot()
      }
      return
    }

    if (app) {
      void app.updateSettings(nextSettings)
      return
    }

    void mountViewer().catch((error) => {
      logger.error('Failed to mount viewer after settings update.', error)
    })
  })
}
