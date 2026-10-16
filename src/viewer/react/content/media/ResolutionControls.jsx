import { t, translateMessage, formatNumber } from '../../../../i18n/index.js'
import { useLocale } from '../../../../i18n/react.js'
import React from 'react'

export function ResolutionControls({
  id, buttonClass, state, refs,
  onEnter, onLeave, onFocus, onBlur, onToggle, onStep
}) {
  useLocale()
  const { hidden, expanded, busy, unavailable, current, maximum, error } = state
  const atLimit = !unavailable && current >= maximum
  const level = unavailable ? '—' : `×${formatNumber(current)}`
  const status = unavailable ? 'viewer.media.resolution.unavailableShort' : error ? 'common.status.error' : busy ? 'common.status.rendering' : atLimit ? 'viewer.media.resolution.maximumShort' : ''
  const caption = unavailable ? 'common.status.unavailable' : error ? 'common.status.failed' : atLimit ? 'viewer.media.resolution.maximum' : 'viewer.media.resolution.caption'
  const descriptions = `${id}-status ${id}-advice`
  const label = t('viewer.media.resolution.ariaLabel', {
    0: unavailable ? t('common.status.unavailable') : level,
    1: busy ? t('viewer.media.rendering2') : '',
    2: atLimit ? t('viewer.media.maximumForThisImage') : '',
    3: error ? `, ${translateMessage(error)}` : ''
  })

  return (
    <div
      ref={refs.group}
      className="mdp-lightbox-resolution"
      hidden={hidden}
      role="group"
      aria-label={t('viewer.media.resolution.label')}
      aria-busy={busy}
      data-expanded={expanded}
      data-state={error || unavailable ? 'error' : busy ? 'busy' : atLimit ? 'limit' : 'ready'}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className="mdp-lightbox-resolution__row">
        <div
          className="mdp-lightbox-resolution__actions"
          id={`${id}-actions`}
          inert={!expanded}
          aria-hidden={!expanded}
        >
          <div className="mdp-lightbox-resolution__steps">
            {[-1, 1].map(direction => (
              <button
                ref={direction < 0 ? refs.down : refs.up}
                key={direction}
                type="button"
                className={`${buttonClass} mdp-lightbox-resolution__button`}
                data-direction={direction < 0 ? 'decrease' : 'increase'}
                aria-label={t(direction < 0 ? 'viewer.media.decreaseRenderResolution' : 'viewer.media.increaseRenderResolution')}
                aria-describedby={descriptions}
                tabIndex={expanded ? 0 : -1}
                disabled={busy || unavailable || (direction < 0 ? current <= 1 : current >= maximum)}
                onClick={event => onStep(direction, event.currentTarget)}
              >
                {`${direction < 0 ? '−' : '+'} ${formatNumber(0.25)}`}
              </button>
            ))}
          </div>
        </div>
        <button
          ref={refs.trigger}
          type="button"
          className={`${buttonClass} mdp-lightbox-resolution__trigger`}
          aria-controls={`${id}-actions`}
          aria-expanded={expanded}
          aria-describedby={descriptions}
          aria-label={t(label)}
          onClick={onToggle}
        >
          <span className="mdp-lightbox-resolution__title">{t(caption)}</span>
          <span className="mdp-lightbox-resolution__level">{level}</span>
          <span
            className="mdp-lightbox-resolution__status"
            id={`${id}-status`}
            role="status"
            aria-live="polite"
            hidden={!status}
          >
            {t(status)}
          </span>
        </button>
      </div>
      <span className="mdp-lightbox-resolution__advice" id={`${id}-advice`} hidden>{t('viewer.media.higherResolutionUsesMoreMemoryLimit16384')}</span>
    </div>
  )
}
