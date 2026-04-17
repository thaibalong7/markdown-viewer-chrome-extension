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
import { VIEWER_TOOLTIP_DELAY_DEFAULT_MS } from '../../../shared/constants/tooltip.js'

const TIP_MARGIN_PX = 8
const VIEWPORT_PAD_PX = 6

/** @param {import('react').Ref | undefined | null} ref @param {HTMLElement | null} node */
function assignRef(ref, node) {
  if (typeof ref === 'function') ref(node)
  else if (ref && typeof ref === 'object') ref.current = node
}

/**
 * @param {object} args
 * @param {DOMRect} args.anchorRect
 * @param {number} args.tipWidth
 * @param {number} args.tipHeight
 * @param {boolean} args.pointerPlacement
 * @param {{ x: number, y: number } | null} args.pointer
 * @param {number} args.viewportWidth
 * @param {number} args.viewportHeight
 * @returns {{ top: number, left: number }}
 */
function measureTooltipPosition({
  anchorRect,
  tipWidth,
  tipHeight,
  pointerPlacement,
  pointer,
  viewportWidth,
  viewportHeight
}) {
  const m = TIP_MARGIN_PX
  const pad = VIEWPORT_PAD_PX
  const vw = viewportWidth
  const vh = viewportHeight
  const rect = anchorRect

  let top
  let left

  if (pointerPlacement && pointer) {
    top = pointer.y + m
    if (top + tipHeight > vh - pad && pointer.y - m - tipHeight >= pad) {
      top = pointer.y - m - tipHeight
    }
    left = pointer.x + m
    if (left + tipWidth > vw - pad) {
      left = pointer.x - m - tipWidth
    }
  } else if (pointerPlacement) {
    top = rect.top + rect.height / 2 - tipHeight / 2
    left = rect.left + rect.width / 2 - tipWidth / 2
  } else {
    top = rect.bottom + m
    left = rect.left + rect.width / 2 - tipWidth / 2
  }

  if (left < pad) left = pad
  if (left + tipWidth > vw - pad) {
    left = Math.max(pad, vw - pad - tipWidth)
  }

  if (
    !pointerPlacement &&
    top + tipHeight > vh - pad &&
    rect.top - m - tipHeight >= pad
  ) {
    top = rect.top - m - tipHeight
  }

  if (top < pad) top = pad
  if (top + tipHeight > vh - pad) {
    top = Math.max(pad, vh - pad - tipHeight)
  }

  return { top: Math.round(top), left: Math.round(left) }
}

/**
 * Hover/focus tooltip for viewer chrome (Shadow DOM or document).
 *
 * @param {object} props
 * @param {string} props.content
 * @param {number} [props.showDelayMs]
 * @param {boolean} [props.pointerPlacement] Hover: place tip below/above the cursor and to the right/left; keyboard: center on anchor. False: anchor-only placement (below/above, centered).
 * @param {React.ReactElement} props.children
 */
export function Tooltip({
  content,
  showDelayMs = VIEWER_TOOLTIP_DELAY_DEFAULT_MS,
  pointerPlacement = false,
  children
}) {
  const text = typeof content === 'string' ? content.trim() : ''
  if (!text) return children

  const child = React.Children.only(children)
  const anchorRef = useRef(null)
  const tipRef = useRef(null)
  const pointerPosRef = useRef(null)
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

    const pointer = pointerPlacement ? pointerPosRef.current : null
    setCoords(
      measureTooltipPosition({
        anchorRect: anchor.getBoundingClientRect(),
        tipWidth: tip.offsetWidth,
        tipHeight: tip.offsetHeight,
        pointerPlacement,
        pointer,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      })
    )
  }, [pointerPlacement])

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
      assignRef(child.ref, node)
    },
    onPointerEnter: (event) => {
      child.props.onPointerEnter?.(event)
      if (pointerPlacement) {
        pointerPosRef.current = { x: event.clientX, y: event.clientY }
      }
      if (!event.defaultPrevented) scheduleOpen()
    },
    onPointerMove: (event) => {
      child.props.onPointerMove?.(event)
      if (pointerPlacement) {
        pointerPosRef.current = { x: event.clientX, y: event.clientY }
        if (open) positionTip()
      }
    },
    onPointerLeave: (event) => {
      child.props.onPointerLeave?.(event)
      if (pointerPlacement) pointerPosRef.current = null
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
