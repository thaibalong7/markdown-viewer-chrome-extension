import React from 'react'

export function ResolutionControls({
  id, buttonClass, state, refs,
  onEnter, onLeave, onFocus, onBlur, onToggle, onStep
}) {
  const { hidden, expanded, busy, unavailable, current, maximum, error } = state
  const atLimit = !unavailable && current >= maximum
  const level = unavailable ? '—' : `×${current}`
  const status = unavailable ? 'N/A' : error ? 'Error' : busy ? 'Rendering' : atLimit ? 'Max' : ''
  const caption = unavailable ? 'Unavailable' : error ? 'Failed' : atLimit ? 'Maximum' : 'Resolution'
  const descriptions = `${id}-status ${id}-advice`
  const label = `Adjust render resolution: ${unavailable ? 'Unavailable' : level}${busy ? ', rendering' : ''}${atLimit ? ', maximum for this image' : ''}${error ? `, ${error}` : ''}`

  return (
    <div
      ref={refs.group}
      className="mdp-lightbox-resolution"
      hidden={hidden}
      role="group"
      aria-label="Render resolution"
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
                aria-label={`${direction < 0 ? 'Decrease' : 'Increase'} render resolution`}
                aria-describedby={descriptions}
                tabIndex={expanded ? 0 : -1}
                disabled={busy || unavailable || (direction < 0 ? current <= 1 : current >= maximum)}
                onClick={event => onStep(direction, event.currentTarget)}
              >
                {direction < 0 ? '− 0.25' : '+ 0.25'}
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
          aria-label={label}
          onClick={onToggle}
        >
          <span className="mdp-lightbox-resolution__title">{caption}</span>
          <span className="mdp-lightbox-resolution__level">{level}</span>
          <span
            className="mdp-lightbox-resolution__status"
            id={`${id}-status`}
            role="status"
            aria-live="polite"
            hidden={!status}
          >
            {status}
          </span>
        </button>
      </div>
      <span className="mdp-lightbox-resolution__advice" id={`${id}-advice`} hidden>
        Higher resolution uses more memory. Limit: 16,384 px per side / 32 Mi pixels.
      </span>
    </div>
  )
}
