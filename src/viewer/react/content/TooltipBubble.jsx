import React from 'react'

export function TooltipBubble({ text, tooltipRef, style }) {
  return <div ref={tooltipRef} className="mdp-tooltip" role="tooltip" style={style}>{text}</div>
}
