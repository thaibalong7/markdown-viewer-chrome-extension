import React from 'react'
import { Button } from '../../shared/react/Button.jsx'
import { Notice } from '../../shared/react/Notice.jsx'

const CONTENT = {
  checking: {
    variant: 'info',
    title: 'Checking file access',
    message: 'Confirming whether Markdown Plus can open local files.'
  },
  allowed: {
    variant: 'success',
    title: 'File access is ready'
  },
  blocked: {
    variant: 'warning',
    title: 'Allow access to local files'
  },
  unavailable: {
    variant: 'danger',
    title: 'File access status unavailable'
  }
}

export function FileAccessCallout({ state, errorMessage = '', onOpenDetails }) {
  const content = CONTENT[state] || CONTENT.unavailable
  const showAction = state === 'blocked' || state === 'unavailable'

  return (
    <Notice
      variant={content.variant}
      title={content.title}
      className={`popup-file-access popup-file-access--${state}`}
      role={state === 'blocked' || state === 'unavailable' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {showAction ? (
        <ol>
          <li>Open chrome://extensions.</li>
          <li>Select Markdown Plus → Details.</li>
          <li>Enable “Allow access to file URLs”.</li>
        </ol>
      ) : content.message ? (
        <p>{content.message}</p>
      ) : null}
      {errorMessage ? <p className="popup-file-access__error">{errorMessage}</p> : null}
      {showAction ? (
        <Button variant="secondary" onClick={onOpenDetails}>
          Open extension details
        </Button>
      ) : null}
    </Notice>
  )
}
