export function getSearchShortcut(event) {
  if (event.isComposing || event.altKey || String(event.key).toLowerCase() !== 'f') return null
  if (event.ctrlKey && event.shiftKey && !event.metaKey) return 'workspace'
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey) return 'document'
  return null
}
