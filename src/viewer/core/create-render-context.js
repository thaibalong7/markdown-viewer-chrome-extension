import { createPluginManager } from '../../plugins/plugin-manager.js'
import { getDefaultPluginSettings } from '../../plugins/plugin-types.js'
import { createMarkdownEngine, injectSourceLineMapping } from './markdown-engine.js'

const INTERNAL_RUNTIME_KEYS = new Set(['renderContextCache'])

function stableSortObject(value) {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(stableSortObject)
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = stableSortObject(value[key])
      return acc
    }, {})
}

export function createRenderSettingsHash(settings = {}) {
  const effectivePluginSettings = {
    ...getDefaultPluginSettings(),
    ...(settings?.plugins || {})
  }
  return JSON.stringify(
    stableSortObject({
      plugins: effectivePluginSettings,
      themePreset: settings?.theme?.preset || 'light'
    })
  )
}

function createRuntimeContext(settings, runtimeContext) {
  const context = { settings }
  for (const [key, value] of Object.entries(runtimeContext || {})) {
    if (INTERNAL_RUNTIME_KEYS.has(key)) continue
    context[key] = value
  }
  return context
}

function getCachedRenderContext(cache, settingsHash, runtimeContext) {
  if (!cache || typeof cache.get !== 'function') return null
  const cached = cache.get(settingsHash)
  if (!cached) return null
  return {
    ...cached,
    runtimeContext
  }
}

function storeCachedRenderContext(cache, settingsHash, context) {
  if (!cache || typeof cache.set !== 'function') return
  if (typeof cache.clear === 'function') cache.clear()
  cache.set(settingsHash, {
    pluginManager: context.pluginManager,
    markdownEngine: context.markdownEngine,
    settingsHash
  })
}

export async function createRenderContext(settings = {}, runtimeContext = {}) {
  const settingsHash = createRenderSettingsHash(settings)
  const context = createRuntimeContext(settings, runtimeContext)
  const cached = getCachedRenderContext(runtimeContext?.renderContextCache, settingsHash, context)
  if (cached) return cached

  const pluginManager = await createPluginManager({ settings })
  const markdownEngine = createMarkdownEngine()

  await pluginManager.extendMarkdown(markdownEngine, context)
  injectSourceLineMapping(markdownEngine.instance)

  const nextContext = {
    pluginManager,
    markdownEngine,
    settingsHash,
    runtimeContext: context
  }
  storeCachedRenderContext(runtimeContext?.renderContextCache, settingsHash, nextContext)
  return nextContext
}
