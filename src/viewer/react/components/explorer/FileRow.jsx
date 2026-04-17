import React, { useEffect, useRef } from 'react'

export function FileRow({ file, depth, isActive, onPick }) {
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!isActive) return
    try {
      buttonRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    } catch {
      /* ignore scroll errors */
    }
  }, [isActive])

  return (
    <li className="mdp-explorer__node mdp-explorer__tree-file" role="treeitem" aria-level={String(Math.max(1, depth))}>
      <button
        ref={buttonRef}
        type="button"
        className={`mdp-explorer__node-btn${isActive ? ' is-active' : ''}`}
        data-file-href={file.href}
        aria-current={isActive ? 'true' : 'false'}
        title={file.href}
        style={{ paddingLeft: `${6 + Math.max(0, depth - 1) * 12}px` }}
        onClick={() => onPick?.(file.href)}
      >
        <span className="mdp-explorer__node-depth" aria-hidden="true" />
        <span className="mdp-explorer__node-icon" aria-hidden="true">
          📄
        </span>
        <span className="mdp-explorer__node-label">{file.displayName}</span>
      </button>
    </li>
  )
}
