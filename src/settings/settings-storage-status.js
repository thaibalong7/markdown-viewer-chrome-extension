let warning = null
const listeners = new Set()

export function getSettingsStorageWarning() { return warning }
export function subscribeSettingsStorageWarning(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function setSettingsStorageWarning(next = null) {
  if (warning === next) return
  warning = next
  for (const listener of listeners) listener()
}
