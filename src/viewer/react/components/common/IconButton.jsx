import React, { forwardRef } from 'react'
import { Tooltip } from '../Tooltip.jsx'

export function classNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

export const IconButton = forwardRef(function IconButton(
  {
    tooltip,
    showDelayMs,
    pointerPlacement,
    type = 'button',
    className = '',
    activeClassName = '',
    copiedClassName = '',
    pressed,
    copied = false,
    disabled = false,
    children,
    ...buttonProps
  },
  ref
) {
  const button = (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      className={classNames(className, pressed ? activeClassName : '', copied ? copiedClassName : '')}
      aria-pressed={pressed === undefined ? undefined : pressed ? 'true' : 'false'}
      disabled={disabled}
    >
      {children}
    </button>
  )

  if (!tooltip) return button
  return (
    <Tooltip content={tooltip} showDelayMs={showDelayMs} pointerPlacement={pointerPlacement}>
      {button}
    </Tooltip>
  )
})
