import { getDefaultPluginSettings } from '../../../plugins/plugin-types.js'

const PLUGIN_LABELS = {
  codeHighlight: 'Code highlight',
  taskList: 'Task list',
  anchorHeading: 'Anchor heading',
  tableEnhance: 'Table enhance',
  emoji: 'Emoji',
  footnote: 'Footnotes',
  math: 'Math (KaTeX)',
  mermaid: 'Mermaid diagrams'
}

function buildPluginField({ pluginId, enabled }) {
  const wrapper = document.createElement('label')
  wrapper.className = 'mdp-settings__field mdp-settings__field--inline'
  wrapper.dataset.pluginId = pluginId

  const input = document.createElement('input')
  input.type = 'checkbox'
  input.checked = enabled !== false

  const label = document.createElement('span')
  label.className = 'mdp-settings__label'
  label.textContent = PLUGIN_LABELS[pluginId] || pluginId

  wrapper.appendChild(input)
  wrapper.appendChild(label)

  return { wrapper, input }
}

export function buildPluginsSettingsPanel({ settings, onChange }) {
  const root = document.createElement('div')
  root.className = 'mdp-settings__tab-panel-inner'

  const defaultPlugins = getDefaultPluginSettings()
  const mergedPlugins = {
    ...defaultPlugins,
    ...(settings?.plugins || {})
  }

  const fields = new Map()
  for (const pluginId of Object.keys(defaultPlugins)) {
    const field = buildPluginField({
      pluginId,
      enabled: mergedPlugins?.[pluginId]?.enabled
    })
    fields.set(pluginId, field.input)
    root.appendChild(field.wrapper)
  }

  const emitChange = () => {
    if (typeof onChange !== 'function') return
    const pluginsPatch = {}
    for (const [pluginId, input] of fields.entries()) {
      pluginsPatch[pluginId] = { enabled: input.checked }
    }
    onChange({
      plugins: pluginsPatch
    })
  }

  for (const input of fields.values()) {
    input.addEventListener('change', emitChange)
  }
  return {
    element: root,
    update(nextSettings) {
      const nextMerged = {
        ...defaultPlugins,
        ...(nextSettings?.plugins || {})
      }
      for (const [pluginId, input] of fields.entries()) {
        input.checked = nextMerged?.[pluginId]?.enabled !== false
      }
    },
    destroy() {
      for (const input of fields.values()) {
        input.removeEventListener('change', emitChange)
      }
    }
  }
}
