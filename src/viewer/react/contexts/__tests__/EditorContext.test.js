import { describe, expect, it } from 'vitest'
import { createInitialState, editorReducer } from '../EditorContext.jsx'

describe('EditorContext reducer', () => {
  it('enters edit mode through the explicit enter action', () => {
    const editing = editorReducer(createInitialState(true), { type: 'ENTER_EDIT' })

    expect(editing.enabled).toBe(true)
    expect(editing.sidebarVisible).toBe(false)
  })

  it('hides sidebar when entering edit mode and restores previous visibility on exit', () => {
    const initial = createInitialState(true)

    const editing = editorReducer(initial, { type: 'TOGGLE_EDIT' })
    expect(editing.enabled).toBe(true)
    expect(editing.sidebarVisible).toBe(false)
    expect(editing._savedSidebarVisible).toBe(true)

    const exited = editorReducer(editing, { type: 'TOGGLE_EDIT' })
    expect(exited.enabled).toBe(false)
    expect(exited.sidebarVisible).toBe(true)
    expect(exited._savedSidebarVisible).toBeNull()
  })

  it('keeps sidebar hidden if it was hidden before edit mode', () => {
    const initial = createInitialState(false)

    const editing = editorReducer(initial, { type: 'TOGGLE_EDIT' })
    expect(editing.enabled).toBe(true)
    expect(editing.sidebarVisible).toBe(false)
    expect(editing._savedSidebarVisible).toBe(false)

    const exited = editorReducer(editing, { type: 'TOGGLE_EDIT' })
    expect(exited.enabled).toBe(false)
    expect(exited.sidebarVisible).toBe(false)
  })

  it('ignores sidebar toggle while edit mode is enabled', () => {
    const editing = editorReducer(createInitialState(true), { type: 'TOGGLE_EDIT' })

    const next = editorReducer(editing, { type: 'TOGGLE_SIDEBAR' })
    expect(next).toBe(editing)
    expect(next.sidebarVisible).toBe(false)
  })

  it('toggles the outline independently outside edit mode', () => {
    const initial = createInitialState(true)
    const collapsed = editorReducer(initial, { type: 'TOGGLE_OUTLINE' })

    expect(collapsed.outlineVisible).toBe(false)
    expect(collapsed.sidebarVisible).toBe(true)
    expect(editorReducer(collapsed, { type: 'TOGGLE_OUTLINE' }).outlineVisible).toBe(true)
  })

  it('ignores outline toggle while edit mode is enabled', () => {
    const editing = editorReducer(createInitialState(true), { type: 'TOGGLE_EDIT' })

    expect(editorReducer(editing, { type: 'TOGGLE_OUTLINE' })).toBe(editing)
  })

  it('can force edit mode closed when document capabilities change', () => {
    const editing = editorReducer(createInitialState(true), { type: 'TOGGLE_EDIT' })
    const exited = editorReducer(editing, { type: 'EXIT_EDIT' })

    expect(exited.enabled).toBe(false)
    expect(exited.dirty).toBe(false)
    expect(exited.sidebarVisible).toBe(true)
  })
})
