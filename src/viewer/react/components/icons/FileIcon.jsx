import React from 'react'

export function FileIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 3.5h6.8L18.5 8v12.5H7z" />
      <path d="M13.5 3.8V8h4.4M9.5 12h6M9.5 15.5h5" />
    </svg>
  )
}
