import React, {
  cloneElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import { createPortal } from 'react-dom'

const SHOW_DELAY_MS = 400

/**
 * Hover/focus tooltip for popup controls. Merges event handlers onto a single child element.
 * @param {{ content: string, children: React.ReactElement }} props
 */
export function Tooltip({ content, children }) {
  const text = typeof content === 'string' ? content.trim() : ''
  if (!text) return children

  const child = React.Children.only(children)
  const anchorRef = useRef(null)
  const tipRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const timerRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = 0
    }
  }, [])

  const scheduleOpen = useCallback(() => {
    clearTimer()
    timerRef.current = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS)
  }, [clearTimer])

  const close = useCallback(() => {
    clearTimer()
    setOpen(false)
  }, [clearTimer])

  useLayoutEffect(() => {
    if (!open) return
    const el = anchorRef.current
    const tip = tipRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const margin = 8
    const pad = 8
    const vw = window.innerWidth
    const vh = window.innerHeight

    const tipW = 280
    let top = rect.bottom + margin
    let left = rect.left + rect.width / 2 - tipW / 2
    if (left < pad) left = pad
    if (left + tipW > vw - pad) left = Math.max(pad, vw - pad - tipW)

    const th = tip?.offsetHeight ?? 72
    if (top + th > vh - pad && rect.top - margin - th >= pad) {
      top = rect.top - margin - th
    }
    setCoords({ top, left })
  }, [open, text])

  useEffect(() => () => clearTimer(), [clearTimer])

  const merged = cloneElement(child, {
    ref: (node) => {
      anchorRef.current = node
      const r = child.ref
      if (typeof r === 'function') r(node)
      else if (r && typeof r === 'object') r.current = node
    },
    onPointerEnter: (e) => {
      child.props.onPointerEnter?.(e)
      if (!e.defaultPrevented) scheduleOpen()
    },
    onPointerLeave: (e) => {
      child.props.onPointerLeave?.(e)
      if (!e.defaultPrevented) close()
    },
    onFocus: (e) => {
      child.props.onFocus?.(e)
      if (!e.defaultPrevented) scheduleOpen()
    },
    onBlur: (e) => {
      child.props.onBlur?.(e)
      if (!e.defaultPrevented) close()
    }
  })

  const tip =
    open && text ? (
      <div
        ref={tipRef}
        className="popup-tooltip"
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          zIndex: 2147483646,
          width: 280,
          boxSizing: 'border-box'
        }}
        role="tooltip"
      >
        {text}
      </div>
    ) : null

  return (
    <>
      {merged}
      {tip ? createPortal(tip, document.body) : null}
    </>
  )
}
