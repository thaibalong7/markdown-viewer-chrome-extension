import React, { useEffect, useRef } from 'react'
import { t } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import { useSearch } from '../../contexts/SearchContext.jsx'
import { ModalDialog } from '../common/ModalDialog.jsx'

export function SearchSourceDialog() {
  useLocale()
  const { sourceResult, setSourceResult } = useSearch()
  const closeRef = useRef(null)
  const markRef = useRef(null)
  useEffect(() => {
    if (sourceResult) markRef.current?.scrollIntoView?.({ block: 'center' })
  }, [sourceResult])
  if (!sourceResult) return null
  const { source, match, path } = sourceResult
  return <ModalDialog open className="mdp-ui-card mdp-search-source" aria-labelledby="mdp-search-source-title" initialFocusRef={closeRef} onDismiss={() => setSourceResult(null)}>
    <header><div><h2 id="mdp-search-source-title">{t('viewer.search.sourceTitle')}</h2><p>{path} · {t('viewer.search.line', { line: match.line })}</p></div><button ref={closeRef} className="mdp-search__button" type="button" onClick={() => setSourceResult(null)}>{t('viewer.search.closeFind')}</button></header>
    <p>{t('viewer.search.sourceExplanation')}</p>
    <pre tabIndex={0} aria-label={t('viewer.search.sourceTitle')}><code>{source.slice(0, match.from)}<mark ref={markRef}>{source.slice(match.from, match.to)}</mark>{source.slice(match.to)}</code></pre>
  </ModalDialog>
}
