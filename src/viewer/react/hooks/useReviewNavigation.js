import { useRef } from 'react'

export function getReviewKeyboardAction(event) {
  if (!event.altKey || event.ctrlKey || event.metaKey) return null
  return event.key === 'ArrowDown' ? 'next' : event.key === 'ArrowUp' ? 'previous' : null
}

export function useReviewNavigation() {
  const hunkRefs = useRef(new Map())
  return {
    registerHunk: (id, node) => { if (node) hunkRefs.current.set(id, node); else hunkRefs.current.delete(id) },
    focusHunk: (id) => {
      const node = hunkRefs.current.get(id)
      node?.focus({ preventScroll: true })
      node?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    }
  }
}
