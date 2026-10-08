import { useLayoutEffect, useState } from 'react'

// Align row actions with the context card without changing the panel's padding.
export function useExplorerViewportLayout(scrollElement) {
  const [rowHeight, setRowHeight] = useState(38)

  useLayoutEffect(() => {
    if (!scrollElement) return undefined
    const explorer = scrollElement.closest('.mdp-explorer')
    const view = scrollElement.ownerDocument.defaultView
    const media = view.matchMedia?.('(pointer: coarse)')
    const measure = () => {
      if (scrollElement.offsetWidth) {
        const gutter = Math.max(0, scrollElement.offsetWidth - scrollElement.clientWidth)
        explorer.style.setProperty('--mdp-explorer-scrollbar-width', `${gutter}px`)
      }
      setRowHeight(media?.matches ? 44 : 38)
    }
    const observer = new view.ResizeObserver(measure)
    observer.observe(scrollElement)
    media?.addEventListener('change', measure)
    measure()
    return () => {
      observer.disconnect()
      media?.removeEventListener('change', measure)
      explorer.style.removeProperty('--mdp-explorer-scrollbar-width')
    }
  }, [scrollElement])

  return rowHeight
}
