import React from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { FloatingActions } from '../FloatingActions.jsx'
import { ExitEditConfirmation } from '../ExitEditConfirmation.jsx'

const mocks = vi.hoisted(() => ({
  state: { enabled: true, dirty: true },
  dispatch: vi.fn(),
  setState: vi.fn()
}))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal(),
  useState: (initial) => [initial, mocks.setState],
  useEffect: () => {},
  useMemo: (create) => create(),
  useCallback: (callback) => callback,
  useRef: () => ({ current: null })
}))
vi.mock('../../contexts/EditorContext.jsx', () => ({
  useEditorState: () => mocks.state,
  useEditorDispatch: () => mocks.dispatch
}))
vi.mock('../../contexts/ToastContext.jsx', () => ({ useToast: () => ({ showToast: vi.fn() }) }))

function find(element, predicate) {
  if (!React.isValidElement(element)) return undefined
  if (predicate(element)) return element
  for (const child of React.Children.toArray(element.props.children)) {
    const found = find(child, predicate)
    if (found) return found
  }
}

function actions(saveStatus = 'saved') {
  const tree = FloatingActions({
    getCurrentFileUrl: () => 'file:///docs/README.md',
    getSettings: () => ({ editor: { enabled: true } }),
    documentUiState: { capabilities: { edit: true } },
    saveStatus
  })
  return {
    edit: find(tree, (node) => node.props['aria-label'] === 'Exit edit mode'),
    confirmation: find(tree, (node) => node.type === ExitEditConfirmation)
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.state = { enabled: true, dirty: true }
})

it('keeps a dirty draft active until an explicit destructive confirmation', () => {
  const { edit, confirmation } = actions()
  edit.props.onClick()
  expect(mocks.setState).toHaveBeenCalledWith(true)
  expect(mocks.dispatch).not.toHaveBeenCalled()
  confirmation.props.onCancel()
  expect(mocks.dispatch).not.toHaveBeenCalled()
  confirmation.props.onConfirm()
  expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'EXIT_EDIT' })
})

it('exits a clean editor directly and blocks exit while saving', () => {
  mocks.state.dirty = false
  actions().edit.props.onClick()
  expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'TOGGLE_EDIT' })
  vi.clearAllMocks()
  mocks.state.dirty = true
  const { edit, confirmation } = actions('saving')
  edit.props.onClick()
  confirmation.props.onConfirm()
  expect(confirmation.props.busy).toBe(true)
  expect(mocks.dispatch).not.toHaveBeenCalled()
  expect(mocks.setState).not.toHaveBeenCalled()
})
