import React from 'react'

export function RefreshIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M4 6h14M4 10h9M4 14h6" />
      <path d="M13.5 15a4 4 0 1 1 .5 4.5" />
      <path d="M13.5 12v3h3" />
    </svg>
  )
}
