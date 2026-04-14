import { useEffect, useState } from 'react'
import { createScrollSpy } from '../../core/scroll-spy.js'

export function useScrollSpy({ scrollRoot, headings, getToolbarHeight }) {
  const [activeHeadingId, setActiveHeadingId] = useState(null)

  useEffect(() => {
    if (!scrollRoot || !headings?.length) {
      setActiveHeadingId(null)
      return undefined
    }

    const spy = createScrollSpy({
      scrollRoot,
      headings,
      getToolbarHeight,
      onActiveIdChange: (id) => {
        setActiveHeadingId(id || null)
      }
    })

    return () => {
      spy?.destroy?.()
    }
  }, [scrollRoot, headings, getToolbarHeight])

  return activeHeadingId
}
