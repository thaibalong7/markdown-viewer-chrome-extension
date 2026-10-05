import React from 'react'

export function DocumentUpdatesIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5" />
      <path d="M14 3v6h6v3" />
      <circle cx="16" cy="17" r="4" />
      <path d="M16 15v2l1.5 1" />
    </svg>
  )
}
