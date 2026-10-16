import { t, translateMessage } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import React from 'react'
import { IconSwap } from '../../components/common/IconSwap.jsx'

/** Inspector DOM belongs to React; the controller owns interaction policy. */
export function ColorPopover({
  id, source, color, rows, opacity, status,
  panelRef, onEnter, onLeave, onFocus, onCopy
}) {
  useLocale()
  return (
    <section
      ref={panelRef}
      className="mdp-color-popover"
      id={id}
      role="dialog"
      aria-label={t('viewer.colors.colorFormatsForValue', { 0: source })}
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
              <span ref={row.opacityRef} className="mdp-color-popover__opacity" aria-label={t('viewer.colors.opacityValue', { 0: opacity })}>
                {opacity}
              </span>
            )}
          </span>
          <button
            ref={row.buttonRef}
            type="button"
            className={`mdp-color-popover__copy${row.copied ? ' is-copied' : ''}${row.error ? ' is-error' : ''}`}
            aria-label={t('viewer.colors.copyValue', { 0: row.format })}
            aria-busy={row.busy || undefined}
            disabled={row.busy}
            onClick={event => onCopy(row, event.currentTarget)}
          >
            <IconSwap name="copy" size={16} swapped={row.copied} />
          </button>
        </div>
      ))}
      <p
        className={`mdp-color-popover__status${status.error ? ' is-error' : ''}`}
        role="status"
        aria-live="polite"
      >
        {translateMessage(status.text)}
      </p>
    </section>
  )
}
