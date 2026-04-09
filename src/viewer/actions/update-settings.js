import { deepMerge } from '../../shared/deep-merge.js'

export function createUpdateSettingsAction({
  settingsState,
  onApply,
  onPersist,
  onError,
  debounceMs = 250
}) {
  let persistTimer = null
  let pendingPersistPatch = {}

  function flushPersist() {
    if (!onPersist) return
    const patch = pendingPersistPatch
    pendingPersistPatch = {}
    Promise.resolve(onPersist(patch)).catch((error) => {
      if (typeof onError === 'function') onError(error)
    })
  }

  function schedulePersist(partial) {
    pendingPersistPatch = deepMerge(pendingPersistPatch, partial)
    if (persistTimer) {
      clearTimeout(persistTimer)
    }
    persistTimer = setTimeout(() => {
      persistTimer = null
      flushPersist()
    }, debounceMs)
  }

  function update(partial = {}) {
    const nextSettings = settingsState.merge(partial)
    if (typeof onApply === 'function') {
      onApply(nextSettings, partial)
    }
    schedulePersist(partial)
    return nextSettings
  }

  function destroy() {
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
      flushPersist()
    }
  }

  function cancelPending() {
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    pendingPersistPatch = {}
  }

  return {
    update,
    cancelPending,
    destroy
  }
}
