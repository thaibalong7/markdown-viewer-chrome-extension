import { useEffect, useRef, useState } from 'react'
import { createScrollSpy } from '../../core/scroll-spy.js'

export function useScrollSpy({ scrollRoot, headings, getToolbarHeight }) {
  const [activeHeadingId, setActiveHeadingId] = useState(null)
  const getToolbarHeightRef = useRef(getToolbarHeight)

  useEffect(() => {
    getToolbarHeightRef.current = getToolbarHeight
  }, [getToolbarHeight])

  useEffect(() => {
    if (!scrollRoot || !headings?.length) {
      setActiveHeadingId(null)
      return undefined
    }

    const spy = createScrollSpy({
      scrollRoot,
      headings,
      getToolbarHeight: () => {
        const callback = getToolbarHeightRef.current
        return typeof callback === 'function' ? callback() : undefined
      },
      onActiveIdChange: (id) => {
        setActiveHeadingId(id || null)
      }
    })

    return () => {
      spy?.destroy?.()
    }
  }, [scrollRoot, headings])

  return activeHeadingId
}
