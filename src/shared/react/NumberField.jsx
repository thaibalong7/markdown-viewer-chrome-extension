import React from 'react'

export function NumberField({
  id,
  label,
  helper,
  error = '',
  rangeLabel,
  className = '',
  ...inputProps
}) {
  const helperId = `${id}-helper`
  const errorId = `${id}-error`
  const describedBy = [helper ? helperId : '', error ? errorId : ''].filter(Boolean).join(' ')

  return (
    <div className={`mdp-ui-number-field ${className}`.trim()}>
      <div className="mdp-ui-field">
        <label className="mdp-ui-field__label" htmlFor={id}>{label}</label>
        {helper ? <p className="mdp-ui-field__helper" id={helperId}>{helper}</p> : null}
      </div>
      <div className="mdp-ui-number-field__control">
        <input
          {...inputProps}
          id={id}
          type="number"
          inputMode="numeric"
          className="mdp-ui-input mdp-ui-input--technical"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
        />
        {rangeLabel ? <span className="mdp-ui-field__meta">{rangeLabel}</span> : null}
        {error ? (
          <span className="mdp-ui-field__error" id={errorId}>{error}</span>
        ) : null}
      </div>
    </div>
  )
}
