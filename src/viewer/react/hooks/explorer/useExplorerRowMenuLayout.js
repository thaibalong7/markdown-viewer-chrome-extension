import { useLayoutEffect, useState } from 'react'

export function getExplorerRowMenuStyle(anchor, viewport, menuHeight) {
  const maxHeight = Math.max(0, viewport.bottom - viewport.top - 8)
  const maxWidth = Math.max(0, viewport.right - viewport.left - 16)
  const height = Math.min(menuHeight, maxHeight)
  const below = anchor.bottom + 4
  const preferred = below + height <= viewport.bottom - 4 ? below : anchor.top - height - 4
  const top = Math.max(viewport.top + 4, Math.min(preferred, viewport.bottom - height - 4))
  return {
    top: `${top - anchor.top}px`,
    maxHeight: `${maxHeight}px`,
    maxWidth: `${maxWidth}px`,
    minWidth: `min(164px, ${maxWidth}px)`,
    overflowY: 'auto'
  }
}

/** Keep absolute menus inside the Files scroll viewport, including virtualized bottom rows. */
export function useExplorerRowMenuLayout({ open, layerRef, onClose }) {
  const [style, setStyle] = useState(undefined)
  useLayoutEffect(() => {
    if (!open) return undefined
    const layer = layerRef.current
    const viewport = layer?.closest('.mdp-explorer__scroll-region')
    const menu = layer?.querySelector('[role="menu"]')
    if (!viewport || !menu) return undefined
    const view = layer.ownerDocument.defaultView
    setStyle(getExplorerRowMenuStyle(layer.getBoundingClientRect(), viewport.getBoundingClientRect(), menu.scrollHeight))
    viewport.addEventListener('scroll', onClose)
    view?.addEventListener('resize', onClose)
    return () => {
      viewport.removeEventListener('scroll', onClose)
      view?.removeEventListener('resize', onClose)
    }
  }, [open, layerRef, onClose])
  return style
}
