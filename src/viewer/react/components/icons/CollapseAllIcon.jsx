import React from 'react'

export function CollapseAllIcon({ className = '' }) {
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
      <path d="m8 11 4-4 4 4" />
      <path d="m8 17 4-4 4 4" />
    </svg>
  )
}
