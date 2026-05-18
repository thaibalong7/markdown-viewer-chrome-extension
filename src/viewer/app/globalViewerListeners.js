/**
 * @param {object} options
 * @param {HTMLElement | ShadowRoot} options.container
 * @param {() => boolean} options.isDestroyed
 * @param {() => boolean} options.hasUnsavedChanges
 * @param {() => boolean} options.canSave
 * @param {() => void} options.onSave
 */
export function createGlobalViewerListeners({
  container,
  isDestroyed,
  hasUnsavedChanges,
  canSave,
  onSave
}) {
  /** @type {HTMLElement | ShadowRoot | Document | null} */
  let keydownRoot = null

  const onBeforeUnload = (event) => {
    if (!hasUnsavedChanges()) return
    event.preventDefault()
    event.returnValue = ''
  }

  const onGlobalKeyDown = (event) => {
    if (isDestroyed() || !canSave()) return
    const key = String(event.key || '').toLowerCase()
    if (key !== 's' || !(event.ctrlKey || event.metaKey)) return
    event.preventDefault()
    event.stopPropagation()
    onSave()
  }

  function bind() {
    unbind()
    window.addEventListener('beforeunload', onBeforeUnload)
    const root =
      container instanceof ShadowRoot
        ? container
        : container?.host instanceof HTMLElement
          ? container.host.getRootNode()
          : document
    keydownRoot = root instanceof ShadowRoot || root instanceof Document ? root : document
    keydownRoot.addEventListener('keydown', onGlobalKeyDown, true)
  }

  function unbind() {
    window.removeEventListener('beforeunload', onBeforeUnload)
    if (keydownRoot) {
      keydownRoot.removeEventListener('keydown', onGlobalKeyDown, true)
      keydownRoot = null
    }
  }

  return { bind, unbind }
}
