import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearch } from '../contexts/SearchContext.jsx'
import { workspaceSearchFiles, searchWorkspace } from '../../search/workspace-search.js'
import { openWorkspaceSearchResult } from '../../search/result-navigation.js'
import { logger } from '../../../shared/logger.js'
import { createSearchSourceCache } from '../../search/search-source-cache.js'
import { createSearchMatchingClient } from '../../search/search-matching-client.js'

const EMPTY = { groups: [], count: 0, scanned: 0, total: 0, skipped: 0, limited: false, cached: 0 }

export function useWorkspaceSearch({ state, bridge, active, composing = false }) {
  const { options, workspace, setSourceResult, previewFind, setWorkspaceQuery: setQuery } = useSearch()
  const query = workspace.query
  const [snapshot, setSnapshot] = useState({ ...EMPTY, key: null, runId: 0 })
  const [run, setRun] = useState({ status: 'idle', id: 0, progress: EMPTY })
  const [navigating, setNavigating] = useState(false)
  const [navigationError, setNavigationError] = useState('')
  const [selectedResult, setSelectedResult] = useState(null)
  const controllerRef = useRef(null)
  const timerRef = useRef(null)
  const startRef = useRef(null)
  const generationRef = useRef(0)
  const navigationRef = useRef(false)
  const sessionRef = useRef(null)
  const files = useMemo(() => workspaceSearchFiles(state.tree, state.files), [state.tree, state.files])
  const key = useMemo(() => ({ query, options, files }), [query, options, files])
  const currentRef = useRef(null)
  const scanning = ['loading', 'progress'].includes(state.view)
  const ready = !scanning && (Boolean(state.tree) || (state.files?.length || 0) > 0)
  currentRef.current = active && ready && !composing ? key : null
  const scopeLimited = !state.tree && (state.files?.length || 0) > 0

  useEffect(() => {
    const cache = createSearchSourceCache()
    const matcher = createSearchMatchingClient(cache.namespace)
    sessionRef.current = { cache, matcher }
    return () => { cache.dispose(); matcher.dispose(); sessionRef.current = null }
  }, [files, bridge])

  useEffect(() => {
    ++generationRef.current
    setNavigating(false)
    startRef.current = null
    if (!ready || !query) {
      setSnapshot({ ...EMPTY, key: null, runId: 0 })
      setSelectedResult(null)
    } else {
      // Never present another folder's results as this scope's pending results.
      setSnapshot(value => value.key?.files === files ? value : { ...EMPTY, key: null, runId: 0 })
    }
    if (!active || !ready || !query || composing) {
      setRun(value => ({ ...value, status: 'idle' }))
      return
    }
    setRun({ status: 'waiting', id: generationRef.current, progress: EMPTY })
    setNavigationError('')
    const start = (forceRefresh = false) => {
      clearTimeout(timerRef.current)
      controllerRef.current?.abort()
      const id = ++generationRef.current
      const controller = new AbortController()
      controllerRef.current = controller
      const valid = () => id === generationRef.current && !controller.signal.aborted && currentRef.current === key
      setRun({ status: 'searching', id, progress: { ...EMPTY, total: files.length } })
      const publish = value => {
        setSnapshot({ ...value, key, runId: id })
        setSelectedResult(selected => value.groups.some(group => group.matches.some(match => `${group.href}:${match.from}` === selected)) ? selected : null)
      }
      void searchWorkspace({
        files, query, options, signal: controller.signal,
        cache: sessionRef.current.cache, matcher: sessionRef.current.matcher, forceRefresh,
        getReader: href => bridge?.getWorkspaceReader?.(href),
        getCurrentDocument: () => bridge?.getSearchDocument?.(),
        onProgress: progress => {
          if (!valid()) return
          setRun({ status: 'searching', id, progress })
          // Keep old rows until new hits arrive, or the search confirms zero hits.
          if (progress.groups.length) publish(progress)
        }
      }).then(value => {
        if (!valid()) return
        publish(value)
        setRun({ status: 'complete', id, progress: value })
      }).catch(error => {
        if (!valid()) return
        logger.warn('Workspace search failed.', { message: String(error?.message || error) })
        setRun(value => ({ ...value, status: 'error' }))
      })
    }
    startRef.current = { key, start }
    timerRef.current = setTimeout(() => start(false), 250)
    return () => {
      clearTimeout(timerRef.current)
      controllerRef.current?.abort()
      startRef.current = null
      ++generationRef.current
    }
  }, [active, ready, files, key, query, options, composing, bridge])

  const stop = useCallback(() => {
    clearTimeout(timerRef.current)
    controllerRef.current?.abort()
    ++generationRef.current
    setRun(value => ({ ...value, status: 'stopped' }))
  }, [])
  const refresh = useCallback(() => {
    if (currentRef.current === key && startRef.current?.key === key) startRef.current.start(true)
  }, [key])
  const stale = !ready || composing || snapshot.key !== key || snapshot.runId !== run.id

  const openResult = async (group, match) => {
    if (stale || navigationRef.current || !active) return
    navigationRef.current = true
    setNavigating(true)
    setNavigationError('')
    const generation = generationRef.current
    try {
      const destination = await openWorkspaceSearchResult({ bridge, group, match, query, options,
        readSource: async (file, current) => (await sessionRef.current.cache.read(file, { reader: bridge?.getWorkspaceReader?.(file.href), current, force: true })).text,
        isCurrent: () => currentRef.current === key && generation === generationRef.current })
      if (!destination) return
      if (destination.stale) setNavigationError('viewer.search.stale')
      else {
        setSelectedResult(`${group.href}:${match.from}`)
        if (destination.rendered) previewFind(query, destination.range)
        else if (destination.source !== undefined) setSourceResult(destination)
      }
    } catch (error) {
      logger.warn('Could not open search result.', { message: String(error?.message || error) })
      if (generation === generationRef.current) setNavigationError('viewer.search.openFailed')
    } finally {
      navigationRef.current = false
      if (generation === generationRef.current) setNavigating(false)
    }
  }

  return { query, setQuery, result: { ...snapshot, status: run.status }, progress: run.progress, stale,
    ready, scanning, scopeLimited, selectedResult, navigating, navigationError, stop, refresh, openResult }
}
