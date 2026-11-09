import { useEffect, useState } from 'react'
import { getCurrentMatchRects } from '../../search/current-match-geometry.js'

export function useCurrentMatchMarker(range, article, scrollRoot) {
  const [geometry, setGeometry] = useState({ boxes: [], gutter: null })
  useEffect(() => {
    if (!range || !article) { setGeometry({ boxes: [], gutter: null }); return }
    const win = article.ownerDocument.defaultView
    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = win.requestAnimationFrame(() => {
        frame = 0
        const boxes = getCurrentMatchRects(range, scrollRoot)
        const left = Math.max(scrollRoot?.getBoundingClientRect?.().left || 0, article.getBoundingClientRect().left + 4)
        const first = boxes[0]
        const gutter = first && left + 8 < first.left ? { left, top: first.top, height: first.height } : null
        setGeometry({ boxes, gutter })
      })
    }
    schedule()
    win.addEventListener('scroll', schedule, true)
    win.addEventListener('resize', schedule)
    const observer = win.ResizeObserver ? new win.ResizeObserver(schedule) : null
    observer?.observe(article)
    if (scrollRoot) observer?.observe(scrollRoot)
    return () => {
      win.cancelAnimationFrame(frame)
      win.removeEventListener('scroll', schedule, true)
      win.removeEventListener('resize', schedule)
      observer?.disconnect()
    }
  }, [range, article, scrollRoot])
  return geometry
}
