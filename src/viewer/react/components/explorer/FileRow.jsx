import React, { useEffect, useRef, useState } from 'react'
import { copyTextToClipboard } from '../../../../shared/clipboard.js'
import { MDP_WS_FILE } from '../../../../shared/constants/explorer.js'
import { buildCurrentFileLink } from '../../../actions/file-link-actions.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import { CopyLinkIcon } from '../icons/CopyLinkIcon.jsx'

function isPlainPrimaryClick(event) {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  )
}

function isBrowserOpenableFileHref(href) {
  return Boolean(href && !String(href).startsWith(MDP_WS_FILE))
}

function openFileHrefInNewTab(href) {
  if (!isBrowserOpenableFileHref(href)) return false
  window.open(href, '_blank', 'noopener')
  return true
}

function MoreIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  )
}

function OpenNewTabIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </svg>
  )
}

export function FileRow({ file, depth, isActive, onPick, autoScrollActive = true, rowStyle }) {
  const linkRef = useRef(null)
  const menuRef = useRef(null)
  const { showToast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const href = String(file?.href || '')
  const canOpenInNewTab = isBrowserOpenableFileHref(href)

  useEffect(() => {
    if (!autoScrollActive) return
    if (!isActive) return
    try {
      linkRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    } catch {
      /* ignore scroll errors */
    }
  }, [autoScrollActive, isActive])

  useEffect(() => {
    if (!menuOpen) return undefined
    const eventTarget = menuRef.current?.getRootNode?.() || document
    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return
      setMenuOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    eventTarget.addEventListener('pointerdown', onPointerDown, true)
    eventTarget.addEventListener('keydown', onKeyDown, true)
    return () => {
      eventTarget.removeEventListener('pointerdown', onPointerDown, true)
      eventTarget.removeEventListener('keydown', onKeyDown, true)
    }
  }, [menuOpen])

  const onFileClick = (event) => {
    if (!isPlainPrimaryClick(event)) {
      if (!canOpenInNewTab) {
        event.preventDefault()
        showToast?.('This workspace file cannot open in a browser tab')
      }
      return
    }
    event.preventDefault()
    onPick?.(href)
  }

  const onFileAuxClick = (event) => {
    if (event.button !== 1) return
    if (canOpenInNewTab) return
    event.preventDefault()
    showToast?.('This workspace file cannot open in a browser tab')
  }

  const onOpenNewTab = () => {
    if (openFileHrefInNewTab(href)) {
      setMenuOpen(false)
      return
    }
    showToast?.('This workspace file cannot open in a browser tab')
  }

  const onCopyLink = () => {
    void (async () => {
      try {
        await copyTextToClipboard(buildCurrentFileLink(href))
        setMenuOpen(false)
        showToast?.('Copied file link')
      } catch {
        showToast?.('Could not copy file link')
      }
    })()
  }

  return (
    <li
      className={`mdp-explorer__node mdp-explorer__tree-file${menuOpen ? ' is-menu-open' : ''}`}
      role="treeitem"
      aria-level={String(Math.max(1, depth))}
      style={rowStyle}
    >
      <a
        ref={linkRef}
        href={href}
        className={`mdp-explorer__node-btn${isActive ? ' is-active' : ''}`}
        data-file-href={href}
        aria-current={isActive ? 'true' : 'false'}
        title={href}
        style={{ paddingLeft: `${6 + Math.max(0, depth - 1) * 12}px` }}
        onClick={onFileClick}
        onAuxClick={onFileAuxClick}
      >
        <span className="mdp-explorer__node-depth" aria-hidden="true" />
        <span className="mdp-explorer__node-icon" aria-hidden="true">
          📄
        </span>
        <span className="mdp-explorer__node-label">{file.displayName}</span>
      </a>
      <div className="mdp-explorer__row-actions" ref={menuRef}>
        <button
          type="button"
          className={`mdp-explorer__row-action-btn${menuOpen ? ' is-open' : ''}`}
          aria-label={`More actions for ${file.displayName}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen ? 'true' : 'false'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreIcon className="mdp-explorer__row-action-icon" />
        </button>
        <div className="mdp-explorer__row-menu" role="menu" hidden={!menuOpen}>
          <button
            type="button"
            className="mdp-explorer__row-menu-item"
            role="menuitem"
            disabled={!canOpenInNewTab}
            onClick={onOpenNewTab}
          >
            <OpenNewTabIcon className="mdp-explorer__row-menu-icon" />
            <span>Open in new tab</span>
          </button>
          <button
            type="button"
            className="mdp-explorer__row-menu-item"
            role="menuitem"
            onClick={onCopyLink}
          >
            <CopyLinkIcon className="mdp-explorer__row-menu-icon" />
            <span>Copy link</span>
          </button>
        </div>
      </div>
    </li>
  )
}
