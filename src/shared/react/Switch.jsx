import React from 'react'

export function Switch({ label, className = '', id, ...inputProps }) {
  return (
    <label className={`mdp-ui-switch ${className}`.trim()} htmlFor={id}>
      <span className="mdp-ui-visually-hidden">{label}</span>
      <input {...inputProps} id={id} type="checkbox" />
      <span className="mdp-ui-switch__track" aria-hidden="true" />
    </label>
  )
}
