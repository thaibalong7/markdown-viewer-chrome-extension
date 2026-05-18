import React, { forwardRef } from 'react'
import { IconButton } from './IconButton.jsx'

export const ActionMenu = forwardRef(function ActionMenu(
  {
    open,
    className = '',
    triggerRef,
    triggerClassName,
    triggerOpenClassName = '',
    triggerIcon,
    triggerLabel,
    triggerTooltip,
    triggerShowDelayMs,
    triggerDisabled = false,
    menuClassName,
    menuLabel,
    itemClassName,
    items,
    onToggle
  },
  ref
) {
  return (
    <div className={className} ref={ref}>
      <IconButton
        ref={triggerRef}
        tooltip={triggerTooltip}
        showDelayMs={triggerShowDelayMs}
        className={`${triggerClassName}${open && triggerOpenClassName ? ` ${triggerOpenClassName}` : ''}`}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        disabled={triggerDisabled}
        onClick={onToggle}
      >
        {triggerIcon}
      </IconButton>
      <div className={menuClassName} hidden={!open} role="menu" aria-label={menuLabel}>
        {items.map((item) => (
          <button
            key={item.key || item.label}
            type="button"
            className={itemClassName}
            role="menuitem"
            disabled={item.disabled}
            onClick={item.onClick}
          >
            {item.icon}
            {item.icon ? <span>{item.label}</span> : item.label}
          </button>
        ))}
      </div>
    </div>
  )
})
