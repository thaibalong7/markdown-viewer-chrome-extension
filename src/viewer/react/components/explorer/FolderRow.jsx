import { t } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import React, { useCallback, useRef, useState } from 'react'
import { Tooltip } from '../Tooltip.jsx'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'
import { FolderIcon } from '../icons/FolderIcon.jsx'
import { ActionMenu } from '../common/ActionMenu.jsx'
import { useDismissableLayer } from '../../hooks/useDismissableLayer.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import { copyFolderRowText, getFolderCopyPath } from '../../../actions/folder-row-actions.js'
import { getTreeRowIndent, TreeGuides } from './TreeGuides.jsx'
import { useExplorerRowMenuLayout } from '../../hooks/explorer/useExplorerRowMenuLayout.js'

export function FolderRow({ treeRow, onToggleFolder, rowStyle, motionState = '' }) {
  useLocale()
  const { node, expanded, depth, fileCount, path, containsActive } = treeRow
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const rowRef = useRef(null)
  const { showToast } = useToast()
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const menuStyle = useExplorerRowMenuLayout({ open: menuOpen, layerRef: menuRef, onClose: closeMenu })
  useDismissableLayer({
    open: menuOpen,
    layerRef: menuRef,
    onDismiss: closeMenu,
    restoreFocusRef: triggerRef
  })
  const copyIdentity = async (text, label) => {
    try {
      await copyFolderRowText(text)
      setMenuOpen(false)
      showToast?.(label === 'name' ? 'viewer.explorer.folder.copiedFolderName' : 'viewer.explorer.folder.copiedFolderPath', { variant: 'success' })
    } catch {
      showToast?.(label === 'name' ? 'errors.viewer.explorer.folder.copyFolderName' : 'errors.viewer.explorer.folder.copyFolderPath', { variant: 'error' })
    }
  }

  return (
    <li
      className={`mdp-explorer__tree-folder${containsActive ? ' is-active-path' : ''}${menuOpen ? ' is-menu-open' : ''}${motionState ? ` is-tree-${motionState}` : ''}`}
      role="treeitem"
      aria-expanded={expanded}
      aria-level={String(depth)}
      aria-hidden={motionState === 'exiting' ? 'true' : undefined}
      inert={motionState === 'exiting' ? true : undefined}
      data-folder-href={node.href}
      style={{ ...rowStyle, '--mdp-tree-row-indent': `${getTreeRowIndent(depth)}px` }}
    >
      <TreeGuides row={treeRow} />
      <Tooltip content={t('viewer.explorer.folder.toggleLabel', { 0: node.name })}>
        <button
          ref={rowRef}
          type="button"
          className={`mdp-explorer__tree-folder-row${expanded ? ' is-expanded' : ''}`}
          aria-expanded={expanded ? 'true' : 'false'}
          onClick={() => onToggleFolder?.(node.href)}
        >
          <span className="mdp-explorer__tree-chevron" aria-hidden="true"><AppIcon name="chevron-right" size={12} /></span>
          <span className="mdp-explorer__tree-folder-icon" aria-hidden="true">
            <FolderIcon expanded={expanded} />
          </span>
          <span className="mdp-explorer__tree-folder-label">{node.name}</span>
        </button>
      </Tooltip>
      <span className="mdp-explorer__folder-count" aria-hidden="true"
        title={t('viewer.explorer.folder.indexedFileCount', { 0: fileCount })}>{fileCount}</span>
      <ActionMenu
        ref={menuRef}
        triggerRef={triggerRef}
        open={menuOpen}
        className="mdp-explorer__row-actions"
        triggerClassName="mdp-explorer__row-action-btn"
        triggerOpenClassName="is-open"
        triggerIcon={<AppIcon name="more" className="mdp-explorer__row-action-icon" />}
        triggerLabel={t('viewer.explorer.actions.moreLabel', { 0: node.name })}
        triggerTooltip={t('viewer.explorer.actions.moreLabel', { 0: node.name })}
        menuLabel={t('viewer.explorer.actions.menuLabel', { 0: node.name })}
        menuStyle={menuStyle}
        menuClassName="mdp-explorer__row-menu"
        itemClassName="mdp-explorer__row-menu-item"
        onToggle={() => setMenuOpen((open) => !open)}
        items={[
          {
            key: 'toggle', label: expanded ? 'viewer.explorer.folder.collapseFolder' : 'viewer.explorer.folder.expandFolder',
            icon: <AppIcon name={expanded ? 'collapse' : 'chevron-right'} size={16} />,
            restoreFocus: false,
            onClick: () => {
              setMenuOpen(false)
              onToggleFolder?.(node.href)
              rowRef.current?.focus()
            }
          },
          {
            key: 'copy-name', label: 'viewer.explorer.actions.copyFolderName', icon: <AppIcon name="copy" size={16} />,
            onClick: () => void copyIdentity(node.name, 'name')
          },
          {
            key: 'copy-path', label: 'viewer.explorer.actions.copyFolderPath', icon: <AppIcon name="link" size={16} />,
            onClick: () => void copyIdentity(getFolderCopyPath(node, path), 'path')
          }
        ]}
      />
    </li>
  )
}
