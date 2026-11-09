import React from 'react'
import { createPortal } from 'react-dom'
import { getContentOverlayTarget } from '../../content/mount-content-ui.jsx'
import { useCurrentMatchMarker } from '../../hooks/useCurrentMatchMarker.js'

export function CurrentMatchMarker({ range, article, scrollRoot }) {
  const { boxes, gutter } = useCurrentMatchMarker(range, article, scrollRoot)
  if (!article || !boxes.length) return null
  // Share the body stacking context so Files overlays cover the marker too.
  return createPortal(<div className="mdp-current-match" aria-hidden="true">
    {gutter ? <span className="mdp-current-match__gutter" style={gutter} /> : null}
    {boxes.map((box, index) => <span key={index} className="mdp-current-match__box" style={{
      left: box.left, top: box.top, width: box.width, height: box.height
    }} />)}
  </div>, article.closest('.mdp-body') || getContentOverlayTarget(article))
}
