import { t } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import React, { useCallback, useRef, useState } from 'react'
import {
  canCopyCurrentFileLink,
  copyFileRowName,
  copyFileRowLink,
  isBrowserOpenableFileHref,
  isPlainPrimaryClick,
  openFileHrefInNewTab
} from '../../../actions/file-row-actions.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import { useDismissableLayer } from '../../hooks/useDismissableLayer.js'
import { ActionMenu } from '../common/ActionMenu.jsx'
import { CopyIcon } from '../icons/CopyIcon.jsx'
import { CopyLinkIcon } from '../icons/CopyLinkIcon.jsx'
import { MoreIcon } from '../icons/MoreIcon.jsx'
import { OpenNewTabIcon } from '../icons/OpenNewTabIcon.jsx'
import { FileIcon } from '../icons/FileIcon.jsx'
import { getFileTypeById } from '../../../../shared/file-types.js'
import { getTreeRowIndent, TreeGuides } from './TreeGuides.jsx'
import { useExplorerRowMenuLayout } from '../../hooks/explorer/useExplorerRowMenuLayout.js'

export function FileRow({ file, depth, isActive, onPick, rowStyle, treeRow, motionState = '' }) {
  useLocale()
  const menuRef = useRef(null)
  const { showToast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const href = String(file?.href || '')
  const canOpenInNewTab = isBrowserOpenableFileHref(href)
  const canCopyLink = canCopyCurrentFileLink(href)
  const fileType = getFileTypeById(file?.fileTypeId)
  const fileTypeLabel = fileType?.labelKey || 'viewer.explorer.context.document'

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
  }, [])
  const menuStyle = useExplorerRowMenuLayout({ open: menuOpen, layerRef: menuRef, onClose: closeMenu })

  useDismissableLayer({
    open: menuOpen,
    layerRef: menuRef,
    onDismiss: closeMenu
  })

  const onFileClick = (event) => {
    if (!isPlainPrimaryClick(event)) {
      if (!canOpenInNewTab) {
        event.preventDefault()
        showToast?.('viewer.explorer.file.workspaceFileCannotOpenInABrowserTab', { variant: 'warning' })
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
    showToast?.('viewer.explorer.file.workspaceFileCannotOpenInABrowserTab', { variant: 'warning' })
  }

  const onOpenNewTab = () => {
    if (openFileHrefInNewTab(href)) {
      setMenuOpen(false)
      return
    }
    showToast?.('viewer.explorer.file.workspaceFileCannotOpenInABrowserTab', { variant: 'warning' })
  }

  const onCopyLink = () => {
    void (async () => {
      try {
        await copyFileRowLink(href)
        setMenuOpen(false)
        showToast?.('viewer.actions.export.copiedFileLink', { variant: 'success' })
      } catch {
        showToast?.('errors.viewer.actions.copyFileLink', { variant: 'error' })
      }
    })()
  }

  const onCopyName = () => {
    void (async () => {
      try {
        await copyFileRowName(file.displayName)
        setMenuOpen(false)
        showToast?.('viewer.explorer.file.copiedFileName', { variant: 'success' })
      } catch {
        showToast?.('errors.viewer.explorer.file.copyFileName', { variant: 'error' })
      }
    })()
  }

  return (
    <li
      className={`mdp-explorer__node${isActive ? ' is-active' : ''}${menuOpen ? ' is-menu-open' : ''}${motionState ? ` is-tree-${motionState}` : ''}`}
      role="treeitem"
      aria-level={String(Math.max(1, depth))}
      aria-hidden={motionState === 'exiting' ? 'true' : undefined}
      inert={motionState === 'exiting' ? true : undefined}
      style={{ ...rowStyle, '--mdp-tree-row-indent': `${getTreeRowIndent(depth)}px` }}
    >
      <TreeGuides row={treeRow} />
      <a
        href={href}
        className={`mdp-explorer__node-btn${isActive ? ' is-active' : ''}`}
        data-file-href={href}
        aria-current={isActive ? 'true' : 'false'}
        title={`${file.displayName} — ${t(fileTypeLabel)}`}
        data-file-type={file?.fileTypeId || undefined}
        onClick={onFileClick}
        onAuxClick={onFileAuxClick}
      >
        <span className="mdp-explorer__node-depth" aria-hidden="true" />
        <span className="mdp-explorer__node-icon" aria-hidden="true">
          <FileIcon kind={fileType?.explorerIcon} />
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
        triggerLabel={t('viewer.explorer.actions.moreLabel', { 0: file.displayName })}
        triggerTooltip={t('viewer.explorer.actions.moreLabel', { 0: file.displayName })}
        menuLabel={t('viewer.explorer.actions.menuLabel', { 0: file.displayName })}
        menuStyle={menuStyle}
        menuClassName="mdp-explorer__row-menu"
        itemClassName="mdp-explorer__row-menu-item"
        onToggle={() => setMenuOpen((open) => !open)}
        items={[
          {
            key: 'open-new-tab',
            label: 'viewer.explorer.file.openInNewTab',
            disabled: !canOpenInNewTab,
            icon: <OpenNewTabIcon className="mdp-explorer__row-menu-icon" />,
            onClick: onOpenNewTab
          },
          {
            key: 'copy-link',
            label: 'common.actions.copyLink',
            disabled: !canCopyLink,
            icon: <CopyLinkIcon className="mdp-explorer__row-menu-icon" />,
            onClick: onCopyLink
          },
          {
            key: 'copy-name',
            label: 'viewer.explorer.actions.copyFileName',
            icon: <CopyIcon className="mdp-explorer__row-menu-icon" />,
            onClick: onCopyName
          }
        ]}
      />
    </li>
  )
}
