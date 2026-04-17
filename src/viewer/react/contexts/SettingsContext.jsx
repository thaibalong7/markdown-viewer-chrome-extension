import React, { createContext, useContext, useMemo, useReducer } from 'react'

const SettingsStateContext = createContext(null)
const SettingsDispatchContext = createContext(null)

function settingsReducer(state, action) {
  switch (action?.type) {
    case 'SET_SETTINGS':
      return action.payload ?? state
    case 'PATCH_SETTINGS':
      return {
        ...(state || {}),
        ...(action.payload || {})
      }
    default:
      return state
  }
}

export function SettingsProvider({ initialSettings, children }) {
  const [settings, dispatch] = useReducer(settingsReducer, initialSettings || {})
  const stateValue = useMemo(() => settings, [settings])

  return (
    <SettingsStateContext.Provider value={stateValue}>
      <SettingsDispatchContext.Provider value={dispatch}>
        {children}
      </SettingsDispatchContext.Provider>
    </SettingsStateContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsStateContext)
  if (context === null) {
    throw new Error('useSettings must be used within SettingsProvider.')
  }
  return context
}

export function useSettingsDispatch() {
  const context = useContext(SettingsDispatchContext)
  if (context === null) {
    throw new Error('useSettingsDispatch must be used within SettingsProvider.')
  }
  return context
}
