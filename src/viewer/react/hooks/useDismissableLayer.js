import { useEffect } from 'react'

export function getDismissEventTargets(node) {
  const targets = []
  const root = node?.getRootNode?.()
  const ownerDocument = node?.ownerDocument || globalThis.document

  if (root && typeof root.addEventListener === 'function') {
    targets.push(root)
  }
  if (
    ownerDocument &&
    typeof ownerDocument.addEventListener === 'function' &&
    !targets.includes(ownerDocument)
  ) {
    targets.push(ownerDocument)
  }

  return targets
}

export function eventIncludesNode(event, node) {
  if (!event || !node) return false
  const path = typeof event.composedPath === 'function' ? event.composedPath() : null
  return path ? path.includes(node) : node.contains(event.target)
}

export function useDismissableLayer({
  open,
  layerRef,
  onDismiss,
  restoreFocusRef,
  preventEscapeDefault = false
}) {
  useEffect(() => {
    if (!open) return undefined
    const layer = layerRef?.current
    const targets = getDismissEventTargets(layer)
    if (!layer || targets.length === 0) return undefined

    let lastDismissEvent = null
    const dismiss = (event) => {
      if (lastDismissEvent === event) return
      lastDismissEvent = event
      onDismiss?.(event)
    }

    const onPointerDown = (event) => {
      if (eventIncludesNode(event, layer)) return
      dismiss(event)
    }

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (preventEscapeDefault) event.preventDefault()
      dismiss(event)
      restoreFocusRef?.current?.focus?.()
    }

    targets.forEach((target) => {
      target.addEventListener('pointerdown', onPointerDown, true)
      target.addEventListener('keydown', onKeyDown, true)
    })

    return () => {
      targets.forEach((target) => {
        target.removeEventListener('pointerdown', onPointerDown, true)
        target.removeEventListener('keydown', onKeyDown, true)
      })
    }
  }, [layerRef, onDismiss, open, preventEscapeDefault, restoreFocusRef])
}
