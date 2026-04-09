import { getDefaultPluginSettings } from '../../plugins/plugin-types.js'
import { deepMerge } from '../../shared/deep-merge.js'

export function createSettingsState(initialSettings = {}) {
  let current = deepMerge({}, initialSettings)

  return {
    get() {
      return current
    },
    merge(partial = {}) {
      current = deepMerge(current, partial)
      return current
    },
    replace(next = {}) {
      current = deepMerge({}, next)
      return current
    }
  }
}

export function createPluginState(settings = {}) {
  const merged = {
    ...getDefaultPluginSettings(),
    ...(settings?.plugins || {})
  }

  return {
    get() {
      return { ...merged }
    }
  }
}
