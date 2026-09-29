import { bootstrap } from './bootstrap.js'
import { logger } from '../shared/logger.js'
import { MESSAGE_TYPES } from '../messaging/index.js'
import { teardownViewerRoot } from './page-overrider.js'
import baseCss from '../viewer/styles/base.scss?inline'
import layoutCss from '../viewer/styles/layout.scss?inline'
import contentCss from '../viewer/styles/content.scss?inline'
import tocCss from '../viewer/styles/toc.scss?inline'
import explorerCss from '../viewer/styles/explorer.scss?inline'

const VIEWER_RUNTIME_KEY = Symbol.for('markdown-plus.viewer-runtime')

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
  const previousRuntime = globalThis[VIEWER_RUNTIME_KEY]
  const previousApp = await previousRuntime?.detach?.()
  let app = previousApp || null
  let disposed = false
  let listenerAttached = false
  let mountPromise = null
  let detachPromise = null

  function removeSettingsListener() {
    if (!listenerAttached) return
    chrome.runtime.onMessage.removeListener(onSettingsUpdated)
    listenerAttached = false
  }

  const runtime = {
    async detach() {
      if (detachPromise) return detachPromise
      detachPromise = (async () => {
        disposed = true
        removeSettingsListener()
        try {
          await mountPromise
        } catch (error) {
          // The original mount caller also handles this failure; the handoff
          // still continues so a later reinjection can recover the viewer.
          logger.debug('Previous viewer mount ended during reinjection.', error)
        }
        const detachedApp = app
        app = null
        if (globalThis[VIEWER_RUNTIME_KEY] === runtime) {
          delete globalThis[VIEWER_RUNTIME_KEY]
        }
        return detachedApp
      })()
      return detachPromise
    },
    async dispose() {
      if (disposed) return
      const detachedApp = await this.detach()
      try {
        detachedApp?.destroy()
      } finally {
        teardownViewerRoot()
      }
    }
  }

  globalThis[VIEWER_RUNTIME_KEY] = runtime

  async function mountViewer() {
    const existingApp = app
    const nextApp = await bootstrap({ getViewerStyles, existingApp })

    app = nextApp || null
    if (!nextApp && existingApp) {
      existingApp.destroy()
      teardownViewerRoot()
    }
  }

  function runMountViewer() {
    const operation = mountViewer()
    mountPromise = operation
    const clearMountPromise = () => {
      if (mountPromise === operation) mountPromise = null
    }
    void operation.then(clearMountPromise, clearMountPromise)
    return operation
  }

  function onSettingsUpdated(message) {
    if (disposed) return
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

    void runMountViewer().catch((error) => {
      logger.error('Failed to mount viewer after settings update.', error)
    })
  }

  try {
    await runMountViewer()
    if (disposed) return () => runtime.dispose()
    chrome.runtime.onMessage.addListener(onSettingsUpdated)
    listenerAttached = true
  } catch (error) {
    await runtime.dispose()
    throw error
  }

  return () => runtime.dispose()
}
