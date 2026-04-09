import { bootstrap } from './bootstrap.js'
import { logger } from '../shared/logger.js'
import katexCss from 'katex/dist/katex.min.css?inline'

let viewerStylesPromise = null

/** Fallback: if any inlined CSS still uses root `/assets/…`, rewrite to the extension package (Vite `base: './'` fixes preloads; KaTeX fonts use `import.meta.url` in build). */
function extensionizeKatexFontUrls(css) {
  const assetRoot = chrome.runtime.getURL('assets/')
  return String(css || '').replace(/url\(\/assets\//g, `url(${assetRoot}`)
}

async function fetchStyleText(path) {
  const response = await fetch(chrome.runtime.getURL(path))
  if (!response.ok) {
    throw new Error(`Failed to fetch style: ${path}`)
  }
  return response.text()
}

async function getViewerStyles() {
  if (!viewerStylesPromise) {
    viewerStylesPromise = Promise.all([
      fetchStyleText('src/viewer/styles/base.css'),
      fetchStyleText('src/viewer/styles/layout.css'),
      fetchStyleText('src/viewer/styles/content.css'),
      fetchStyleText('src/viewer/styles/toc.css'),
      fetchStyleText('src/viewer/styles/settings.css')
    ]).then(([baseCss, layoutCss, contentCss, tocCss, settingsCss]) => ({
      baseCss,
      layoutCss,
      contentCss: `${contentCss}\n${extensionizeKatexFontUrls(katexCss)}`,
      tocCss,
      settingsCss
    }))
  }

  return viewerStylesPromise
}

(async function start() {
  try {
    await bootstrap({ getViewerStyles })
  } catch (error) {
    logger.error('Failed to start content script.', error)
  }
})()
