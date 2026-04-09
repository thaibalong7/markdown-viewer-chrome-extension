import { codeHighlightPlugin } from './core/code-highlight.plugin.js'
import { taskListPlugin } from './core/task-list.plugin.js'
import { anchorHeadingPlugin } from './core/anchor-heading.plugin.js'
import { tableEnhancePlugin } from './core/table-enhance.plugin.js'
import { emojiPlugin } from './optional/emoji.plugin.js'
import { footnotePlugin } from './optional/footnote.plugin.js'
import { mathPlugin } from './optional/math.plugin.js'
import { mermaidPlugin } from './optional/mermaid.plugin.js'
import { PLUGIN_HOOKS, getDefaultPluginSettings } from './plugin-types.js'

const REGISTERED_PLUGINS = [
  codeHighlightPlugin,
  taskListPlugin,
  anchorHeadingPlugin,
  tableEnhancePlugin,
  emojiPlugin,
  footnotePlugin,
  mathPlugin,
  mermaidPlugin
]

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

export function createPluginManager({ settings } = {}) {
  const mergedPluginSettings = {
    ...getDefaultPluginSettings(),
    ...(settings?.plugins || {})
  }

  const activePlugins = REGISTERED_PLUGINS.filter((plugin) => isEnabledPlugin(plugin, mergedPluginSettings))

  return {
    getActivePlugins() {
      return [...activePlugins]
    },
    extendMarkdown(markdownEngine, context = {}) {
      runPluginHook({
        plugins: activePlugins,
        hook: PLUGIN_HOOKS.EXTEND_MARKDOWN,
        initialValue: null,
        context: {
          ...context,
          markdownEngine,
          pluginSettings: mergedPluginSettings
        }
      })
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
