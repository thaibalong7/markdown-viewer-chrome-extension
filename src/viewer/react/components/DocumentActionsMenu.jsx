import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { AppIcon } from '../../../shared/react/AppIcon.jsx'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../shared/constants/tooltip.js'
import { useDismissableLayer } from '../hooks/useDismissableLayer.js'
import { ActionMenu } from './common/ActionMenu.jsx'
import { DOCUMENT_ACTION_GROUPS } from './document-actions-model.js'

export function DocumentActionsMenu({ action, items, open, onOpenChange }) {
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const [position, setPosition] = useState({})
  const close = useCallback(() => onOpenChange(null), [onOpenChange])
  useDismissableLayer({ open, layerRef: wrapRef, onDismiss: close, restoreFocusRef: triggerRef, preventEscapeDefault: true })
  useLayoutEffect(() => {
    if (!open) return undefined
    const wrap = wrapRef.current
    const view = wrap?.ownerDocument.defaultView
    const measure = () => {
      const menu = wrap?.querySelector('[role="menu"]')
      if (!menu || !view) return
      const anchor = triggerRef.current.getBoundingClientRect()
      const parent = wrap.getBoundingClientRect()
      const width = Math.min(240, view.innerWidth - 16)
      const maxHeight = Math.max(44, view.innerHeight - 16)
      const height = Math.min(menu.scrollHeight + 2, maxHeight)
      const left = Math.max(8, Math.min(anchor.right - width, view.innerWidth - width - 8))
      const top = anchor.bottom + 6 + height <= view.innerHeight - 8
        ? anchor.bottom + 6 : Math.max(8, anchor.top - height - 6)
      setPosition({ left: left - parent.left, top: top - parent.top, width, maxHeight })
    }
    measure()
    view?.addEventListener('resize', measure)
    view?.addEventListener('scroll', measure, true)
    return () => {
      view?.removeEventListener('resize', measure)
      view?.removeEventListener('scroll', measure, true)
    }
  }, [open, items])
  return <ActionMenu
    ref={wrapRef} triggerRef={triggerRef} open={open}
    className="mdp-document-actions-menu"
    triggerClassName="mdp-fab-btn" triggerOpenClassName="mdp-fab-btn--active"
    triggerIcon={<AppIcon name={action.icon} className="mdp-fab-btn__icon" />}
    triggerLabel={action.label} triggerTooltip={action.tooltip || action.label}
    triggerShowDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS} triggerDisabled={action.disabled}
    menuClassName="mdp-document-actions-menu__panel" menuStyle={position}
    menuLabel={action.label} itemClassName="mdp-document-actions-menu__item"
    onToggle={() => onOpenChange(open ? null : action.id)}
    items={items.map(item => ({
      ...item, key: item.id, ariaLabel: item.label,
      groupLabel: item.group ? DOCUMENT_ACTION_GROUPS[item.group].label : undefined,
      icon: <AppIcon name={item.icon} className="mdp-document-actions-menu__icon" />,
      restoreFocus: false,
      onClick: event => {
        close()
        // Dialogs must capture a visible return target, not an overflowed button.
        triggerRef.current?.focus?.({ preventScroll: true })
        if (item.buttonRef) item.buttonRef.current = triggerRef.current
        item.onClick?.(event)
      }
    }))}
  />
}
