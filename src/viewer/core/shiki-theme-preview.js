import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { DEFAULT_SYNTAX_THEME_ID } from '../../theme/index.js'
import {
  loadShikiLanguageModule,
  loadShikiThemeModule
} from './shiki-config.js'

const PREVIEW_LANGUAGE_ID = 'javascript'

let previewHighlighterPromise = null
const previewThemeLoadPromises = new Map()

function resolveModuleDefault(moduleValue) {
  if (!moduleValue || typeof moduleValue !== 'object') return moduleValue
  return moduleValue.default || moduleValue
}

function getPreviewHighlighter() {
  if (!previewHighlighterPromise) {
    previewHighlighterPromise = Promise.all([
      loadShikiLanguageModule(PREVIEW_LANGUAGE_ID),
      loadShikiThemeModule(DEFAULT_SYNTAX_THEME_ID)
    ])
      .then(([languageModule, themeModule]) => createHighlighterCore({
        langs: [resolveModuleDefault(languageModule)],
        themes: [resolveModuleDefault(themeModule)],
        engine: createJavaScriptRegexEngine()
      }))
      .catch((error) => {
        previewHighlighterPromise = null
        previewThemeLoadPromises.clear()
        throw error
      })
  }
  return previewHighlighterPromise
}

async function ensurePreviewTheme(highlighter, themeId) {
  const requestedThemeId = String(themeId || DEFAULT_SYNTAX_THEME_ID)
  if (highlighter.getLoadedThemes().includes(requestedThemeId)) return requestedThemeId

  if (!previewThemeLoadPromises.has(requestedThemeId)) {
    const themeModule = loadShikiThemeModule(requestedThemeId)
    if (!themeModule) return DEFAULT_SYNTAX_THEME_ID

    previewThemeLoadPromises.set(
      requestedThemeId,
      Promise.resolve(themeModule)
        .then((moduleValue) => highlighter.loadTheme(resolveModuleDefault(moduleValue)))
        .then(() => {
          previewThemeLoadPromises.delete(requestedThemeId)
        })
        .catch((error) => {
          previewThemeLoadPromises.delete(requestedThemeId)
          throw error
        })
    )
  }

  await previewThemeLoadPromises.get(requestedThemeId)
  return requestedThemeId
}

/** Tokenize the Theme Studio sample without requiring the extension-page WASM CSP capability. */
export async function highlightSyntaxThemePreview(source, syntaxThemeId) {
  const highlighter = await getPreviewHighlighter()
  const themeId = await ensurePreviewTheme(highlighter, syntaxThemeId)
  return highlighter.codeToTokens(String(source ?? ''), {
    lang: PREVIEW_LANGUAGE_ID,
    theme: themeId
  })
}
