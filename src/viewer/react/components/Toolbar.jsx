import React from 'react'

export function Toolbar({ children }) {
  return (
    <div className="mdp-toolbar">
      <div className="mdp-toolbar__title">Markdown Plus</div>
      <div className="mdp-toolbar__actions">{children}</div>
    </div>
  )
}
