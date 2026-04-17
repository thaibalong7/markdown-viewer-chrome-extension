import React from 'react'

export function ExportIcon({ className = '' }) {
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
      <path d="M12 3v11" />
      <path d="M8 10l4 4 4-4" />
      <path d="M5 18h14" />
    </svg>
  )
}
