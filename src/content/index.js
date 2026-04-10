import { bootstrap } from './bootstrap.js'
import { logger } from '../shared/logger.js'
import katexCss from 'katex/dist/katex.min.css?inline'
import baseCss from '../viewer/styles/base.scss?inline'
import layoutCss from '../viewer/styles/layout.scss?inline'
import contentCss from '../viewer/styles/content.scss?inline'
import tocCss from '../viewer/styles/toc.scss?inline'
import settingsCss from '../viewer/styles/settings.scss?inline'

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
    tocCss,
    settingsCss
  }
}

(async function start() {
  try {
    await bootstrap({ getViewerStyles })
  } catch (error) {
    logger.error('Failed to start content script.', error)
  }
})()
