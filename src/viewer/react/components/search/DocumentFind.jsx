import React, { useEffect, useRef, useState } from 'react'
import { t } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import { useSearch } from '../../contexts/SearchContext.jsx'
import { useDocumentFind } from '../../hooks/useDocumentFind.js'
import { getSearchShortcut } from '../../../search/search-shortcuts.js'
import { MAX_QUERY_LENGTH } from '../../../search/text-search.js'
import { SearchIconButton } from './SearchIconButton.jsx'
import { SearchField } from './SearchField.jsx'
import { CurrentMatchMarker } from './CurrentMatchMarker.jsx'
import { SearchOptions } from './SearchOptions.jsx'

export function DocumentFind({ article, root, scrollRoot, documentKey, isFocusMode, bridge }) {
  useLocale()
  const { options, find, openFind, closeFind, setFindQuery, openWorkspace } = useSearch()
  const inputRef = useRef(null)
  const returnFocusRef = useRef(null)
  const [composing, setComposing] = useState(false)
  const preview = find.targetRange?.startContainer?.isConnected && article?.contains(find.targetRange.startContainer)
  const result = useDocumentFind({ article, scrollRoot, open: (find.open || preview) && !isFocusMode, query: find.query, options, documentKey, targetRange: find.targetRange, composing })
  useEffect(() => { if (!find.open) setComposing(false) }, [find.open])
  const dismiss = () => {
    closeFind()
    if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true })
  }
  useEffect(() => {
    if (!root) return
    const handle = (event) => {
      if (root.ownerDocument.querySelector('dialog[open]')) return
      const action = getSearchShortcut(event)
      if (!action) return
      if (action === 'document' && event.target?.closest?.('.cm-editor')) return
      event.preventDefault()
      event.stopPropagation()
      if (action === 'workspace') { openWorkspace(); return }
      if (isFocusMode) { bridge?.getSearchDocument?.()?.editor?.openFind?.(); return }
      if (!find.open) returnFocusRef.current = root.ownerDocument.activeElement
      const selection = root.ownerDocument.getSelection()
      const selected = selection?.anchorNode && article?.contains(selection.anchorNode) && article.contains(selection.focusNode) ? selection.toString().replace(/[\r\n]+/g, ' ').slice(0, MAX_QUERY_LENGTH) : ''
      openFind(selected || undefined)
    }
    const escape = (event) => {
      if (event.key !== 'Escape' || !find.open || composing || event.isComposing || event.keyCode === 229 || event.defaultPrevented || root.ownerDocument.querySelector('dialog[open]')) return
      if (event.target?.closest?.('.cm-editor, [role="menu"], .mdp-workspace-search')) return
      event.preventDefault()
      closeFind()
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true })
    }
    root.ownerDocument.addEventListener('keydown', handle, true)
    root.ownerDocument.addEventListener('keydown', escape)
    return () => {
      root.ownerDocument.removeEventListener('keydown', handle, true)
      root.ownerDocument.removeEventListener('keydown', escape)
    }
  }, [root, article, find.open, isFocusMode, bridge, openFind, openWorkspace, closeFind, composing])
  useEffect(() => {
    if (!find.open) return
    if (isFocusMode) {
      bridge?.getSearchDocument?.()?.editor?.openFind?.()
      closeFind()
      return
    }
    const focused = root?.ownerDocument.activeElement
    if (!focused?.closest?.('.mdp-find')) returnFocusRef.current = focused
    inputRef.current?.focus({ preventScroll: true })
    inputRef.current?.select()
  }, [find.open, find.request, isFocusMode, bridge, closeFind, root])
  // Navigating or entering focus mode releases document highlights.
  useEffect(() => {
    if (isFocusMode || !find.targetRange?.startContainer?.isConnected) closeFind()
  }, [documentKey, isFocusMode, closeFind])

  if (isFocusMode || (!find.open && !preview)) return null
  const count = result.ranges.length
  return <><CurrentMatchMarker range={result.pending ? null : result.ranges[result.active]} article={article} scrollRoot={scrollRoot} />
  {find.open ? <div className="mdp-find-anchor"><section className="mdp-find" role="search" aria-label={t('viewer.search.inDocument')} onKeyDown={(event) => {
    if (composing || event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss() }
    if (event.key === 'Enter' && event.target === inputRef.current && !composing && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); if (!result.pending) result.move(event.shiftKey ? -1 : 1) }
  }}>
    <div className="mdp-find__row">
      <SearchField ref={inputRef} aria-label={t('viewer.search.inDocument')} placeholder={t('viewer.search.inDocument')} value={find.query} maxLength={MAX_QUERY_LENGTH} onChange={setFindQuery} onCompositionChange={setComposing} />
      <span className="mdp-find__count" role="status" aria-busy={result.pending}>{result.pending ? '…' : count ? `${result.active + 1}/${count}${result.limited ? '+' : ''}` : '0/0'}</span>
      <SearchIconButton icon="chevron-left" label={t('viewer.search.previous')} disabled={!count || result.pending} onClick={() => result.move(-1)} />
      <SearchIconButton icon="chevron-right" label={t('viewer.search.next')} disabled={!count || result.pending} onClick={() => result.move(1)} />
      <SearchIconButton icon="search" label={t('viewer.search.workspace')} onClick={() => openWorkspace(find.query)} />
      <SearchIconButton icon="close" label={t('viewer.search.closeFind')} onClick={dismiss} />
    </div>
    <SearchOptions />
    {find.query && !count && !result.pending ? <div className="mdp-find__hint"><span>{t('viewer.search.noDocumentResults')}</span><button type="button" onClick={() => openWorkspace(find.query)}>{t('viewer.search.workspace')}</button></div> : null}
    {result.limited ? <p className="mdp-search__notice">{t('viewer.search.findLimited')}</p> : null}
  </section></div> : null}</>
}
