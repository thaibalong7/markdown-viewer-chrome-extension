import React, { forwardRef, useCallback, useEffect, useRef } from 'react'
import { Tooltip } from '../Tooltip.jsx'
import { IconButton } from './IconButton.jsx'

function assignRef(ref, value) {
  if (typeof ref === 'function') ref(value)
  else if (ref && typeof ref === 'object') ref.current = value
}

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
  const localTriggerRef = useRef(null)
  const menuRef = useRef(null)
  const setTriggerRef = useCallback((node) => {
    localTriggerRef.current = node
    assignRef(triggerRef, node)
  }, [triggerRef])

  useEffect(() => {
    if (!open) return undefined
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector?.('[role="menuitem"]:not(:disabled)')?.focus?.()
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  const onMenuKeyDown = (event) => {
    if (event.key === 'Escape') {
      queueMicrotask(() => localTriggerRef.current?.focus?.())
      return
    }
    if (event.key === 'Tab') {
      onToggle?.(event)
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

    const enabledItems = Array.from(
      menuRef.current?.querySelectorAll?.('[role="menuitem"]:not(:disabled)') || []
    )
    if (!enabledItems.length) return
    event.preventDefault()
    const currentIndex = enabledItems.indexOf(event.target)
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? enabledItems.length - 1
        : event.key === 'ArrowUp'
          ? (currentIndex <= 0 ? enabledItems.length - 1 : currentIndex - 1)
          : (currentIndex + 1) % enabledItems.length
    enabledItems[nextIndex]?.focus?.()
  }

  return (
    <div className={className} ref={ref}>
      <IconButton
        ref={setTriggerRef}
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
      <div
        ref={menuRef}
        className={menuClassName}
        hidden={!open}
        role="menu"
        aria-label={menuLabel}
        onKeyDown={onMenuKeyDown}
      >
        {items.map((item) => {
          const key = item.key || item.label
          const button = (
            <button
              type="button"
              className={itemClassName}
              role="menuitem"
              aria-label={item.ariaLabel}
              disabled={item.disabled}
              onClick={(event) => {
                item.onClick?.(event)
                queueMicrotask(() => localTriggerRef.current?.focus?.())
              }}
            >
              {item.icon}
              {item.icon ? <span>{item.label}</span> : item.label}
            </button>
          )
          if (!item.tooltip) return React.cloneElement(button, { key })
          return (
            <Tooltip key={key} content={item.tooltip}>
              <span className="mdp-action-menu__tooltip-anchor">{button}</span>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
})
