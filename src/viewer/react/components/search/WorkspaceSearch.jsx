import React, { useEffect, useId, useRef, useState } from 'react'
import { t } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import { useSearch } from '../../contexts/SearchContext.jsx'
import { useEditorDispatch, useEditorState } from '../../contexts/EditorContext.jsx'
import { useWorkspaceSearch } from '../../hooks/useWorkspaceSearch.js'
import { MAX_QUERY_LENGTH } from '../../../search/text-search.js'
import { SearchIconButton } from './SearchIconButton.jsx'
import { ViewerScrollbar } from '../ViewerScrollbar.jsx'
import { SearchField } from './SearchField.jsx'
import { SearchOptions } from './SearchOptions.jsx'
import { FileIcon } from '../icons/FileIcon.jsx'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'
import { getFileTypeFromUrl } from '../../../../shared/file-types.js'
import { useSearchResultNavigation } from '../../hooks/useSearchResultNavigation.js'

export function SearchSnippet({ match }) {
  return <><span className="mdp-workspace-search__before">{match.prefix ? '…' : ''}{match.snippet.slice(0, match.snippetFrom)}</span><mark>{match.snippet.slice(match.snippetFrom, match.snippetTo)}</mark><span className="mdp-workspace-search__after">{match.snippet.slice(match.snippetTo)}{match.suffix ? '…' : ''}</span></>
}

export function WorkspaceSearch({ state, bridge, actions, expanded, scrollbarVisibility }) {
  useLocale()
  const { workspace, closeWorkspace } = useSearch()
  const editor = useEditorState()
  const dispatch = useEditorDispatch()
  const inputRef = useRef(null)
  const resultsId = useId()
  const returnFocusRef = useRef(null)
  const wasActiveRef = useRef(false)
  const [scrollElement, setScrollElement] = useState(null)
  const [section, setSection] = useState(null)
  const [composing, setComposing] = useState(false)
  const { query, setQuery, result, progress, stale, ready, scanning, scopeLimited, selectedResult, navigating, navigationError, stop, refresh, openResult } = useWorkspaceSearch({ state, bridge, active: workspace.open && expanded, composing })
  const active = workspace.open
  useSearchResultNavigation({ section, results: scrollElement, inputRef, active: active && expanded, blocked: stale || navigating || composing, selectedResult })
  useEffect(() => { if (!active) setComposing(false) }, [active])
  useEffect(() => {
    if (!active && wasActiveRef.current && returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true })
    wasActiveRef.current = active
    if (active && expanded) {
      const focused = inputRef.current?.ownerDocument.activeElement
      if (!focused?.closest?.('.mdp-workspace-search')) returnFocusRef.current = focused
      inputRef.current?.focus({ preventScroll: true }); inputRef.current?.select()
    }
  }, [active, expanded, workspace.request])
  const showFiles = () => {
    if (!editor.enabled && !editor.sidebarVisible) dispatch({ type: 'TOGGLE_SIDEBAR' })
    closeWorkspace()
  }
  const partial = result.limited || result.skipped > 0 || Boolean(state.depthNotice) || scopeLimited || result.status === 'stopped'
  const busy = ['waiting', 'searching'].includes(result.status)
  const scopeLabel = t(state.explorerMode === 'workspace' ? 'viewer.search.workspace' : 'viewer.search.inFolder')
  let statusText = t('viewer.search.startTyping')
  if (query) {
    if (stale) {
      statusText = busy && progress.total
        ? t('viewer.search.updatingProgress', { scanned: progress.scanned, total: progress.total })
        : t(busy || composing ? 'viewer.search.updating' : 'viewer.search.outdatedResults')
    } else statusText = t(busy ? 'viewer.search.progress' : 'viewer.search.summary', { count: progress.count, scanned: progress.scanned, total: progress.total })
  }
  return <section ref={setSection} id="mdp-explorer-search" className={`mdp-workspace-search${active ? ' is-active' : ''}`} role="search" aria-label={scopeLabel}
    aria-hidden={!active} inert={!active || undefined} onKeyDown={(event) => {
    if (composing || event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (busy) stop(); else showFiles() }
  }}>
    <div className="mdp-workspace-search__controls">
      <div className="mdp-workspace-search__query-row">
      <SearchField ref={inputRef} aria-label={scopeLabel} aria-describedby={`${resultsId}-scope`} placeholder={t('viewer.search.placeholder')} value={query} maxLength={MAX_QUERY_LENGTH} onChange={setQuery} onCompositionChange={setComposing} onKeyDown={(event) => {
        if (event.key === 'Enter' && !composing && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); if (!event.repeat) refresh() }
      }} />
      <SearchIconButton icon="close" label={t('viewer.search.closeWorkspace')} onClick={showFiles} />
      </div>
      <SearchOptions />
      <p id={`${resultsId}-scope`} className="mdp-workspace-search__description">{t(result.cached && !stale ? 'viewer.search.cachedScope' : 'viewer.search.sourceScope')}</p>
    </div>
    {!ready ? <div className="mdp-workspace-search__empty">
      <p>{t(scanning ? 'viewer.search.waitForScan' : 'viewer.search.chooseWorkspace')}</p>
      {scanning ? <button type="button" className="mdp-search__button" onClick={actions.onCancelProgress}>{t('viewer.search.stop')}</button> : <button type="button" className="mdp-search__button" onClick={actions.onOpenAnotherFolder}>{t('viewer.search.chooseFolder')}</button>}
    </div> : <>
      <div className="mdp-workspace-search__status" role="status" aria-live="polite">
        <span>{statusText}</span>
        {query ? <SearchIconButton icon={busy ? 'close' : 'refresh'} label={t(busy ? 'viewer.search.stop' : 'viewer.search.searchAgain')} disabled={composing} onClick={busy ? stop : refresh} /> : null}
      </div>
      {partial && (!stale || scopeLimited) ? <p className="mdp-search__notice" role="note">{t(scopeLimited ? 'viewer.search.folderListPartial' : 'viewer.search.partial', { skipped: result.skipped })}</p> : null}
      {result.status === 'error' ? <p className="mdp-search__notice" role="alert">{t('viewer.search.failed')}</p> : null}
      {navigationError ? <p className="mdp-search__notice" role="alert">{t(navigationError)}</p> : null}
      {query && !stale && result.status === 'complete' && !result.count ? <p className="mdp-workspace-search__empty">{t(partial ? 'viewer.search.noPartialResults' : 'viewer.search.noWorkspaceResults')}</p> : null}
      <div className="mdp-workspace-search__results" ref={setScrollElement} aria-busy={busy || navigating || composing} data-stale={stale || undefined}>
        {result.groups.map((group, groupIndex) => <details className="mdp-workspace-search__file" key={group.href} open>
          <summary title={group.path}>
            <AppIcon name="chevron-right" size={12} className="mdp-workspace-search__caret" />
            <FileIcon kind={getFileTypeFromUrl(group.href)?.explorerIcon} size={16} />
            <span className="mdp-workspace-search__filename">{group.path.split('/').pop()}</span>
            <span className="mdp-workspace-search__parent">{group.path.includes('/') ? group.path.slice(0, group.path.lastIndexOf('/')) : ''}</span>
            <span className="mdp-workspace-search__badge">{group.matches.length}</span>{group.dirty ? <span className="mdp-workspace-search__badge">{t('viewer.search.unsaved')}</span> : null}
          </summary>
          <ul>{group.matches.map((match) => <li key={match.from}>
            <button className="mdp-workspace-search__match" type="button" disabled={stale} aria-disabled={navigating || stale || undefined} data-result-key={`${group.href}:${match.from}`} onClick={event => { if (navigating || stale) return; event.currentTarget.focus({ preventScroll: true }); void openResult(group, match) }} aria-label={t('viewer.search.resultLocation', { path: group.path, line: match.line, column: match.column })} aria-describedby={`${resultsId}-${groupIndex}-${match.from}`}
              aria-current={selectedResult === `${group.href}:${match.from}` ? 'location' : undefined} title={`${match.line}:${match.column}  ${match.snippet}`}>
              <span className="mdp-workspace-search__line">{match.line}</span><span id={`${resultsId}-${groupIndex}-${match.from}`} className="mdp-workspace-search__snippet"><SearchSnippet match={match} /></span>
            </button>
          </li>)}</ul>
        </details>)}
      </div>
      <ViewerScrollbar scrollElement={active && expanded ? scrollElement : null} visibility={scrollbarVisibility}
        label={t('viewer.search.resultsScrollbar')} variant="sidebar" contentSelector=".mdp-workspace-search__file"
        contentVersion={`${result.count}:${result.status}`} />
    </>}
  </section>
}
