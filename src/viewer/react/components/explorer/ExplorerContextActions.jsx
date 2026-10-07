import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDismissableLayer } from '../../hooks/useDismissableLayer.js'
import { ActionMenu } from '../common/ActionMenu.jsx'
import { IconButton } from '../common/IconButton.jsx'
import { MoreIcon } from '../icons/MoreIcon.jsx'
import { partitionDetailsCommands } from './explorer-details-layout.js'

export function ExplorerContextActions({ commands, layout, fallbackFocusRef }) {
  const { direct, overflow } = partitionDetailsCommands(commands, layout)
  const signature = commands.map(command => `${command.key}:${command.label}:${overflow.includes(command)}`).join('|')
  const [menuState, setMenuState] = useState({ signature: '', open: false })
  const menuRef = useRef(null)
  const menuTriggerRef = useRef(null)
  const firstCommandRef = useRef(null)
  const open = menuState.open && menuState.signature === signature
  const closeMenu = useCallback(() => setMenuState(current => ({ ...current, open: false })), [])

  useDismissableLayer({ open, layerRef: menuRef, onDismiss: closeMenu, restoreFocusRef: menuTriggerRef })

  useEffect(() => {
    if (!menuState.open || open) return
    const firstCommand = firstCommandRef.current
    const target = menuTriggerRef.current || (firstCommand?.disabled ? null : firstCommand) || fallbackFocusRef?.current
    const active = target?.getRootNode()?.activeElement
    // Restore removed menu focus without stealing focus from a resize/control elsewhere.
    if (!active || active === target?.ownerDocument.body || menuRef.current?.contains(active)) target?.focus()
    closeMenu()
  }, [closeMenu, fallbackFocusRef, menuState.open, open])

  return (
    <div className="mdp-explorer__context-commands">
      {direct.map((command, index) => (
        <IconButton
          key={command.key}
          ref={index === 0 ? firstCommandRef : undefined}
          className="mdp-explorer__context-command"
          tooltip={command.tooltip || command.label}
          aria-label={command.ariaLabel || command.label}
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
          items={overflow.map(command => ({
            ...command,
            icon: <span className="mdp-explorer__menu-icon">{command.icon}</span>,
            onClick: () => { closeMenu(); command.onClick?.() }
          }))}
        />
      ) : null}
    </div>
  )
}
