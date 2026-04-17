import { codeHighlightPlugin } from './core/code-highlight.plugin.js'
import { taskListPlugin } from './core/task-list.plugin.js'
import { anchorHeadingPlugin } from './core/anchor-heading.plugin.js'
import { tableEnhancePlugin } from './core/table-enhance.plugin.js'
import { PLUGIN_HOOKS, PLUGIN_IDS, getDefaultPluginSettings } from './plugin-types.js'

const CORE_PLUGINS = [
  codeHighlightPlugin,
  taskListPlugin,
  anchorHeadingPlugin,
  tableEnhancePlugin
]

const OPTIONAL_PLUGIN_LOADERS = {
  [PLUGIN_IDS.EMOJI]: () => import('./optional/emoji.plugin.js').then((module) => module.emojiPlugin),
  [PLUGIN_IDS.FOOTNOTE]: () =>
    import('./optional/footnote.plugin.js').then((module) => module.footnotePlugin),
  [PLUGIN_IDS.MATH]: () => import('./optional/math.plugin.js').then((module) => module.mathPlugin),
  [PLUGIN_IDS.MERMAID]: () =>
    import('./optional/mermaid.plugin.js').then((module) => module.mermaidPlugin)
}

function normalizeValue(nextValue, fallbackValue) {
  return typeof nextValue === 'undefined' ? fallbackValue : nextValue
}

function runPluginHook({ plugins, hook, initialValue, context }) {
  let currentValue = initialValue

  for (const plugin of plugins) {
    const handler = plugin?.[hook]
    if (typeof handler !== 'function') continue
    const nextValue = handler({
      ...context,
      value: currentValue
    })
    currentValue = normalizeValue(nextValue, currentValue)
  }

  return currentValue
}

function isEnabledPlugin(plugin, pluginSettings) {
  const state = pluginSettings?.[plugin.id]
  if (!state) return false
  return state.enabled !== false
}

export async function createPluginManager({ settings } = {}) {
  const mergedPluginSettings = {
    ...getDefaultPluginSettings(),
    ...(settings?.plugins || {})
  }

  const activePlugins = CORE_PLUGINS.filter((plugin) => isEnabledPlugin(plugin, mergedPluginSettings))
  const optionalPluginIds = Object.keys(OPTIONAL_PLUGIN_LOADERS).filter((pluginId) => {
    const state = mergedPluginSettings?.[pluginId]
    return state?.enabled === true
  })

  if (optionalPluginIds.length) {
    const optionalPlugins = await Promise.all(
      optionalPluginIds.map((pluginId) => OPTIONAL_PLUGIN_LOADERS[pluginId]())
    )
    for (const plugin of optionalPlugins) {
      if (plugin) activePlugins.push(plugin)
    }
  }

  return {
    getActivePlugins() {
      return [...activePlugins]
    },
    async extendMarkdown(markdownEngine, context = {}) {
      const baseContext = {
        ...context,
        markdownEngine,
        pluginSettings: mergedPluginSettings
      }
      for (const plugin of activePlugins) {
        const handler = plugin?.[PLUGIN_HOOKS.EXTEND_MARKDOWN]
        if (typeof handler !== 'function') continue
        await Promise.resolve(
          handler({
            ...baseContext,
            value: null
          })
        )
      }
    },
    preprocessMarkdown(markdown, context = {}) {
      return runPluginHook({
        plugins: activePlugins,
        hook: PLUGIN_HOOKS.PREPROCESS_MARKDOWN,
        initialValue: markdown,
        context: {
          ...context,
          pluginSettings: mergedPluginSettings
        }
      })
    },
    postprocessHtml(html, context = {}) {
      return runPluginHook({
        plugins: activePlugins,
        hook: PLUGIN_HOOKS.POSTPROCESS_HTML,
        initialValue: html,
        context: {
          ...context,
          pluginSettings: mergedPluginSettings
        }
      })
    },
    async afterRender(context = {}) {
      const baseContext = {
        ...context,
        pluginSettings: mergedPluginSettings
      }
      for (const plugin of activePlugins) {
        const handler = plugin?.[PLUGIN_HOOKS.AFTER_RENDER]
        if (typeof handler !== 'function') continue
        await Promise.resolve(handler(baseContext))
      }
    }
  }
}
