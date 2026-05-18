import React, { createContext, useContext, useReducer } from 'react'

const DEFAULT_INITIAL_STATE = {
  enabled: false,
  mode: 'split',
  sidebarVisible: true,
  _savedSidebarVisible: null,
  dirty: false
}

export function editorReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_EDIT':
      if (state.enabled) {
        return {
          ...state,
          enabled: false,
          dirty: false,
          sidebarVisible: state._savedSidebarVisible ?? state.sidebarVisible,
          _savedSidebarVisible: null
        }
      }
      return {
        ...state,
        enabled: true,
        mode: 'split',
        _savedSidebarVisible: state.sidebarVisible,
        sidebarVisible: false
      }

    case 'TOGGLE_SIDEBAR':
      if (state.enabled) return state
      return { ...state, sidebarVisible: !state.sidebarVisible }

    case 'SET_MODE':
      return { ...state, mode: action.payload }

    case 'TOGGLE_FOCUS':
      if (!state.enabled) return state
      return {
        ...state,
        mode: state.mode === 'focus' ? 'split' : 'focus'
      }

    case 'MARK_DIRTY':
      return state.dirty ? state : { ...state, dirty: true }

    case 'MARK_CLEAN':
      return state.dirty ? { ...state, dirty: false } : state

    default:
      return state
  }
}

const EditorStateContext = createContext(DEFAULT_INITIAL_STATE)
const EditorDispatchContext = createContext(() => {})

export function createInitialState(initialSidebarVisible) {
  const sidebarVisible = initialSidebarVisible !== false
  return { ...DEFAULT_INITIAL_STATE, sidebarVisible }
}

export function EditorProvider({ children, initialSidebarVisible = true }) {
  const [state, dispatch] = useReducer(
    editorReducer,
    initialSidebarVisible,
    createInitialState
  )
  return (
    <EditorStateContext.Provider value={state}>
      <EditorDispatchContext.Provider value={dispatch}>
        {children}
      </EditorDispatchContext.Provider>
    </EditorStateContext.Provider>
  )
}

export function useEditorState() {
  return useContext(EditorStateContext)
}

export function useEditorDispatch() {
  return useContext(EditorDispatchContext)
}
