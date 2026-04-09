/**
 * @param {{
 *   applyOpenState?: (open: boolean) => void,
 *   settingsButton?: HTMLButtonElement | null
 * }} opts
 */
export function createOpenSettingsAction({ applyOpenState, settingsButton } = {}) {
  let isOpen = false

  function syncUi() {
    if (typeof applyOpenState === 'function') applyOpenState(isOpen)
    if (settingsButton) {
      settingsButton.setAttribute('aria-expanded', String(isOpen))
    }
  }

  function open() {
    isOpen = true
    syncUi()
  }

  function close() {
    isOpen = false
    syncUi()
  }

  function toggle() {
    isOpen = !isOpen
    syncUi()
  }

  syncUi()

  return {
    open,
    close,
    toggle,
    isOpen: () => isOpen
  }
}
