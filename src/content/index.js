import { bootstrap } from './bootstrap.js'
import { logger } from '../shared/logger.js'
import { MESSAGE_TYPES } from '../messaging/index.js'
import { teardownViewerRoot } from './page-overrider.js'
import katexCss from 'katex/dist/katex.min.css?inline'
import baseCss from '../viewer/styles/base.scss?inline'
import layoutCss from '../viewer/styles/layout.scss?inline'
import contentCss from '../viewer/styles/content.scss?inline'
import tocCss from '../viewer/styles/toc.scss?inline'

/** Fallback: if any inlined CSS still uses root `/assets/…`, rewrite to the extension package (Vite `base: './'` fixes preloads; KaTeX fonts use `import.meta.url` in build). */
function extensionizeKatexFontUrls(css) {
  const assetRoot = chrome.runtime.getURL('assets/')
  return String(css || '').replace(/url\(\/assets\//g, `url(${assetRoot}`)
}

/** Viewer SCSS is compiled by Vite and bundled into the content script (no separate CSS under `src/` or `fetch` at runtime). */
function getViewerStyles() {
  return {
    baseCss,
    layoutCss,
    contentCss: `${contentCss}\n${extensionizeKatexFontUrls(katexCss)}`,
    tocCss
  }
}

(async function start() {
  let app = null

  async function mountViewer() {
    app = await bootstrap({ getViewerStyles })
  }

  try {
    await mountViewer()
  } catch (error) {
    logger.error('Failed to start content script.', error)
  }

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
})()
