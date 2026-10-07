import { useEffect, useState } from 'react'

export function useExplorerDetailsLayout(summaryRef, badgeRef) {
  const [layout, setLayout] = useState({ width: 0, badgeWidth: 0, coarse: false })

  useEffect(() => {
    const summary = summaryRef.current
    const badge = badgeRef.current
    if (!summary || !badge) return undefined
    const view = summary.ownerDocument.defaultView
    const media = view.matchMedia?.('(pointer: coarse)')
    const measure = () => {
      const width = summary.getBoundingClientRect().width
      // Retain the last useful measurement while the whole Files rail is collapsed.
      if (!width) return
      const badgeWidth = Math.max(badge.getBoundingClientRect().width, badge.scrollWidth + 2)
      const coarse = media?.matches === true
      setLayout(current => current.width === width && current.badgeWidth === badgeWidth && current.coarse === coarse
        ? current : { width, badgeWidth, coarse })
    }
    const observer = new view.ResizeObserver(measure)
    observer.observe(summary)
    observer.observe(badge)
    media?.addEventListener('change', measure)
    measure()
    return () => {
      observer.disconnect()
      media?.removeEventListener('change', measure)
    }
  }, [summaryRef, badgeRef])

  return layout
}
