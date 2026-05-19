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
      <path d="M20 11a8 8 0 0 0-14.2-5" />
      <path d="M20 4v7h-7" />
      <path d="M4 13a8 8 0 0 0 14.2 5" />
      <path d="M4 20v-7h7" />
    </svg>
  )
}
