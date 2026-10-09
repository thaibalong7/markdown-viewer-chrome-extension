import React, { useLayoutEffect, useRef } from 'react'
import { AppIcon } from '../../../shared/react/AppIcon.jsx'
import { VIEWER_TOOLTIP_DELAY_QUICK_MS } from '../../../shared/constants/tooltip.js'
import { useDocumentActionsLayout } from '../hooks/useDocumentActionsLayout.js'
import { IconButton } from './common/IconButton.jsx'
import { DocumentActionsMenu } from './DocumentActionsMenu.jsx'
import { getOverflowDocumentActions, partitionDocumentActions } from './document-actions-model.js'

export function DocumentActionToolbar({ actions, visible, openMenu, onMenuChange, onLayoutChange }) {
  const toolbarRef = useRef(null)
  const focusedId = useRef(null)
  const metrics = useDocumentActionsLayout(toolbarRef)
  const { direct, overflow } = partitionDocumentActions(actions, metrics)
  const layoutKey = direct.map(action => action.id).join(',') + ':' + metrics.vertical + ':' + metrics.controlSize + ':' + metrics.availableSize
  useLayoutEffect(() => {
    onMenuChange(null)
    onLayoutChange?.(layoutKey)
    const root = toolbarRef.current
    if (!root || !focusedId.current) return
    const active = root.ownerDocument.activeElement
    if (active !== root.ownerDocument.body && root.contains(active)) {
      // The menu will hide after this effect. Keep focus on its visible trigger.
      if (active.closest?.('[role="menu"]')) {
        active.closest('[data-mdp-action]')?.querySelector('button:not(:disabled)')?.focus?.({ preventScroll: true })
      }
      return
    }
    if (active !== root.ownerDocument.body) return
    const target = root.querySelector(`[data-mdp-action="${focusedId.current}"] button:not(:disabled)`)
      || root.querySelector('[data-mdp-action="more"] button')
      || root.querySelector('button:not(:disabled)')
    target?.focus?.({ preventScroll: true })
  }, [layoutKey, onLayoutChange, onMenuChange])

  return <div ref={toolbarRef} className="mdp-floating-actions"
    role="group" aria-label="Document actions" hidden={!visible} aria-hidden={!visible}
    onFocusCapture={event => { focusedId.current = event.target.closest('[data-mdp-action]')?.dataset.mdpAction }}
    onBlurCapture={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusedId.current = null }}
    onClickCapture={event => {
      if (event.target.closest('[data-mdp-action-custom]')) onMenuChange(null)
    }}>
    {direct.map((action, index) => <React.Fragment key={action.id}>
      {index > 0 && action.group !== direct[index - 1].group && <span className="mdp-document-actions__divider" aria-hidden="true" />}
      <div className="mdp-document-actions__slot" data-mdp-action={action.id} data-mdp-action-custom={action.control ? true : undefined}>
        {action.control || (action.items ? <DocumentActionsMenu action={action} items={action.items}
          open={openMenu === action.id} onOpenChange={onMenuChange} /> :
          <IconButton ref={action.buttonRef} className={`mdp-fab-btn ${action.className || ''}`}
            activeClassName="mdp-fab-btn--active" tooltip={action.tooltip || action.label}
            showDelayMs={VIEWER_TOOLTIP_DELAY_QUICK_MS} aria-label={action.label}
            aria-busy={action.busy || undefined} pressed={action.pressed} disabled={action.disabled}
            onClick={event => { onMenuChange(null); action.onClick?.(event) }}>
            <AppIcon name={action.icon} className={`mdp-fab-btn__icon ${action.iconClassName || ''}`} />
          </IconButton>)}
      </div>
    </React.Fragment>)}
    {overflow.length > 0 && <div className="mdp-document-actions__slot" data-mdp-action="more">
      <DocumentActionsMenu action={{ id: 'more', icon: 'more', label: 'More document actions' }}
        items={getOverflowDocumentActions(overflow)} open={openMenu === 'more'} onOpenChange={onMenuChange} />
    </div>}
  </div>
}
