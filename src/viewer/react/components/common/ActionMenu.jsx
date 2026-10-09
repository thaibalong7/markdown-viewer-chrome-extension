import React, { forwardRef, useCallback, useEffect, useId, useRef } from 'react'
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
    menuStyle,
    menuLabel,
    itemClassName,
    items,
    onToggle
  },
  ref
) {
  const localTriggerRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const setTriggerRef = useCallback((node) => {
    localTriggerRef.current = node
    assignRef(triggerRef, node)
  }, [triggerRef])

  useEffect(() => {
    if (!open) return undefined
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector?.('[role^="menuitem"]:not(:disabled)')?.focus?.()
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  const onMenuKeyDown = (event) => {
    if (event.key === 'Escape') {
      queueMicrotask(() => localTriggerRef.current?.focus?.())
      return
    }
    if (event.key === 'Tab') {
      localTriggerRef.current?.focus?.({ preventScroll: true })
      onToggle?.(event)
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

    const enabledItems = Array.from(
      menuRef.current?.querySelectorAll?.('[role^="menuitem"]:not(:disabled)') || []
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
        aria-controls={menuId}
        disabled={triggerDisabled}
        onClick={onToggle}
      >
        {triggerIcon}
      </IconButton>
      <div
        ref={menuRef}
        className={menuClassName}
        id={menuId}
        style={menuStyle}
        hidden={!open}
        role="menu"
        aria-label={menuLabel}
        onKeyDown={onMenuKeyDown}
      >
        {items.map((item, index) => {
          const key = item.key || item.label
          const button = (
            <button
              type="button"
              className={itemClassName}
              role={item.pressed === undefined ? 'menuitem' : 'menuitemcheckbox'}
              aria-label={item.ariaLabel}
              disabled={item.disabled}
              aria-busy={item.busy || undefined}
              aria-checked={item.pressed === undefined ? undefined : Boolean(item.pressed)}
              onClick={(event) => {
                item.onClick?.(event)
                if (item.restoreFocus !== false) queueMicrotask(() => localTriggerRef.current?.focus?.())
              }}
            >
              {item.icon}
              {item.icon ? <span>{item.label}</span> : item.label}
            </button>
          )
          const content = item.tooltip ? (
            <Tooltip content={item.tooltip}>
              <span className="mdp-action-menu__tooltip-anchor">{button}</span>
            </Tooltip>
          ) : button
          const startsGroup = item.groupLabel && item.groupLabel !== items[index - 1]?.groupLabel
          return <React.Fragment key={key}>
            {startsGroup && <>
              {index > 0 && <div className="mdp-action-menu__separator" role="separator" />}
              <div className="mdp-action-menu__group-label" aria-hidden="true">{item.groupLabel}</div>
            </>}
            {content}
          </React.Fragment>
        })}
      </div>
    </div>
  )
})
