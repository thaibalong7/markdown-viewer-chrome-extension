import { createPluginManager } from '../../plugins/plugin-manager.js'
import { createMarkdownEngine, injectSourceLineMapping } from './markdown-engine.js'

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
  return JSON.stringify(
    stableSortObject({
      plugins: settings?.plugins || {},
      themePreset: settings?.theme?.preset || 'light'
    })
  )
}

export async function createRenderContext(settings = {}, runtimeContext = {}) {
  const pluginManager = await createPluginManager({ settings })
  const markdownEngine = createMarkdownEngine()
  const context = { settings, ...runtimeContext }

  await pluginManager.extendMarkdown(markdownEngine, context)
  injectSourceLineMapping(markdownEngine.instance)

  return {
    pluginManager,
    markdownEngine,
    settingsHash: createRenderSettingsHash(settings),
    runtimeContext: context
  }
}
