import { useLayoutEffect, useState } from 'react'

// Measure the allocated space, not the rendered commands (avoids overflow loops).
export function useDocumentActionsLayout(toolbarRef) {
  const [metrics, setMetrics] = useState({ availableSize: Infinity, controlSize: 28, dividerSize: 8, vertical: false })
  useLayoutEffect(() => {
    const toolbar = toolbarRef.current
    const bound = toolbar?.parentElement
    const view = toolbar?.ownerDocument?.defaultView
    if (!toolbar || !bound || !view) return undefined
    const media = view.matchMedia?.('(pointer: coarse)')
    const measure = () => {
      const style = view.getComputedStyle(toolbar)
      const vertical = style.flexDirection === 'column'
      const boundStyle = view.getComputedStyle(bound)
      const inset = vertical
        ? (parseFloat(boundStyle.paddingTop) || 0) + (parseFloat(boundStyle.paddingBottom) || 0)
        : (parseFloat(boundStyle.paddingLeft) || 0) + (parseFloat(boundStyle.paddingRight) || 0)
      const availableSize = Math.max(0, (vertical ? bound.clientHeight : bound.clientWidth) - inset)
      if (!availableSize) return
      const controlSize = parseFloat(style.getPropertyValue('--mdp-action-size')) || (media?.matches ? 44 : 28)
      const dividerSize = parseFloat(style.getPropertyValue('--mdp-action-divider-size')) || 8
      setMetrics(current => current.availableSize === availableSize && current.controlSize === controlSize && current.dividerSize === dividerSize && current.vertical === vertical
        ? current : { availableSize, controlSize, dividerSize, vertical })
    }
    const observer = view.ResizeObserver ? new view.ResizeObserver(measure) : null
    observer?.observe(bound)
    media?.addEventListener('change', measure)
    view.addEventListener('resize', measure)
    measure()
    return () => {
      observer?.disconnect()
      media?.removeEventListener('change', measure)
      view.removeEventListener('resize', measure)
    }
  }, [toolbarRef])
  return metrics
}
