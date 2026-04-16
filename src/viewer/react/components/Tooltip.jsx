import React, {
  cloneElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { createPortal } from 'react-dom'
import { VIEWER_TOOLTIP_DELAY_DEFAULT_MS } from '../../tooltip.js'

export function Tooltip({ content, showDelayMs = VIEWER_TOOLTIP_DELAY_DEFAULT_MS, children }) {
  const text = typeof content === 'string' ? content.trim() : ''
  if (!text) return children

  const child = React.Children.only(children)
  const anchorRef = useRef(null)
  const tipRef = useRef(null)
  const timerRef = useRef(0)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [portalTarget, setPortalTarget] = useState(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = 0
    }
  }, [])

  const close = useCallback(() => {
    clearTimer()
    setOpen(false)
  }, [clearTimer])

  const scheduleOpen = useCallback(() => {
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = 0
      setOpen(true)
    }, showDelayMs)
  }, [clearTimer, showDelayMs])

  const positionTip = useCallback(() => {
    const anchor = anchorRef.current
    const tip = tipRef.current
    if (!anchor || !tip) return

    const rect = anchor.getBoundingClientRect()
    const margin = 8
    const pad = 6
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const tipWidth = tip.offsetWidth
    const tipHeight = tip.offsetHeight

    let top = rect.bottom + margin
    let left = rect.left + rect.width / 2 - tipWidth / 2

    if (left < pad) left = pad
    if (left + tipWidth > viewportWidth - pad) {
      left = Math.max(pad, viewportWidth - pad - tipWidth)
    }
    if (top + tipHeight > viewportHeight - pad && rect.top - margin - tipHeight >= pad) {
      top = rect.top - margin - tipHeight
    }
    if (top + tipHeight > viewportHeight - pad) {
      top = Math.max(pad, viewportHeight - pad - tipHeight)
    }

    setCoords({ top: Math.round(top), left: Math.round(left) })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    positionTip()
  }, [open, positionTip, text])

  useEffect(() => {
    if (!open) return undefined
    const onReposition = () => positionTip()
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
    return () => {
      window.removeEventListener('scroll', onReposition, true)
      window.removeEventListener('resize', onReposition)
    }
  }, [open, positionTip])

  useEffect(() => () => clearTimer(), [clearTimer])

  const merged = cloneElement(child, {
    ref: (node) => {
      anchorRef.current = node
      const rootNode = node?.getRootNode?.()
      if (rootNode instanceof ShadowRoot) {
        setPortalTarget(rootNode)
      } else if (node?.ownerDocument?.body) {
        setPortalTarget(node.ownerDocument.body)
      } else {
        setPortalTarget(null)
      }

      const childRef = child.ref
      if (typeof childRef === 'function') childRef(node)
      else if (childRef && typeof childRef === 'object') childRef.current = node
    },
    onPointerEnter: (event) => {
      child.props.onPointerEnter?.(event)
      if (!event.defaultPrevented) scheduleOpen()
    },
    onPointerLeave: (event) => {
      child.props.onPointerLeave?.(event)
      if (!event.defaultPrevented) close()
    },
    onFocus: (event) => {
      child.props.onFocus?.(event)
      if (!event.defaultPrevented) scheduleOpen()
    },
    onBlur: (event) => {
      child.props.onBlur?.(event)
      if (!event.defaultPrevented) close()
    }
  })

  const tipNode = useMemo(() => {
    if (!open || !text) return null
    return (
      <div
        ref={tipRef}
        className="mdp-tooltip"
        style={{
          position: 'fixed',
          zIndex: 2147483646,
          top: coords.top,
          left: coords.left
        }}
        role="tooltip"
      >
        {text}
      </div>
    )
  }, [coords.left, coords.top, open, text])

  return (
    <>
      {merged}
      {tipNode && portalTarget ? createPortal(tipNode, portalTarget) : null}
    </>
  )
}
