import { useEffect } from 'react'

/** Native result buttons retain Enter/Space; arrows move focus, F4 also opens. */
export function useSearchResultNavigation({ section, results, inputRef, active, blocked, selectedResult }) {
  useEffect(() => {
    if (!section || !results || !active) return
    const doc = section.ownerDocument
    const handle = event => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || doc.querySelector('dialog[open]')) return
      const shortcut = event.key === 'F4'
      if (!shortcut && event.shiftKey) return
      const inInput = event.target === inputRef.current
      const inRow = results.contains(event.target) && event.target.closest?.('.mdp-workspace-search__match')
      if (!shortcut && !(section.contains(event.target) && (inInput || inRow) && ['ArrowDown', 'ArrowUp'].includes(event.key))) return
      if (blocked) { if (shortcut) event.preventDefault(); return }
      const rows = [...results.querySelectorAll('.mdp-workspace-search__match')].filter(row => !row.disabled && row.closest('details')?.open)
      if (!rows.length) return
      event.preventDefault()
      const direction = shortcut ? (event.shiftKey ? -1 : 1) : event.key === 'ArrowUp' ? -1 : 1
      let index = rows.indexOf(doc.activeElement)
      if (shortcut && index < 0) index = rows.findIndex(row => row.dataset.resultKey === selectedResult)
      const next = index < 0 ? (direction > 0 ? 0 : rows.length - 1) : (index + direction + rows.length) % rows.length
      rows[next].focus({ preventScroll: true })
      rows[next].scrollIntoView?.({ block: 'nearest' })
      if (shortcut) rows[next].click()
    }
    doc.addEventListener('keydown', handle)
    return () => doc.removeEventListener('keydown', handle)
  }, [section, results, inputRef, active, blocked, selectedResult])
}
