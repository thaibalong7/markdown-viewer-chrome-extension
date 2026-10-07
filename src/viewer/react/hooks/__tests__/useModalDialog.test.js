import { expect, it, vi } from 'vitest'
import { bindModalDialog } from '../useModalDialog.js'

function fixture() {
  const previousFocus = { isConnected: true, focus: vi.fn() }
  const cancelButton = { focus: vi.fn() }
  const dialog = new EventTarget()
  dialog.ownerDocument = { activeElement: previousFocus }
  dialog.showModal = vi.fn(() => { dialog.open = true })
  dialog.close = vi.fn(() => { dialog.open = false })
  const dismiss = vi.fn()
  return { dialog, previousFocus, cancelButton, dismiss }
}

it('uses native modality, focuses the safe action and restores focus on cleanup', () => {
  const { dialog, previousFocus, cancelButton, dismiss } = fixture()
  const trigger = { isConnected: true, focus: vi.fn() }
  const cleanup = bindModalDialog(dialog, cancelButton, trigger, dismiss)
  expect(dialog.showModal).toHaveBeenCalledOnce()
  expect(cancelButton.focus).toHaveBeenCalledWith({ preventScroll: true })
  cleanup()
  expect(dialog.close).toHaveBeenCalledOnce()
  expect(trigger.focus).toHaveBeenCalledWith({ preventScroll: true })
  expect(previousFocus.focus).not.toHaveBeenCalled()
  dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
  expect(dismiss).not.toHaveBeenCalled()
})

it('routes Escape and outside press to cancellation without discarding the draft', () => {
  const { dialog, cancelButton, dismiss } = fixture()
  const cleanup = bindModalDialog(dialog, cancelButton, null, dismiss)
  const cancel = new Event('cancel', { cancelable: true })
  dialog.dispatchEvent(cancel)
  expect(cancel.defaultPrevented).toBe(true)
  expect(dismiss).toHaveBeenCalledOnce()
  expect(dialog.close).not.toHaveBeenCalled()
  const inside = new Event('pointerdown')
  Object.defineProperty(inside, 'target', { value: cancelButton })
  dialog.dispatchEvent(inside)
  expect(dismiss).toHaveBeenCalledOnce()
  dialog.dispatchEvent(new Event('pointerdown'))
  expect(dismiss).toHaveBeenCalledTimes(2)
  cleanup()
})

it('falls back to previous focus and skips detached targets during teardown', () => {
  const { dialog, previousFocus, cancelButton, dismiss } = fixture()
  bindModalDialog(dialog, cancelButton, null, dismiss)()
  expect(previousFocus.focus).toHaveBeenCalledOnce()
  previousFocus.isConnected = false
  bindModalDialog(dialog, cancelButton, null, dismiss)()
  expect(previousFocus.focus).toHaveBeenCalledOnce()
})
