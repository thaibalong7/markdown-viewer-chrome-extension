import React from 'react'

const ICON_PATHS = {
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  reader: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z" />
    </>
  ),
  editor: (
    <>
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z" />
      <path d="m14.5 7.5 3 3" />
    </>
  ),
  plugins: (
    <>
      <path d="M8.5 3.5v4" />
      <path d="M15.5 3.5v4" />
      <path d="M6 7.5h12v2a6 6 0 0 1-6 6 6 6 0 0 1-6-6Z" />
      <path d="M12 15.5v5" />
    </>
  )
}

export function SettingsTabIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {ICON_PATHS[name] || ICON_PATHS.history}
    </svg>
  )
}
