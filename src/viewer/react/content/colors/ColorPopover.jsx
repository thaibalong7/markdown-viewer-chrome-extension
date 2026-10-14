import React from 'react'
import { AppIcon } from '../../../../shared/react/AppIcon.jsx'

/** Inspector DOM belongs to React; the controller owns interaction policy. */
export function ColorPopover({
  id, source, color, rows, opacity, status,
  panelRef, onEnter, onLeave, onFocus, onCopy
}) {
  return (
    <section
      ref={panelRef}
      className="mdp-color-popover"
      id={id}
      role="dialog"
      aria-label={`Color formats for ${source}`}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onFocus}
    >
      {rows.map(row => (
        <div className="mdp-color-popover__row" key={row.format}>
          <span className="mdp-color-popover__label">{row.format}</span>
          <span className="mdp-color-popover__value-group">
            {row.format === 'HEX' && (
              <span
                className="mdp-color-popover__sample"
                aria-hidden="true"
                style={{ '--mdp-preview-color': color }}
              />
            )}
            <span ref={row.valueRef} className="mdp-color-popover__value" aria-label={row.value}>
              {row.error ? row.value : row.display}
            </span>
            {row.format === 'HEX' && opacity && (
              <span ref={row.opacityRef} className="mdp-color-popover__opacity" aria-label={`Opacity ${opacity}`}>
                {opacity}
              </span>
            )}
          </span>
          <button
            ref={row.buttonRef}
            type="button"
            className={`mdp-color-popover__copy${row.copied ? ' is-copied' : ''}${row.error ? ' is-error' : ''}`}
            aria-label={`Copy ${row.format}`}
            aria-busy={row.busy || undefined}
            disabled={row.busy}
            onClick={event => onCopy(row, event.currentTarget)}
          >
            <AppIcon name="copy" size={16} className="mdp-color-popover__copy-icon" />
            <AppIcon name="check" size={16} className="mdp-color-popover__check-icon" />
          </button>
        </div>
      ))}
      <p
        className={`mdp-color-popover__status${status.error ? ' is-error' : ''}`}
        role="status"
        aria-live="polite"
      >
        {status.text}
      </p>
    </section>
  )
}
