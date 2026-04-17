import React, { forwardRef } from 'react'

export const Toolbar = forwardRef(function Toolbar({ children, actionsRef }, ref) {
  return (
    <div className="mdp-toolbar" ref={ref}>
      <div className="mdp-toolbar__title">Markdown Plus</div>
      <div className="mdp-toolbar__actions" ref={actionsRef}>
        {children}
      </div>
    </div>
  )
})
