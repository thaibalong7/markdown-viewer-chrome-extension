import React, { useCallback, useRef, useState } from 'react'
import {
  canCopyCurrentFileLink,
  copyFileRowLink,
  isBrowserOpenableFileHref,
  isPlainPrimaryClick,
  openFileHrefInNewTab
} from '../../../actions/file-row-actions.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useDismissableLayer } from '../../hooks/useDismissableLayer.js'
import { ActionMenu } from '../common/ActionMenu.jsx'
import { CopyLinkIcon } from '../icons/CopyLinkIcon.jsx'
import { MoreIcon } from '../icons/MoreIcon.jsx'
import { OpenNewTabIcon } from '../icons/OpenNewTabIcon.jsx'

export function FileRow({ file, depth, isActive, onPick, rowStyle }) {
  const linkRef = useRef(null)
  const menuRef = useRef(null)
  const { showToast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const href = String(file?.href || '')
  const canOpenInNewTab = isBrowserOpenableFileHref(href)
  const canCopyLink = canCopyCurrentFileLink(href)

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
  }, [])

  useDismissableLayer({
    open: menuOpen,
    layerRef: menuRef,
    onDismiss: closeMenu
  })

  const onFileClick = (event) => {
    if (!isPlainPrimaryClick(event)) {
      if (!canOpenInNewTab) {
        event.preventDefault()
        showToast?.('This workspace file cannot open in a browser tab', { variant: 'warning' })
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
    showToast?.('This workspace file cannot open in a browser tab', { variant: 'warning' })
  }

  const onOpenNewTab = () => {
    if (openFileHrefInNewTab(href)) {
      setMenuOpen(false)
      return
    }
    showToast?.('This workspace file cannot open in a browser tab', { variant: 'warning' })
  }

  const onCopyLink = () => {
    void (async () => {
      try {
        await copyFileRowLink(href)
        setMenuOpen(false)
        showToast?.('Copied file link', { variant: 'success' })
      } catch {
        showToast?.('Could not copy file link', { variant: 'error' })
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
      <ActionMenu
        ref={menuRef}
        open={menuOpen}
        className="mdp-explorer__row-actions"
        triggerClassName="mdp-explorer__row-action-btn"
        triggerOpenClassName="is-open"
        triggerIcon={<MoreIcon className="mdp-explorer__row-action-icon" />}
        triggerLabel={`More actions for ${file.displayName}`}
        menuClassName="mdp-explorer__row-menu"
        itemClassName="mdp-explorer__row-menu-item"
        onToggle={() => setMenuOpen((open) => !open)}
        items={[
          {
            key: 'open-new-tab',
            label: 'Open in new tab',
            disabled: !canOpenInNewTab,
            icon: <OpenNewTabIcon className="mdp-explorer__row-menu-icon" />,
            onClick: onOpenNewTab
          },
          {
            key: 'copy-link',
            label: 'Copy link',
            disabled: !canCopyLink,
            icon: <CopyLinkIcon className="mdp-explorer__row-menu-icon" />,
            onClick: onCopyLink
          }
        ]}
      />
    </li>
  )
}
