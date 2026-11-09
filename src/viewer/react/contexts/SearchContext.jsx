import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { DEFAULT_SEARCH_OPTIONS } from '../../search/search-matcher.js'

const noop = () => {}
const DEFAULT = { options: DEFAULT_SEARCH_OPTIONS, toggleOption: noop, workspace: { open: false, query: '', request: 0 }, find: { open: false, query: '', request: 0 }, openWorkspace: noop, closeWorkspace: noop, openFind: noop, previewFind: noop, closeFind: noop, setFindQuery: noop, setWorkspaceQuery: noop, setSourceResult: noop }
const SearchContext = createContext(DEFAULT)

export function SearchProvider({ children }) {
  const [workspace, setWorkspace] = useState(DEFAULT.workspace)
  const [find, setFind] = useState(DEFAULT.find)
  const [sourceResult, setSourceResult] = useState(null)
  const [options, setOptions] = useState(DEFAULT_SEARCH_OPTIONS)
  const toggleOption = useCallback((name) => {
    if (!(name in DEFAULT_SEARCH_OPTIONS)) return
    setOptions((state) => ({ ...state, [name]: !state[name] }))
    setFind((state) => ({ ...state, targetRange: null }))
  }, [])
  const openWorkspace = useCallback((query) => {
    setFind((state) => ({ ...state, open: false, targetRange: null }))
    setWorkspace((state) => ({ open: true, query: typeof query === 'string' ? query : state.query, request: state.request + 1 }))
  }, [])
  const closeWorkspace = useCallback(() => {
    setWorkspace(state => ({ ...state, open: false }))
    setFind(state => state.open ? state : { ...state, targetRange: null })
  }, [])
  const setWorkspaceQuery = useCallback((query) => {
    setWorkspace(state => ({ ...state, query }))
    setFind(state => state.open ? state : { ...state, targetRange: null })
  }, [])
  const openFind = useCallback((query, targetRange = null) => setFind((state) => ({ open: true, query: typeof query === 'string' ? query : state.query, targetRange, request: state.request + 1 })), [])
  const previewFind = useCallback((query, targetRange) => setFind(state => ({ ...state, open: false, query, targetRange })), [])
  const closeFind = useCallback(() => setFind((state) => ({ ...state, open: false, targetRange: null })), [])
  const setFindQuery = useCallback((query) => setFind((state) => ({ ...state, query, targetRange: null })), [])
  const value = useMemo(() => ({ options, toggleOption, workspace, find, sourceResult, setSourceResult, openWorkspace, closeWorkspace, openFind, previewFind, closeFind, setFindQuery, setWorkspaceQuery }), [options, toggleOption, workspace, find, sourceResult, openWorkspace, closeWorkspace, openFind, previewFind, closeFind, setFindQuery, setWorkspaceQuery])
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export const useSearch = () => useContext(SearchContext)
