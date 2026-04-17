import React from 'react'

export function PrintIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M7 8V4h10v4" />
      <rect x="5" y="9" width="14" height="8" rx="2" />
      <path d="M8 14h8v6H8z" />
      <circle cx="16.5" cy="12.5" r=".7" fill="currentColor" stroke="none" />
    </svg>
  )
}
