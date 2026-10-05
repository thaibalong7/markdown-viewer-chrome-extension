import React from 'react'

export function CheckUpdatesIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <path d="M19 7v4h-4" />
      <path d="M5 17v-4h4" />
      <path d="M17.4 10a6 6 0 0 0-10.5-2M6.6 14a6 6 0 0 0 10.5 2" />
    </svg>
  )
}
