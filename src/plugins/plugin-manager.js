import { codeHighlightPlugin } from './core/code-highlight.plugin.js'
import { taskListPlugin } from './core/task-list.plugin.js'
import { anchorHeadingPlugin } from './core/anchor-heading.plugin.js'
import { tableEnhancePlugin } from './core/table-enhance.plugin.js'
import { PLUGIN_HOOKS, PLUGIN_IDS, mergePluginSettings } from './plugin-types.js'
import { logger } from '../shared/logger.js'

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

function getErrorName(error) {
  if (error && typeof error === 'object' && typeof error.name === 'string') {
    return error.name
  }
  return typeof error
}

function reportPluginFailure({ plugin, pluginId, hook, error, onPluginWarning }) {
  const resolvedPluginId = String(pluginId || plugin?.id || 'unknown')
  const warning = { pluginId: resolvedPluginId, hook }

  logger.warn('Markdown plugin failed; continuing without it.', {
    pluginId: resolvedPluginId,
    hook,
    errorName: getErrorName(error)
  })

  try {
    onPluginWarning?.(warning)
  } catch (warningError) {
    logger.warn('Could not surface Markdown plugin warning.', {
      pluginId: resolvedPluginId,
      hook,
      errorName: getErrorName(warningError)
    })
  }
}

function runPluginHook({ plugins, failedPlugins, hook, initialValue, context }) {
  let currentValue = initialValue

  for (const plugin of plugins) {
    if (failedPlugins.has(plugin)) continue
    const handler = plugin?.[hook]
    if (typeof handler !== 'function') continue
    try {
      const nextValue = handler({
        ...context,
        value: currentValue
      })
      currentValue = normalizeValue(nextValue, currentValue)
    } catch (error) {
      failedPlugins.add(plugin)
      reportPluginFailure({
        plugin,
        hook,
        error,
        onPluginWarning: context?.onPluginWarning
      })
    }
  }

  return currentValue
}

function isEnabledPlugin(plugin, pluginSettings) {
  const state = pluginSettings?.[plugin.id]
  if (!state) return false
  return state.enabled !== false
}

export async function createPluginManager({
  settings,
  corePlugins = CORE_PLUGINS,
  optionalPluginLoaders = OPTIONAL_PLUGIN_LOADERS,
  onPluginWarning
} = {}) {
  const mergedPluginSettings = mergePluginSettings(settings?.plugins)
  const failedPlugins = new Set()

  const activePlugins = corePlugins.filter((plugin) => isEnabledPlugin(plugin, mergedPluginSettings))
  const optionalPluginIds = Object.keys(optionalPluginLoaders).filter((pluginId) => {
    const state = mergedPluginSettings?.[pluginId]
    return state?.enabled === true
  })

  if (optionalPluginIds.length) {
    const optionalPlugins = await Promise.all(
      optionalPluginIds.map(async (pluginId) => {
        try {
          const plugin = await optionalPluginLoaders[pluginId]()
          if (!plugin) throw new Error('Plugin loader returned no plugin.')
          return plugin
        } catch (error) {
          reportPluginFailure({
            pluginId,
            hook: 'load',
            error,
            onPluginWarning
          })
          return null
        }
      })
    )
    for (const plugin of optionalPlugins) {
      if (plugin) activePlugins.push(plugin)
    }
  }

  return {
    getActivePlugins() {
      return activePlugins.filter((plugin) => !failedPlugins.has(plugin))
    },
    async extendMarkdown(markdownEngine, context = {}) {
      let failedPluginCount = 0
      const baseContext = {
        ...context,
        markdownEngine,
        pluginSettings: mergedPluginSettings
      }
      for (const plugin of activePlugins) {
        if (failedPlugins.has(plugin)) continue
        const handler = plugin?.[PLUGIN_HOOKS.EXTEND_MARKDOWN]
        if (typeof handler !== 'function') continue
        try {
          await Promise.resolve(
            handler({
              ...baseContext,
              value: null
            })
          )
        } catch (error) {
          failedPlugins.add(plugin)
          failedPluginCount += 1
          reportPluginFailure({
            plugin,
            hook: PLUGIN_HOOKS.EXTEND_MARKDOWN,
            error,
            onPluginWarning: context?.onPluginWarning
          })
        }
      }
      return { failedPluginCount }
    },
    preprocessMarkdown(markdown, context = {}) {
      return runPluginHook({
        plugins: activePlugins,
        failedPlugins,
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
        failedPlugins,
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
      const cleanups = []
      for (const plugin of activePlugins) {
        if (failedPlugins.has(plugin)) continue
        const handler = plugin?.[PLUGIN_HOOKS.AFTER_RENDER]
        if (typeof handler !== 'function') continue
        try {
          const cleanup = await Promise.resolve(handler(baseContext))
          if (typeof cleanup === 'function') cleanups.push({ plugin, cleanup })
        } catch (error) {
          if (error?.name === 'AbortError' && context?.signal?.aborted) throw error
          failedPlugins.add(plugin)
          reportPluginFailure({
            plugin,
            hook: PLUGIN_HOOKS.AFTER_RENDER,
            error,
            onPluginWarning: context?.onPluginWarning
          })
        }
      }
      if (!cleanups.length) return undefined
      return () => {
        for (const { plugin, cleanup } of cleanups.splice(0)) {
          try {
            cleanup()
          } catch (error) {
            failedPlugins.add(plugin)
            reportPluginFailure({
              plugin,
              hook: 'cleanup',
              error,
              onPluginWarning: context?.onPluginWarning
            })
          }
        }
      }
    }
  }
}
