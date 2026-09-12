import React from 'react'

export function FileIcon({ className = '', kind = 'document' }) {
  if (kind === 'diagram') {
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
        <rect x="3.5" y="4" width="6" height="5" rx="1" />
        <rect x="14.5" y="15" width="6" height="5" rx="1" />
        <path d="M9.5 6.5h3a4 4 0 0 1 4 4V15M13.5 12l3 3 3-3" />
      </svg>
    )
  }

  if (kind === 'image') {
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
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
        <circle cx="9" cy="9.5" r="1.5" />
        <path d="m5.5 17 4.2-4.2 3.1 3.1 2.1-2.1 3.6 3.2" />
      </svg>
    )
  }

  if (kind === 'vector-image') {
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
        <path d="M5 4.5h14v15H5z" />
        <circle cx="8" cy="8" r="1.25" />
        <circle cx="16" cy="8" r="1.25" />
        <circle cx="12" cy="16" r="1.25" />
        <path d="M9.2 8h5.6M8.7 9.1l2.6 5.8M15.3 9.1l-2.6 5.8" />
      </svg>
    )
  }

  if (kind === 'text') {
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
        <path d="M13.5 3.8V8h4.4M9.5 12h6M9.5 15.5h5M9.5 18h4" />
      </svg>
    )
  }

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
