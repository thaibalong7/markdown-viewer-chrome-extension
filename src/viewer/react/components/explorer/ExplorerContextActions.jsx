import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDismissableLayer } from '../../hooks/useDismissableLayer.js'
import { ActionMenu } from '../common/ActionMenu.jsx'
import { IconButton } from '../common/IconButton.jsx'
import { MoreIcon } from '../icons/MoreIcon.jsx'
import { partitionDetailsCommands } from './explorer-details-layout.js'

export function ExplorerContextActions({ commands, layout, disclosureRef, children }) {
  const { direct, overflow } = partitionDetailsCommands(commands, layout)
  const signature = commands.map(command => `${command.key}:${overflow.includes(command)}`).join('|')
  const [menuState, setMenuState] = useState({ signature: '', open: false })
  const menuRef = useRef(null)
  const menuTriggerRef = useRef(null)
  const open = menuState.open && menuState.signature === signature
  const closeMenu = useCallback(() => setMenuState(current => ({ ...current, open: false })), [])

  useDismissableLayer({ open, layerRef: menuRef, onDismiss: closeMenu, restoreFocusRef: menuTriggerRef })

  useEffect(() => {
    if (!menuState.open || open) return
    disclosureRef.current?.focus()
    closeMenu()
  }, [closeMenu, disclosureRef, menuState.open, open])

  return (
    <div className="mdp-explorer__context-commands">
      {direct.map(command => (
        <IconButton
          key={command.key}
          className="mdp-explorer__context-command"
          tooltip={command.tooltip || command.label}
          aria-label={command.label}
          disabled={command.disabled}
          copied={command.copied}
          copiedClassName="is-copied"
          onClick={command.onClick}
        >
          {command.icon}
        </IconButton>
      ))}
      {overflow.length ? (
        <ActionMenu
          ref={menuRef}
          triggerRef={menuTriggerRef}
          open={open}
          className="mdp-explorer__context-overflow"
          triggerClassName="mdp-explorer__context-command"
          triggerOpenClassName="is-open"
          triggerIcon={<MoreIcon className="mdp-explorer__context-command-icon" />}
          triggerLabel="More file actions"
          triggerTooltip="More file actions"
          menuClassName="mdp-explorer__row-menu mdp-explorer__context-menu"
          menuLabel="File details actions"
          itemClassName="mdp-explorer__row-menu-item"
          onToggle={() => setMenuState({ signature, open: !open })}
          items={overflow.map(command => ({ ...command, onClick: () => { closeMenu(); command.onClick?.() } }))}
        />
      ) : null}
      {children}
    </div>
  )
}
