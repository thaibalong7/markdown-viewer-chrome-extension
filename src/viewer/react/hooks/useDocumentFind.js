import { useEffect, useRef, useState } from 'react'
import { collectDocumentText, findDocumentRanges, paintFindRanges, revealFindRange } from '../../search/document-find.js'
import { createSearchTextStore } from '../../search/search-text-store.js'

export function useDocumentFind({ article, scrollRoot, open, query, options, documentKey, targetRange, composing = false }) {
  const [result, setResult] = useState({ ranges: [], limited: false, active: 0 })
  const [pending, setPending] = useState(false)
  const revealRef = useRef(null)
  const indexRef = useRef(null)
  const storeRef = useRef(null)
  if (!storeRef.current) storeRef.current = createSearchTextStore({ maxBytes: 16 * 1024 * 1024 })
  useEffect(() => {
    if (!open || !article) { setResult({ ranges: [], limited: false, active: 0 }); setPending(false); revealRef.current = null; indexRef.current = null; storeRef.current.clear(); return }
    if (composing) { setPending(true); return }
    let timer
    const refresh = () => {
      clearTimeout(timer)
      setPending(Boolean(query))
      timer = setTimeout(() => {
        if (!query) { setResult({ ranges: [], limited: false, active: 0 }); setPending(false); return }
        if (indexRef.current?.article !== article || indexRef.current.documentKey !== documentKey) indexRef.current = { article, documentKey, index: collectDocumentText(article) }
        const index = indexRef.current.index
        const prepared = storeRef.current.prepare('document', index.text, options).normalized
        const found = findDocumentRanges(article, query, options, index, prepared)
        const active = found.ranges.findIndex((range) => range.startContainer === targetRange?.startContainer && range.startOffset === targetRange?.startOffset)
        setResult({ ...found, active: Math.max(0, active) })
        setPending(false)
      }, 100)
    }
    refresh()
    const observer = new MutationObserver(() => { indexRef.current = null; storeRef.current.clear(); refresh() })
    observer.observe(article, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'open', 'style', 'class', 'aria-hidden'] })
    return () => { clearTimeout(timer); observer.disconnect() }
  }, [article, open, query, options, documentKey, targetRange, composing])

  useEffect(() => {
    if (!open || !article) return
    const cleanup = paintFindRanges(article, result.ranges, result.active)
    const range = result.ranges[result.active]
    if (range && revealRef.current !== range) {
      revealRef.current = range
      revealFindRange(range, scrollRoot)
    }
    return cleanup
  }, [article, scrollRoot, open, result])
  return { ...result, pending, move: (delta) => setResult((state) => ({ ...state, active: state.ranges.length ? (state.active + delta + state.ranges.length) % state.ranges.length : 0 })) }
}
